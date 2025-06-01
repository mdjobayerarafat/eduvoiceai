
// src/app/api/user/activate-pro-plan/route.ts
import { NextResponse } from 'next/server';
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

export async function POST(request: Request) {
  console.log("API Route: /api/user/activate-pro-plan POST request received.");

  if (!clientInitialized) {
    console.error("API activate-pro-plan Error: Appwrite client not initialized.", initializationError);
    return NextResponse.json({ message: `Server configuration error: ${initializationError}` }, { status: 500 });
  }

  if (!APPWRITE_DATABASE_ID || !USERS_COLLECTION_ID || !TRANSACTIONS_COLLECTION_ID) {
    console.error("API activate-pro-plan Error: Appwrite Database/Collection IDs missing.");
    return NextResponse.json({ message: 'Server configuration error: Database or Collection IDs missing.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      console.warn("API activate-pro-plan: userId missing in request body.");
      return NextResponse.json({ message: 'Invalid request: userId is required.' }, { status: 400 });
    }
    console.log(`API activate-pro-plan: Processing request for userId: ${userId}`);

    let userProfileDoc: UserProfileDocument;
    try {
      console.log(`API activate-pro-plan: Fetching user document for userId: ${userId}`);
      userProfileDoc = await databases.getDocument(APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, userId) as UserProfileDocument;
      console.log(`API activate-pro-plan: User document fetched. Current status: ${userProfileDoc.subscription_status}, Balance: ${userProfileDoc.token_balance}`);
    } catch (fetchError: any) {
      if (fetchError instanceof AppwriteException && fetchError.code === 404) {
        console.error(`API activate-pro-plan Error: User profile with ID ${userId} not found.`);
        return NextResponse.json({ message: `User profile with ID ${userId} not found.` }, { status: 404 });
      }
      console.error(`API activate-pro-plan Error: Error fetching user profile from Appwrite DB for userId ${userId}:`, fetchError);
      return NextResponse.json({ message: 'Error fetching user data.', details: fetchError.message }, { status: 500 });
    }

    // Check if already active
    if (userProfileDoc.subscription_status === 'active') {
      console.log(`API activate-pro-plan: User ${userId} is already subscribed. No update needed.`);
      return NextResponse.json({
        message: 'Your Pro plan is already active. No further action needed.',
        currentTokenBalance: userProfileDoc.token_balance,
        subscriptionStatus: userProfileDoc.subscription_status,
        subscriptionEndDate: userProfileDoc.subscription_end_date,
      });
    }

    const currentTokenBalance = userProfileDoc.token_balance ?? 0;
    const newTokenBalance = currentTokenBalance + SUBSCRIPTION_TOKEN_GRANT;

    const newSubscriptionEndDate = new Date();
    newSubscriptionEndDate.setDate(newSubscriptionEndDate.getDate() + SUBSCRIPTION_DURATION_DAYS);

    const updatedUserData = {
      token_balance: newTokenBalance,
      subscription_status: 'active',
      subscription_end_date: newSubscriptionEndDate.toISOString(),
    };
    console.log(`API activate-pro-plan: Preparing to update user ${userId} with:`, updatedUserData);

    try {
      await databases.updateDocument(APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, userId, updatedUserData);
      console.log(`API activate-pro-plan: User document for ${userId} updated successfully.`);
    } catch (updateError: any) {
      console.error(`API activate-pro-plan Error: Error updating user profile in Appwrite DB for userId ${userId}:`, updateError);
      return NextResponse.json({ message: 'Error updating user subscription data.', details: updateError.message }, { status: 500 });
    }

    const transactionDescription = `EduVoice AI Pro Plan activated manually. ${SUBSCRIPTION_TOKEN_GRANT} tokens added.`;
    try {
      console.log(`API activate-pro-plan: Logging transaction for user ${userId}: ${transactionDescription}`);
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        TRANSACTIONS_COLLECTION_ID,
        AppwriteID.unique(),
        {
          user_id: userId,
          type: 'subscription_manual_activation',
          token_amount_changed: SUBSCRIPTION_TOKEN_GRANT,
          new_balance: newTokenBalance,
          transaction_description: transactionDescription,
          timestamp: new Date().toISOString(),
        }
      );
      console.log(`API activate-pro-plan: Transaction logged successfully for user ${userId}.`);
    } catch (logError) {
      console.warn(`API activate-pro-plan Warning: Failed to log subscription transaction for user ${userId}:`, logError);
    }

    return NextResponse.json({
      message: 'Pro plan activated successfully! Tokens added and status updated.',
      newTokenBalance,
      newSubscriptionStatus: 'active',
      newSubscriptionEndDate: newSubscriptionEndDate.toISOString(),
      tokensAdded: SUBSCRIPTION_TOKEN_GRANT
    });

  } catch (error: any) {
    console.error('API activate-pro-plan Error: General error in route:', error);
    return NextResponse.json({ message: 'An internal server error occurred.', details: error.message }, { status: 500 });
  }
}
