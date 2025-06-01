
import { NextResponse } from 'next/server';
import { Query, AppwriteException } from 'node-appwrite';
import { 
  appwriteDatabases, 
  appwriteAccount, // For Appwrite Auth user creation (if you decide to use it alongside custom DB)
  clientInitialized, 
  initializationError,
  APPWRITE_DATABASE_ID, 
  USERS_COLLECTION_ID 
} from '@/lib/appwrite.node';

const INITIAL_FREE_TOKENS = 60000;

export async function POST(request: Request) {
  try { // Top-level try-catch to ensure a JSON response is always attempted
    console.log("API Route: /api/custom-auth/register POST request received.");

    if (!clientInitialized) {
      console.error("API Route Error: Appwrite Node client not initialized.", initializationError);
      return NextResponse.json(
        { message: `Server configuration error: Appwrite client failed to initialize. ${initializationError || 'Details unavailable.'}` },
        { status: 500 }
      );
    }

    if (!APPWRITE_DATABASE_ID || !USERS_COLLECTION_ID) {
        console.error("API Route Error: Database or Users collection ID is missing in server config.");
        return NextResponse.json(
          { message: "Server configuration error: Crucial database/collection ID is missing." },
          { status: 500 }
        );
    }

    let requestBody;
    try {
        requestBody = await request.json();
    } catch (e) {
        console.error("API Route Error: Invalid JSON in request body", e);
        return NextResponse.json({ message: 'Invalid request body: Could not parse JSON.' }, { status: 400 });
    }
    
    const { email, password, username } = requestBody;
    console.log("API Route: Parsed request body:", { email, username, password_provided: !!password });

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
      console.log(`API Route: Checking for existing user in custom DB (${USERS_COLLECTION_ID}) with email: ${email}`);
      const existingUsers = await appwriteDatabases.listDocuments(
        APPWRITE_DATABASE_ID!,
        USERS_COLLECTION_ID!,
        [Query.equal('email', email), Query.limit(1)]
      );

      if (existingUsers.total > 0) {
        console.log(`API Route: User with email ${email} already exists in custom DB.`);
        return NextResponse.json({ message: 'User with this email already exists in our records.' }, { status: 409 });
      }
      console.log(`API Route: No existing user found in custom DB for email ${email}. Proceeding with creation.`);
      
      // WARNING: STORING PLAINTEXT PASSWORD. DO NOT USE IN PRODUCTION.
      // In a real app, 'password' should be securely hashed here using bcrypt or Argon2,
      // and the hash stored in 'passwordHash'.
      const newUserDocumentData = {
        email: email,
        username: username,
        passwordHash: password, // INSECURE: Storing plaintext password. Replace with hashed password.
        token_balance: INITIAL_FREE_TOKENS,
        subscription_status: 'free_tier', // Or your default status
        // Initialize other fields from your schema if they have defaults or are required
        // e.g., firstName: '', lastName: '', etc.
      };

      console.log(`API Route: Creating document in custom DB (${USERS_COLLECTION_ID}).`);
      // For a custom DB approach, you would typically generate a unique ID for the document.
      // If you were also creating an Appwrite Auth user, you'd use appwriteAuthUser.$id here.
      // Since we're *only* using the custom DB for this illustrative example:
      const newUserDocument = await appwriteDatabases.createDocument(
        APPWRITE_DATABASE_ID!,
        USERS_COLLECTION_ID!,
        'unique()', // Let Appwrite generate a unique ID for the document in custom DB
        newUserDocumentData
      );
      console.log("API Route: User document created successfully in custom DB:", newUserDocument.$id);

      // Exclude passwordHash from the response for security, even though it's plaintext in this demo
      const { passwordHash: _, ...userResponseData } = newUserDocument;

      return NextResponse.json({ message: 'User registered successfully into custom database.', user: userResponseData }, { status: 201 });

    } catch (error: any) {
      console.error('API Route Error: Error during custom registration logic:', error);
      let message = 'An internal server error occurred during registration.';
      let statusCode = 500;

      if (error instanceof AppwriteException) {
          message = `Appwrite Error (${error.code || 'N/A'}): ${error.message}`;
          statusCode = typeof error.code === 'number' && error.code >= 400 && error.code < 600 ? error.code : 500;
      } else if (error.message && typeof error.message === 'string') {
          message = error.message;
      } else if (typeof error === 'string') {
          message = error;
      }
      
      return NextResponse.json({ message: message || "Unknown registration error." }, { status: statusCode });
    }
  } catch (topLevelError: any) {
    // This is a fallback for truly unexpected errors outside the main logic's try-catch.
    console.error('API Route CRITICAL Error: Unhandled exception in POST /api/custom-auth/register:', topLevelError);
    return NextResponse.json(
        { message: 'A critical server error occurred. Please check server logs for details.' },
        { status: 500 }
    );
  }
}
