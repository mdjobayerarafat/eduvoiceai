
import { NextRequest, NextResponse } from 'next/server';
import { 
    databases, 
    ID as AppwriteID, 
    AppwriteException,
    clientInitialized,
    initializationError,
    APPWRITE_DATABASE_ID, 
    USERS_COLLECTION_ID, 
    TRANSACTIONS_COLLECTION_ID 
} from '@/lib/appwrite.node';
import type { Models } from 'appwrite';

const SUBSCRIPTION_TOKEN_GRANT = 60000;
const SUBSCRIPTION_DURATION_DAYS = 30;

interface UserProfileDocument extends Models.Document {
  token_balance?: number;
  subscription_status?: string;
  subscription_end_date?: string;
}

// This endpoint is intended to be the SUCCESS_URL for Stripe redirects.
// Stripe should be configured to redirect here with client_reference_id (userId) in query params.
export async function GET(request: NextRequest) {
  console.log("API Route: /api/stripe/confirm-success GET request received.");

  if (!clientInitialized) {
    console.error("API Route /confirm-success Error: Appwrite client not initialized.", initializationError);
    // Redirect to a generic error page or dashboard with an error message
    return NextResponse.redirect(new URL('/payment/cancel?error=server_config', request.url));
  }

  if (!APPWRITE_DATABASE_ID || !USERS_COLLECTION_ID || !TRANSACTIONS_COLLECTION_ID) {
    console.error("API Route /confirm-success Error: Appwrite Database/Collection IDs missing.");
    return NextResponse.redirect(new URL('/payment/cancel?error=server_db_config', request.url));
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('client_reference_id');
  // const sessionId = searchParams.get('session_id'); // Stripe might also send session_id

  if (!userId) {
    console.error('API Route /confirm-success Error: client_reference_id (userId) missing in redirect from Stripe.');
    // Redirect to a generic error page or dashboard
    return NextResponse.redirect(new URL('/payment/cancel?error=missing_user_id', request.url));
  }
  
  console.log(`API Route /confirm-success: Processing for userId: ${userId}`);

  try {
    let userProfileDoc: UserProfileDocument;
    try {
      console.log(`API Route /confirm-success: Attempting to fetch Appwrite user document for userId: ${userId}`);
      userProfileDoc = await databases.getDocument(APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, userId) as UserProfileDocument;
      console.log(`API Route /confirm-success: Successfully fetched Appwrite user document for userId: ${userId}`);
    } catch (fetchError: any) {
      if (fetchError instanceof AppwriteException && fetchError.code === 404) {
        console.error(`API Route /confirm-success Error: User profile with ID ${userId} not found in Appwrite.`);
        return NextResponse.redirect(new URL(`/payment/cancel?error=user_not_found&userId=${userId}`, request.url));
      }
      console.error(`API Route /confirm-success Error: Error fetching user profile from Appwrite for userId ${userId}:`, fetchError);
      return NextResponse.redirect(new URL(`/payment/cancel?error=fetch_user_failed&details=${encodeURIComponent(fetchError.message)}`, request.url));
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
    
    console.log(`API Route /confirm-success: Preparing to update Appwrite user ${userId} with:`, updatedUserData);
    await databases.updateDocument(APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, userId, updatedUserData);
    console.log(`API Route /confirm-success: Successfully updated Appwrite user document for ${userId}.`);

    // Log the transaction
    const transactionDescription = `EduVoice AI Pro Plan activated via Stripe redirect. ${SUBSCRIPTION_TOKEN_GRANT} tokens added.`;
    console.log(`API Route /confirm-success: Preparing to log transaction for user ${userId}: ${transactionDescription}`);
    await databases.createDocument(
      APPWRITE_DATABASE_ID,
      TRANSACTIONS_COLLECTION_ID,
      AppwriteID.unique(),
      {
        user_id: userId,
        type: 'subscription_purchase_stripe_redirect', // Differentiate from webhook
        token_amount_changed: SUBSCRIPTION_TOKEN_GRANT,
        new_balance: newTokenBalance,
        transaction_description: transactionDescription,
        timestamp: new Date().toISOString(),
        // reference_id: sessionId || undefined, // If session_id is available
      }
    );
    console.log(`API Route /confirm-success: Successfully logged transaction for user ${userId}.`);
    console.log(`API Route /confirm-success: Successfully processed Stripe redirect for user ${userId}. Tokens added, subscription active.`);

    // Redirect to the visual success page
    return NextResponse.redirect(new URL('/payment/success', request.url));

  } catch (error: any) {
    console.error(`API Route /confirm-success Error: Error processing event and updating Appwrite DB for user ${userId}:`, error);
    // Redirect to a generic error page or the cancel page with an error
    return NextResponse.redirect(new URL(`/payment/cancel?error=processing_failed&details=${encodeURIComponent(error.message)}`, request.url));
  }
}
