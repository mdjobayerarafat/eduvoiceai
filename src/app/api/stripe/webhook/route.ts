
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
  if (!clientInitialized) {
    return NextResponse.json({ message: `Server configuration error: ${initializationError}` }, { status: 500 });
  }
  if (!APPWRITE_DATABASE_ID || !USERS_COLLECTION_ID || !TRANSACTIONS_COLLECTION_ID) {
    return NextResponse.json({ message: 'Server configuration error: Database or Collection IDs missing.' }, { status: 500 });
  }
  if (!WEBHOOK_SECRET) {
    console.error("Stripe webhook secret is not configured. Cannot process webhook.");
    return NextResponse.json({ message: 'Stripe webhook secret not configured on server.' }, { status: 500 });
  }
   if (!process.env.STRIPE_SECRET_KEY) {
    console.error("Stripe secret key is not configured. Cannot process webhook.");
    return NextResponse.json({ message: 'Stripe secret key not configured on server.' }, { status: 500 });
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ message: 'Missing Stripe signature.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(request);
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ message: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const clientReferenceId = session.client_reference_id; // This should be your Appwrite userId
    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;


    if (!clientReferenceId) {
      console.error('Webhook Error: client_reference_id (userId) missing in checkout session.');
      return NextResponse.json({ message: 'Client reference ID missing.' }, { status: 400 });
    }

    const userId = clientReferenceId;

    try {
      let userProfileDoc: UserProfileDocument;
      try {
        userProfileDoc = await databases.getDocument(APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, userId) as UserProfileDocument;
      } catch (fetchError: any) {
        if (fetchError instanceof AppwriteException && fetchError.code === 404) {
          console.error(`Webhook Error: User profile with ID ${userId} not found in Appwrite.`);
          return NextResponse.json({ message: `User profile ${userId} not found.` }, { status: 404 });
        }
        throw fetchError; // Re-throw other fetch errors
      }

      const currentTokenBalance = userProfileDoc.token_balance ?? 0;
      const newTokenBalance = currentTokenBalance + SUBSCRIPTION_TOKEN_GRANT;
      
      const newSubscriptionEndDate = new Date();
      newSubscriptionEndDate.setDate(newSubscriptionEndDate.getDate() + SUBSCRIPTION_DURATION_DAYS);

      const updatedUserData = {
        token_balance: newTokenBalance,
        subscription_status: 'active',
        subscription_end_date: newSubscriptionEndDate.toISOString(),
        // Optionally store Stripe customer/subscription IDs if needed for future management
        stripe_customer_id: stripeCustomerId || userProfileDoc.attributes?.stripe_customer_id,
        stripe_subscription_id: subscriptionId || userProfileDoc.attributes?.stripe_subscription_id,
      };

      await databases.updateDocument(APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, userId, updatedUserData);

      // Log the transaction
      const transactionDescription = `EduVoice AI Pro Plan activated via Stripe. ${SUBSCRIPTION_TOKEN_GRANT} tokens added. Stripe Session: ${session.id}`;
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        TRANSACTIONS_COLLECTION_ID,
        AppwriteID.unique(),
        {
          user_id: userId,
          type: 'subscription_purchase_stripe',
          token_amount_changed: SUBSCRIPTION_TOKEN_GRANT,
          new_balance: newTokenBalance,
          transaction_description: transactionDescription,
          timestamp: new Date().toISOString(),
          reference_id: session.id, // Store Stripe session ID as reference
        }
      );
      console.log(`Successfully processed Stripe checkout.session.completed for user ${userId}. Tokens added, subscription active.`);
    } catch (error: any) {
      console.error('Error processing webhook and updating Appwrite DB:', error);
      // Return 500 to Stripe so it knows to retry (if applicable for this type of error)
      return NextResponse.json({ message: 'Internal server error while updating user data.', details: error.message }, { status: 500 });
    }
  } else {
    console.log(`Received unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
