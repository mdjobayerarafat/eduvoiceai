
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { 
    databases, 
    ID as AppwriteID, 
    AppwriteException,
    clientInitialized,
    initializationError,
    APPWRITE_DATABASE_ID, 
    USERS_COLLECTION_ID, 
    TRANSACTIONS_COLLECTION_ID 
} from '@/lib/appwrite.node'; // Ensure this uses the Node SDK
import type { Models } from 'appwrite'; // For Appwrite document types

const STRIPE_API_VERSION = '2024-04-10'; 
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
  typescript: true,
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

const SUBSCRIPTION_TOKEN_GRANT = 60000;
const SUBSCRIPTION_DURATION_DAYS = 30;

interface UserProfileDocument extends Models.Document {
  token_balance?: number;
  subscription_status?: string;
  subscription_end_date?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

// Disable Next.js body parsing for this route to access the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: NextRequest) {
  const reader = req.body!.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return body;
}


export async function POST(request: NextRequest) {
  console.log("Stripe Webhook: Received a request.");

  if (!clientInitialized) {
    console.error("Stripe Webhook Error: Appwrite client not initialized.", initializationError);
    return NextResponse.json({ message: `Server configuration error: ${initializationError}` }, { status: 500 });
  }
  if (!APPWRITE_DATABASE_ID || !USERS_COLLECTION_ID || !TRANSACTIONS_COLLECTION_ID) {
    console.error("Stripe Webhook Error: Appwrite Database/Collection IDs missing.");
    return NextResponse.json({ message: 'Server configuration error: Database or Collection IDs missing.' }, { status: 500 });
  }
  if (!WEBHOOK_SECRET) {
    console.error("Stripe Webhook Error: Stripe webhook secret (STRIPE_WEBHOOK_SECRET) is not configured.");
    return NextResponse.json({ message: 'Stripe webhook secret not configured on server.' }, { status: 500 });
  }
   if (!process.env.STRIPE_SECRET_KEY) {
    console.error("Stripe Webhook Error: Stripe secret key (STRIPE_SECRET_KEY) is not configured.");
    return NextResponse.json({ message: 'Stripe secret key not configured on server.' }, { status: 500 });
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    console.warn("Stripe Webhook: Missing Stripe signature in request headers.");
    return NextResponse.json({ message: 'Missing Stripe signature.' }, { status: 400 });
  }
  console.log("Stripe Webhook: Signature found in headers.");

  let event: Stripe.Event;
  let rawBody;
  try {
    rawBody = await getRawBody(request);
    console.log("Stripe Webhook: Raw body read successfully.");
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
    console.log(`Stripe Webhook: Event constructed successfully. Event ID: ${event.id}, Type: ${event.type}`);
  } catch (err: any) {
    console.error(`Stripe Webhook: Signature verification failed or error constructing event: ${err.message}`);
    return NextResponse.json({ message: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    console.log("Stripe Webhook: Processing checkout.session.completed event.");
    const session = event.data.object as Stripe.Checkout.Session;

    const clientReferenceId = session.client_reference_id; // This should be your Appwrite userId
    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

    console.log("Stripe Webhook: Session details:", {
        sessionId: session.id,
        clientReferenceId,
        stripeCustomerId,
        subscriptionId,
        paymentStatus: session.payment_status,
        status: session.status
    });

    if (!clientReferenceId) {
      console.error('Stripe Webhook Error: client_reference_id (userId) missing in checkout session.');
      return NextResponse.json({ message: 'Client reference ID missing.' }, { status: 400 });
    }

    const userId = clientReferenceId;
    console.log(`Stripe Webhook: Extracted userId (client_reference_id): ${userId}`);

    try {
      let userProfileDoc: UserProfileDocument;
      try {
        console.log(`Stripe Webhook: Attempting to fetch Appwrite user document for userId: ${userId}`);
        userProfileDoc = await databases.getDocument(APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, userId) as UserProfileDocument;
        console.log(`Stripe Webhook: Successfully fetched Appwrite user document for userId: ${userId}. Current token balance: ${userProfileDoc.token_balance}, status: ${userProfileDoc.subscription_status}`);
      } catch (fetchError: any) {
        if (fetchError instanceof AppwriteException && fetchError.code === 404) {
          console.error(`Stripe Webhook Error: User profile with ID ${userId} not found in Appwrite.`);
          return NextResponse.json({ message: `User profile ${userId} not found.` }, { status: 200 }); 
        }
        console.error(`Stripe Webhook Error: Error fetching user profile from Appwrite for userId ${userId}:`, fetchError);
        throw fetchError; 
      }

      const currentTokenBalance = userProfileDoc.token_balance ?? 0;
      const newTokenBalance = currentTokenBalance + SUBSCRIPTION_TOKEN_GRANT;
      
      const newSubscriptionEndDate = new Date();
      newSubscriptionEndDate.setDate(newSubscriptionEndDate.getDate() + SUBSCRIPTION_DURATION_DAYS);

      const updatedUserData: Partial<UserProfileDocument> = {
        token_balance: newTokenBalance,
        subscription_status: 'active',
        subscription_end_date: newSubscriptionEndDate.toISOString(),
      };
      if (stripeCustomerId) updatedUserData.stripe_customer_id = stripeCustomerId;
      if (subscriptionId) updatedUserData.stripe_subscription_id = subscriptionId;
      
      try {
        console.log(`Stripe Webhook: Preparing to update Appwrite user ${userId} with:`, updatedUserData);
        await databases.updateDocument(APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, userId, updatedUserData);
        console.log(`Stripe Webhook: Successfully updated Appwrite user document for ${userId}.`);
      } catch (updateError: any) {
        console.error(`Stripe Webhook Error: Failed to update Appwrite user document for userId "${userId}":`, updateError);
        if (updateError instanceof AppwriteException) {
          console.error(`Stripe Webhook Error: AppwriteException updating user: Code ${updateError.code}, Type ${updateError.type}, Message: ${updateError.message}`);
        }
        // Important: Return 500 to Stripe so it knows to retry this webhook if the update fails.
        return NextResponse.json({ message: 'Failed to update user profile in Appwrite.', details: updateError.message }, { status: 500 });
      }


      const transactionDescription = `EduVoice AI Pro Plan activated via Stripe webhook. ${SUBSCRIPTION_TOKEN_GRANT} tokens added. Stripe Session: ${session.id}`;
      try {
        console.log(`Stripe Webhook: Preparing to log transaction for user ${userId}: ${transactionDescription}`);
        await databases.createDocument(
          APPWRITE_DATABASE_ID,
          TRANSACTIONS_COLLECTION_ID,
          AppwriteID.unique(),
          {
            user_id: userId,
            type: 'subscription_purchase_stripe_webhook',
            token_amount_changed: SUBSCRIPTION_TOKEN_GRANT,
            new_balance: newTokenBalance,
            transaction_description: transactionDescription,
            timestamp: new Date().toISOString(),
            reference_id: session.id, 
          }
        );
        console.log(`Stripe Webhook: Successfully logged transaction for user ${userId}.`);
      } catch (logError: any) {
         console.warn(`Stripe Webhook Warning: Failed to log transaction for user ${userId} after subscription update. Error:`, logError);
         // Don't fail the webhook response if only logging fails.
      }
      console.log(`Stripe Webhook: Successfully processed Stripe checkout.session.completed for user ${userId}. Tokens added, subscription active.`);
    } catch (error: any) {
      console.error(`Stripe Webhook Error: General error processing event and updating Appwrite DB for user ${userId}:`, error);
      return NextResponse.json({ message: 'Internal server error while updating user data.', details: error.message }, { status: 500 });
    }
  } else {
    console.log(`Stripe Webhook: Received unhandled event type: ${event.type}. Acknowledging.`);
  }

  return NextResponse.json({ received: true });
}
