
import { NextResponse } from 'next/server';
import { Client, Users, AppwriteException } from 'node-appwrite';
import { databases as appwriteDatabasesSDK, ID as AppwriteID } from '@/lib/appwrite'; // Import Appwrite SDK components
import { APPWRITE_DATABASE_ID, TRANSACTIONS_COLLECTION_ID } from '@/lib/appwrite';


const client = new Client();
client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const users = new Users(client);
const databases = appwriteDatabasesSDK; // Use the imported databases instance

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, amountToDeduct, description } = body; 

    if (!userId || typeof amountToDeduct !== 'number' || amountToDeduct <= 0) {
      return NextResponse.json({ message: 'Invalid request: userId and a positive amountToDeduct are required.' }, { status: 400 });
    }

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
    const subscriptionStatus = prefs.subscription_status; 

    if (subscriptionStatus === 'active') {
      return NextResponse.json({ 
        message: 'Pro subscription active, tokens not deducted.', 
        currentTokenBalance, 
        subscriptionStatus 
      });
    }

    if (currentTokenBalance < amountToDeduct) {
      return NextResponse.json({ 
        message: 'Insufficient tokens.', 
        currentTokenBalance,
        needed: amountToDeduct
      }, { status: 402 }); 
    }

    const newTokenBalance = currentTokenBalance - amountToDeduct;

    try {
      await users.updatePrefs(userId, { ...prefs, token_balance: newTokenBalance });

      if (APPWRITE_DATABASE_ID && TRANSACTIONS_COLLECTION_ID) {
        try {
          await databases.createDocument(
            APPWRITE_DATABASE_ID,
            TRANSACTIONS_COLLECTION_ID,
            AppwriteID.unique(),
            {
              user_id: userId, // Ensure your 'transactions' collection has a 'user_id' attribute (string)
              type: 'token_deduction',
              token_amount_changed: -amountToDeduct, 
              new_balance: newTokenBalance,
              transaction_description: description || `Deducted ${amountToDeduct} tokens.`,
              timestamp: new Date().toISOString(),
            }
          );
          console.log(`Transaction logged for user ${userId}: ${amountToDeduct} tokens deducted.`);
        } catch (logError) {
          console.warn('Failed to log token transaction:', logError);
        }
      } else {
        console.warn('Transaction logging skipped: APPWRITE_DATABASE_ID or TRANSACTIONS_COLLECTION_ID is not configured.');
      }

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

