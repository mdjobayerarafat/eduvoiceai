
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

export async function GET(request: NextRequest) {
  console.log("API Route: /api/stripe/confirm-success GET request received.");
  console.log("API Route /confirm-success: Full requested URL:", request.url);

  if (!clientInitialized) {
    console.error("API Route /confirm-success Error: Appwrite client not initialized.", initializationError);
    return NextResponse.redirect(new URL('/payment/cancel?error=server_config&reason=appwrite_init_failed', request.url));
  }

  if (!APPWRITE_DATABASE_ID || !USERS_COLLECTION_ID || !TRANSACTIONS_COLLECTION_ID) {
    console.error("API Route /confirm-success Error: Appwrite Database/Collection IDs missing.");
    return NextResponse.redirect(new URL('/payment/cancel?error=server_db_config&reason=appwrite_ids_missing', request.url));
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('client_reference_id');
  
  console.log('API Route /confirm-success: Attempting to read search parameters.');
  console.log('API Route /confirm-success: All received search parameters:');
  let paramsFound = false;
  for (const [key, value] of searchParams.entries()) {
    console.log(`  ${key}: ${value}`);
    paramsFound = true;
  }
  if (!paramsFound) {
    console.log('  (No search parameters found in the URL)');
  }


  if (!userId) {
    console.error('API Route /confirm-success Error: client_reference_id (userId) was NOT found in redirect from Stripe.');
    return NextResponse.redirect(new URL('/payment/cancel?error=missing_user_id', request.url));
  }
  
  console.log(`API Route /confirm-success: DIAGNOSTIC - Extracted client_reference_id (userId) Value: "${userId}"`);
  console.log(`API Route /confirm-success: DIAGNOSTIC - userId length: ${userId.length}`);
  console.log(`API Route /confirm-success: DIAGNOSTIC - userId starts with underscore?: ${userId.startsWith('_')}`);
  // Basic regex for typical Appwrite ID: Alphanumeric, up to 36 chars.
  // Document IDs can also have '.', '_', '-' but user IDs are typically simpler.
  // The error message is the true validator.
  console.log(`API Route /confirm-success: DIAGNOSTIC - userId basic Appwrite ID pattern test (a-zA-Z0-9): ${/^[a-zA-Z0-9]{1,36}$/.test(userId)}`);

  try {
    let userProfileDoc: UserProfileDocument;
    try {
      console.log(`API Route /confirm-success: Attempting to fetch Appwrite user document for userId: "${userId}" using DB ID: ${APPWRITE_DATABASE_ID} and Collection ID: ${USERS_COLLECTION_ID}`);
      
      // Pre-emptive check based on common Appwrite ID rules before calling Appwrite
      if (userId.length > 36) {
          const errMsg = `userId "${userId}" is longer than 36 characters.`;
          console.error(`API Route /confirm-success Error: ${errMsg}`);
          return NextResponse.redirect(new URL(`/payment/cancel?error=invalid_user_id_length&details=${encodeURIComponent(errMsg)}`, request.url));
      }
      if (userId.startsWith('_')) {
          const errMsg = `userId "${userId}" starts with an underscore, which is invalid for Appwrite document IDs.`;
          console.error(`API Route /confirm-success Error: ${errMsg}`);
           return NextResponse.redirect(new URL(`/payment/cancel?error=invalid_user_id_format_underscore&details=${encodeURIComponent(errMsg)}`, request.url));
      }
      // Check for characters not allowed: Appwrite error mentioned a-z, A-Z, 0-9, and underscore.
      // More general document IDs can have '.', '-' but User IDs (often used as doc IDs) might be stricter.
      // Let's be a bit more permissive here and rely on Appwrite's error, but log a warning.
      if (!/^[a-zA-Z0-9_.-]{1,36}$/.test(userId)) {
          console.warn(`API Route /confirm-success: Warning - userId "${userId}" contains characters that might be problematic or doesn't match common Appwrite ID patterns (alphanumeric, underscore, period, hyphen, 1-36 chars).`);
      }


      userProfileDoc = await databases.getDocument(APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, userId) as UserProfileDocument;
      console.log(`API Route /confirm-success: Successfully fetched Appwrite user document for userId: ${userId}`);
    } catch (fetchError: any) {
      if (fetchError instanceof AppwriteException) {
        console.error(`API Route /confirm-success Error: AppwriteException fetching user profile for userId "${userId}": Code ${fetchError.code}, Type ${fetchError.type}, Message: ${fetchError.message}`);
        if (fetchError.code === 404) {
          return NextResponse.redirect(new URL(`/payment/cancel?error=user_not_found&userId=${encodeURIComponent(userId)}`, request.url));
        }
         // If it's an invalid document ID error, catch it here specifically
        if (fetchError.message.toLowerCase().includes("invalid `documentid` param") || 
            fetchError.message.toLowerCase().includes("uid must contain at most 36 chars") ||
            fetchError.code === 400 && (fetchError.type === 'general_argument_invalid' || fetchError.type?.includes('document_id'))) {
             return NextResponse.redirect(new URL(`/payment/cancel?error=invalid_appwrite_document_id&details=${encodeURIComponent(fetchError.message)}`, request.url));
        }
      } else {
        console.error(`API Route /confirm-success Error: Non-AppwriteException fetching user profile for userId ${userId}:`, fetchError);
      }
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

    const transactionDescription = `EduVoice AI Pro Plan activated via Stripe success_url redirect. ${SUBSCRIPTION_TOKEN_GRANT} tokens added.`;
    console.log(`API Route /confirm-success: Preparing to log transaction for user ${userId}: ${transactionDescription}`);
    await databases.createDocument(
      APPWRITE_DATABASE_ID,
      TRANSACTIONS_COLLECTION_ID,
      AppwriteID.unique(),
      {
        user_id: userId,
        type: 'subscription_purchase_stripe_redirect',
        token_amount_changed: SUBSCRIPTION_TOKEN_GRANT,
        new_balance: newTokenBalance,
        transaction_description: transactionDescription,
        timestamp: new Date().toISOString(),
      }
    );
    console.log(`API Route /confirm-success: Successfully logged transaction for user ${userId}.`);
    console.log(`API Route /confirm-success: Successfully processed Stripe redirect for user ${userId}. Tokens added, subscription active. Redirecting to /payment/success.`);

    return NextResponse.redirect(new URL('/payment/success', request.url));

  } catch (error: any) {
    console.error(`API Route /confirm-success Error: General error processing event for user (extracted as "${userId || 'undefined'}"):`, error);
    return NextResponse.redirect(new URL(`/payment/cancel?error=processing_failed&details=${encodeURIComponent(error.message)}`, request.url));
  }
}

