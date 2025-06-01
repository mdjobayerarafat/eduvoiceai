
import { NextResponse } from 'next/server';
import { 
    databases, 
    ID as AppwriteID, 
    Query, 
    AppwriteException,
    clientInitialized,
    initializationError,
    APPWRITE_DATABASE_ID, 
    USERS_COLLECTION_ID, 
    TRANSACTIONS_COLLECTION_ID 
} from '@/lib/appwrite.node';

export async function POST(request: Request) {
  if (!clientInitialized) {
    return NextResponse.json({ message: `Server configuration error: ${initializationError}` }, { status: 500 });
  }

  if (!APPWRITE_DATABASE_ID || !USERS_COLLECTION_ID || !TRANSACTIONS_COLLECTION_ID) {
    return NextResponse.json({ message: 'Server configuration error: Database or Collection IDs missing.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { userId, amountToDeduct, description } = body; 

    if (!userId || typeof amountToDeduct !== 'number' || amountToDeduct <= 0) {
      return NextResponse.json({ message: 'Invalid request: userId and a positive amountToDeduct are required.' }, { status: 400 });
    }

    let userProfileDoc;
    try {
      userProfileDoc = await databases.getDocument(APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, userId);
    } catch (fetchError: any) {
      if (fetchError instanceof AppwriteException && fetchError.code === 404) {
        return NextResponse.json({ message: `User profile with ID ${userId} not found.` }, { status: 404 });
      }
      console.error('Error fetching user profile from Appwrite DB:', fetchError);
      return NextResponse.json({ message: 'Error fetching user data.', details: fetchError.message }, { status: 500 });
    }

    const currentTokenBalance = (userProfileDoc as any).token_balance ?? 0;
    const subscriptionStatus = (userProfileDoc as any).subscription_status; 

    // Log skip reason if pro user
    let transactionType = 'token_deduction';
    let transactionDescription = description || `Deducted ${amountToDeduct} tokens.`;

    if (subscriptionStatus === 'active') {
      transactionType = 'token_deduction_skipped_subscription';
      transactionDescription = `Token deduction skipped (Pro user): ${description || `${amountToDeduct} tokens for action`}`;
      
      // Log this "skipped" transaction
      try {
        await databases.createDocument(
          APPWRITE_DATABASE_ID,
          TRANSACTIONS_COLLECTION_ID,
          AppwriteID.unique(),
          {
            user_id: userId,
            type: transactionType,
            token_amount_changed: 0, // No change for pro users
            new_balance: currentTokenBalance, // Balance remains the same
            transaction_description: transactionDescription,
            timestamp: new Date().toISOString(),
          }
        );
        console.log(`Transaction logged for pro user ${userId}: ${transactionDescription}`);
      } catch (logError) {
        console.warn('Failed to log skipped token transaction for pro user:', logError);
      }

      return NextResponse.json({ 
        message: 'Pro subscription active, tokens not deducted.', 
        currentTokenBalance, 
        subscriptionStatus 
      });
    }

    if (currentTokenBalance < amountToDeduct) {
      return NextResponse.json({ 
        message: 'Insufficient tokens. Please subscribe or get more tokens to continue.', 
        currentTokenBalance,
        needed: amountToDeduct,
        canSubscribe: true // Hint for frontend to show subscription options
      }, { status: 402 }); // 402 Payment Required
    }

    const newTokenBalance = currentTokenBalance - amountToDeduct;

    try {
      await databases.updateDocument(APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, userId, {
        token_balance: newTokenBalance 
      });

      // Log successful deduction
      try {
        await databases.createDocument(
          APPWRITE_DATABASE_ID,
          TRANSACTIONS_COLLECTION_ID,
          AppwriteID.unique(),
          {
            user_id: userId,
            type: transactionType,
            token_amount_changed: -amountToDeduct, 
            new_balance: newTokenBalance,
            transaction_description: transactionDescription,
            timestamp: new Date().toISOString(),
          }
        );
        console.log(`Transaction logged for user ${userId}: ${amountToDeduct} tokens deducted for ${description}. New balance: ${newTokenBalance}`);
      } catch (logError) {
        console.warn('Failed to log token transaction after deduction:', logError);
        // Don't fail the whole operation if logging fails, but log a warning.
      }

    } catch (updateError: any) {
      console.error('Error updating user token balance in Appwrite DB:', updateError);
      return NextResponse.json({ message: 'Error updating token balance.', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Tokens deducted successfully.', 
      newTokenBalance,
      deductedAmount: amountToDeduct
    });

  } catch (error: any) {
    console.error('Error in deduct-tokens API route:', error);
    return NextResponse.json({ message: 'An internal server error occurred.', details: error.message }, { status: 500 });
  }
}
