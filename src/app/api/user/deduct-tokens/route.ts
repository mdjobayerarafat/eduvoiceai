
import { NextResponse } from 'next/server';
import { Client, Users, AppwriteException } from 'node-appwrite';
// import { Databases, ID } from 'node-appwrite'; // If logging transactions

const client = new Client();
client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const users = new Users(client);
// const databases = new Databases(client); // Uncomment if logging transactions

// const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID!; // For logging
// const TRANSACTIONS_COLLECTION_ID = process.env.APPWRITE_TRANSACTIONS_COLLECTION_ID!; // For logging

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, amountToDeduct, description } = body; // `description` is optional

    if (!userId || typeof amountToDeduct !== 'number' || amountToDeduct <= 0) {
      return NextResponse.json({ message: 'Invalid request: userId and a positive amountToDeduct are required.' }, { status: 400 });
    }

    // 1. Fetch the user's current preferences
    let currentUser;
    try {
      currentUser = await users.get(userId);
    } catch (fetchError: any) {
      if (fetchError instanceof AppwriteException && fetchError.code === 404) {
        return NextResponse.json({ message: `User with ID ${userId} not found.` }, { status: 404 });
      }
      console.error('Error fetching user from Appwrite:', fetchError);
      return NextResponse.json({ message: 'Error fetching user data.', details: fetchError.message }, { status: 500 });
    }

    const prefs = currentUser.prefs || {};
    const currentTokenBalance = prefs.token_balance ?? 0;
    const subscriptionStatus = prefs.subscription_status; // e.g., 'free_tier', 'active' (for Pro)

    // 2. Check if the user has an active (Pro) subscription
    // Assuming 'active' means Pro plan with unlimited tokens for this context
    if (subscriptionStatus === 'active') {
      // Pro users do not have tokens deducted in this model
      return NextResponse.json({ 
        message: 'Pro subscription active, tokens not deducted.', 
        currentTokenBalance, // Still return current balance for info
        subscriptionStatus 
      });
    }

    // 3. Check if the user has enough tokens (if not Pro)
    if (currentTokenBalance < amountToDeduct) {
      return NextResponse.json({ 
        message: 'Insufficient tokens.', 
        currentTokenBalance,
        needed: amountToDeduct
      }, { status: 402 }); // 402 Payment Required might be suitable
    }

    // 4. Deduct tokens
    const newTokenBalance = currentTokenBalance - amountToDeduct;

    // 5. Update the user's token balance in preferences
    try {
      await users.updatePrefs(userId, { ...prefs, token_balance: newTokenBalance });

    // Optional: Log the transaction
    // if (APPWRITE_DATABASE_ID && TRANSACTIONS_COLLECTION_ID) {
    //   try {
    //     await databases.createDocument(
    //       APPWRITE_DATABASE_ID,
    //       TRANSACTIONS_COLLECTION_ID,
    //       ID.unique(),
    //       {
    //         user_id: userId,
    //         type: 'token_deduction',
    //         token_amount_changed: -amountToDeduct, // Negative for deduction
    //         new_balance: newTokenBalance,
    //         transaction_description: description || `Deducted ${amountToDeduct} tokens.`,
    //         timestamp: new Date().toISOString(),
    //       }
    //     );
    //   } catch (logError) {
    //     console.warn('Failed to log token transaction:', logError);
    //     // Don't fail the main request because of a failed log
    //   }
    // }

    } catch (updateError: any) {
      console.error('Error updating user token balance in Appwrite:', updateError);
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
