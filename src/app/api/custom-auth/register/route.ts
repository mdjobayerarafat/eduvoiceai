
import { NextResponse } from 'next/server';
import { Query, AppwriteException } from 'node-appwrite';
import { 
  databases as appwriteDatabases, // Corrected import alias
  // appwriteAccount, // For Appwrite Auth user creation (if you decide to use it alongside custom DB)
  clientInitialized, 
  initializationError,
  APPWRITE_DATABASE_ID, 
  USERS_COLLECTION_ID 
} from '@/lib/appwrite.node';

const INITIAL_FREE_TOKENS = 60000;

export async function POST(request: Request) {
  try {
    console.log("API Route (Register): /api/custom-auth/register POST request received.");

    if (!clientInitialized) {
      const errorMessage = `Server configuration error: Appwrite client failed to initialize. ${initializationError || 'Details unavailable.'}`;
      console.error("API Route Error (Register): Appwrite Node client not initialized.", initializationError);
      return NextResponse.json({ message: errorMessage }, { status: 500 });
    }

    if (!APPWRITE_DATABASE_ID || !USERS_COLLECTION_ID) {
        const errorMessage = "Server configuration error: Crucial database/collection ID is missing.";
        console.error("API Route Error (Register): Database or Users collection ID is missing in server config.", { APPWRITE_DATABASE_ID, USERS_COLLECTION_ID });
        return NextResponse.json({ message: errorMessage }, { status: 500 });
    }

    let requestBody;
    try {
        requestBody = await request.json();
    } catch (e) {
        const errorMessage = 'Invalid request body: Could not parse JSON.';
        console.error("API Route Error (Register): Invalid JSON in request body", e);
        return NextResponse.json({ message: errorMessage }, { status: 400 });
    }
    
    const { email, password, username } = requestBody;
    console.log("API Route (Register): Parsed request body:", { email, username, password_provided: !!password });

    if (!email || !password || !username) {
      return NextResponse.json({ message: 'Email, password, and username are required.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    if (username.length < 3) {
      return NextResponse.json({ message: 'Username must be at least 3 characters.' }, { status: 400 });
    }

    // Main logic try-catch
    try {
      console.log(`API Route (Register): Checking for existing user in custom DB (${USERS_COLLECTION_ID}) with email: ${email}`);
      const existingUsers = await appwriteDatabases.listDocuments(
        APPWRITE_DATABASE_ID!,
        USERS_COLLECTION_ID!,
        [Query.equal('email', email), Query.limit(1)]
      );

      if (existingUsers.total > 0) {
        console.log(`API Route (Register): User with email ${email} already exists in custom DB.`);
        return NextResponse.json({ message: 'User with this email already exists in our records.' }, { status: 409 });
      }
      console.log(`API Route (Register): No existing user found in custom DB for email ${email}. Proceeding with creation.`);
      
      const newUserDocumentData = {
        email: email,
        username: username,
        passwordHash: password, // INSECURE: Storing plaintext password for demo. Replace with hashed password in production.
        token_balance: INITIAL_FREE_TOKENS,
        subscription_status: 'free_tier', 
      };

      console.log(`API Route (Register): Creating document in custom DB (${USERS_COLLECTION_ID}).`);
      const newUserDocument = await appwriteDatabases.createDocument(
        APPWRITE_DATABASE_ID!,
        USERS_COLLECTION_ID!,
        'unique()', 
        newUserDocumentData
      );
      console.log("API Route (Register): User document created successfully in custom DB:", newUserDocument.$id);

      const { passwordHash: _, ...userResponseData } = newUserDocument;
      return NextResponse.json({ message: 'User registered successfully into custom database.', user: userResponseData }, { status: 201 });

    } catch (error: any) {
      let safeErrorMessage = "An internal server error occurred during registration.";
      let statusCode = 500;
      
      // Log the original error for server-side debugging
      console.error('API Route Error (Register): Error during custom registration logic. Original error: ', error);

      if (error instanceof AppwriteException) {
        safeErrorMessage = `Appwrite Error (${error.code || 'N/A'}): ${error.message}`;
        statusCode = typeof error.code === 'number' && error.code >= 400 && error.code < 600 ? error.code : 500;
      } else if (error instanceof Error && error.message) {
        safeErrorMessage = error.message;
      } else if (typeof error === 'string') {
        safeErrorMessage = error;
      }
      
      return NextResponse.json({ message: safeErrorMessage }, { status: statusCode });
    }
  } catch (topLevelError: any) {
    let safeTopLevelMessage = "A critical server error occurred in the registration API.";
    if (topLevelError instanceof Error && topLevelError.message) {
      safeTopLevelMessage = `Critical error: ${topLevelError.message}`;
    } else if (typeof topLevelError === 'string') {
      safeTopLevelMessage = `Critical error: ${topLevelError}`;
    }
    
    console.error('API Route CRITICAL Error (Register): Unhandled exception. Original error: ', topLevelError);
    return NextResponse.json(
        { message: safeTopLevelMessage },
        { status: 500 }
    );
  }
}
