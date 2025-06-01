// src/app/api/payment/confirm-success/route.ts
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
  if (!clientInitialized) {
    return NextResponse.json({ message: `Server configuration error: ${initializationError}` }, { status: 500 });
  }

  if (!APPWRITE_DATABASE_ID || !USERS_COLLECTION_ID || !TRANSACTIONS_COLLECTION_ID) {
    return NextResponse.json({ message: 'Server configuration error: Database or Collection IDs missing.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ message: 'Invalid request: userId is required.' }, { status: 400 });
    }

    let userProfileDoc: UserProfileDocument;
    try {
      userProfileDoc = await databases.getDocument(APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, userId) as UserProfileDocument;
    } catch (fetchError: any) {
      if (fetchError instanceof AppwriteException && fetchError.code === 404) {
        return NextResponse.json({ message: `User profile with ID ${userId} not found.` }, { status: 404 });
      }
      console.error('Error fetching user profile from Appwrite DB:', fetchError);
      return NextResponse.json({ message: 'Error fetching user data.', details: fetchError.message }, { status: 500 });
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

    try {
      await databases.updateDocument(APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, userId, updatedUserData);
    } catch (updateError: any) {
      console.error('Error updating user profile in Appwrite DB:', updateError);
      return NextResponse.json({ message: 'Error updating user subscription data.', details: updateError.message }, { status: 500 });
    }

    // Log the subscription transaction
    const transactionDescription = `EduVoice AI Pro Plan activated/renewed. ${SUBSCRIPTION_TOKEN_GRANT} tokens added.`;
    try {
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        TRANSACTIONS_COLLECTION_ID,
        AppwriteID.unique(),
        {
          user_id: userId,
          type: 'subscription_purchase',
          token_amount_changed: SUBSCRIPTION_TOKEN_GRANT,
          new_balance: newTokenBalance,
          transaction_description: transactionDescription,
          timestamp: new Date().toISOString(),
        }
      );
    } catch (logError) {
      console.warn('Failed to log subscription transaction:', logError);
      // Don't fail the whole operation if logging fails, but log a warning.
    }

    return NextResponse.json({ 
      message: 'Subscription confirmed successfully. Tokens added and status updated.', 
      newTokenBalance,
      newSubscriptionStatus: 'active',
      newSubscriptionEndDate: newSubscriptionEndDate.toISOString(),
      tokensAdded: SUBSCRIPTION_TOKEN_GRANT
    });

  } catch (error: any) {
    console.error('Error in confirm-subscription API route:', error);
    return NextResponse.json({ message: 'An internal server error occurred.', details: error.message }, { status: 500 });
  }
}
