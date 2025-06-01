
import { NextResponse } from 'next/server';
import { Client, Users, AppwriteException } from 'node-appwrite';

export async function POST(req: Request) {
  console.log("Attempting to update user subscription/prefs. Checking environment variables...");

  const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const appwriteProjectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const appwriteApiKey = process.env.APPWRITE_API_KEY;

  console.log(`NEXT_PUBLIC_APPWRITE_ENDPOINT: ${appwriteEndpoint ? 'Loaded' : 'MISSING!'}`);
  console.log(`NEXT_PUBLIC_APPWRITE_PROJECT_ID: ${appwriteProjectId ? 'Loaded' : 'MISSING!'}`);
  if (appwriteApiKey) {
    console.log(`APPWRITE_API_KEY: Loaded (ends with ${appwriteApiKey.slice(-4)})`);
  } else {
    console.error('CRITICAL: APPWRITE_API_KEY is MISSING or undefined in the server environment!');
  }

  if (!appwriteEndpoint || !appwriteProjectId || !appwriteApiKey) {
    console.error("Aborting: Missing one or more critical Appwrite environment variables for server-side SDK.");
    return NextResponse.json({ message: 'Server configuration error for Appwrite SDK.' }, { status: 500 });
  }

  const client = new Client();
  try {
    client
      .setEndpoint(appwriteEndpoint)
      .setProject(appwriteProjectId)
      .setKey(appwriteApiKey);
    console.log("Appwrite Node.js client initialized successfully with API key.");
  } catch (initError: any) {
    console.error('Error initializing Appwrite client with setKey:', initError);
    return NextResponse.json({ message: 'Failed to initialize Appwrite client.', details: initError.message }, { status: 500 });
  }
  
  const users = new Users(client);

  try {
    const body = await req.json();
    const { userId, token_balance, subscription_status, subscription_end_date } = body;

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }
    console.log(`Processing update for userId: ${userId}, payload:`, body);


    const currentUser = await users.get(userId);
    const currentPrefs = currentUser.prefs || {};
    console.log(`Current prefs for user ${userId}:`, currentPrefs);

    const updatedPrefs: { [key: string]: any } = { ...currentPrefs };

    if (token_balance !== undefined && typeof token_balance === 'number') {
      updatedPrefs.token_balance = token_balance;
    }

    if (subscription_status !== undefined && typeof subscription_status === 'string') {
      updatedPrefs.subscription_status = subscription_status;
    }

    if (subscription_end_date !== undefined) {
      updatedPrefs.subscription_end_date = typeof subscription_end_date === 'string' 
        ? subscription_end_date 
        : new Date(subscription_end_date).toISOString();
    }
    
    if (Object.keys(body).filter(k => k !== 'userId').length === 0) {
        console.log("No actual update parameters provided for user prefs, returning current prefs.");
        return NextResponse.json({ message: 'No update parameters provided, but user found.', userPrefs: currentPrefs });
    }

    console.log(`Attempting to update prefs for user ${userId} to:`, updatedPrefs);
    await users.updatePrefs(userId, updatedPrefs);
    console.log(`User preferences for ${userId} updated successfully.`);

    return NextResponse.json({ message: 'User preferences updated successfully', updatedPrefs });

  } catch (error: any) {
    console.error(`Error processing update for user ${error.request?.url} - User ID in body: ${req.headers.get('X-User-ID-Debug') || 'N/A'}. Appwrite Error:`, error);
    let errorMessage = 'Error updating user data';
    let statusCode = 500;

    if (error instanceof AppwriteException) {
      errorMessage = error.message;
      statusCode = error.code || 500; 
      if (error.code === 404) {
         errorMessage = 'User not found';
      }
      // The error "the current user is not authorized to perform the requested action" often has type user_unauthorized or similar
      console.error(`AppwriteException details: Type: ${error.type}, Code: ${error.code}, Message: ${error.message}`);
    } else {
      console.error('Non-AppwriteException error:', error);
    }
    return NextResponse.json({ message: errorMessage, type: error.type }, { status: statusCode });
  }
}
