
import { NextResponse } from 'next/server';
import { Client, Users, AppwriteException } from 'node-appwrite';

const client = new Client();
client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!) 
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!) 
  .setKey(process.env.APPWRITE_API_KEY!); 

const users = new Users(client);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, token_balance, subscription_status, subscription_end_date } = body;

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    // Fetch current user to get existing preferences
    const currentUser = await users.get(userId);
    const currentPrefs = currentUser.prefs || {};

    // Prepare updated preferences
    const updatedPrefs: { [key: string]: any } = { ...currentPrefs };

    if (token_balance !== undefined && typeof token_balance === 'number') {
      updatedPrefs.token_balance = token_balance;
    }

    if (subscription_status !== undefined && typeof subscription_status === 'string') {
      updatedPrefs.subscription_status = subscription_status;
    }

    if (subscription_end_date !== undefined) {
      // Store as ISO string or timestamp, ensure consistent format
      updatedPrefs.subscription_end_date = typeof subscription_end_date === 'string' 
        ? subscription_end_date 
        : new Date(subscription_end_date).toISOString();
    }
    
    // If no specific updates are provided, it's a bit of a no-op but still a valid call
    if (Object.keys(body).filter(k => k !== 'userId').length === 0) {
        return NextResponse.json({ message: 'No update parameters provided, but user found.', userPrefs: currentPrefs });
    }


    await users.updatePrefs(userId, updatedPrefs);

    return NextResponse.json({ message: 'User preferences updated successfully', updatedPrefs });

  } catch (error: any) {
    console.error('Error updating user preferences in Appwrite:', error);
    let errorMessage = 'Error updating user data';
    let statusCode = 500;

    if (error instanceof AppwriteException) {
      errorMessage = error.message;
      statusCode = error.code || 500; // Use Appwrite error code if available
      if (error.code === 404) {
         errorMessage = 'User not found';
      }
    }
    return NextResponse.json({ message: errorMessage, type: error.type }, { status: statusCode });
  }
}
