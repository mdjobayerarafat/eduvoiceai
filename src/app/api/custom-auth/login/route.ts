
import { NextResponse } from 'next/server';
import {
  databases,
  clientInitialized,
  initializationError,
  APPWRITE_DATABASE_ID,
  USERS_COLLECTION_ID,
  Query, // Now imported from appwrite.node
  AppwriteException // Now imported from appwrite.node
} from '@/lib/appwrite.node';

export async function POST(request: Request) {
  try {
    console.log("API Route (Login): /api/custom-auth/login POST request received.");

    if (!clientInitialized) {
      const errorMessage = `Server configuration error: Appwrite client failed to initialize. ${initializationError || 'Details unavailable.'}`;
      console.error("API Route Error (Login): Appwrite Node client not initialized.", initializationError);
      return NextResponse.json({ message: errorMessage }, { status: 500 });
    }

    if (!APPWRITE_DATABASE_ID || !USERS_COLLECTION_ID) {
      const errorMessage = "Server configuration error: Database or Users collection ID is missing.";
      console.error("API Route Error (Login): Database or Users collection ID is missing in server config.", { APPWRITE_DATABASE_ID, USERS_COLLECTION_ID });
      return NextResponse.json({ message: errorMessage }, { status: 500 });
    }
    
    let requestBody;
    try {
        requestBody = await request.json();
    } catch (e) {
        const errorMessage = 'Invalid request body: Could not parse JSON.';
        console.error("API Route Error (Login): Invalid JSON in request body", e);
        return NextResponse.json({ message: errorMessage }, { status: 400 });
    }

    const { email, password } = requestBody;
    console.log("API Route (Login): Parsed request body:", { email, password_provided: !!password });


    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
    }

    try {
      console.log(`API Route (Login): Searching for user in custom DB (${USERS_COLLECTION_ID}) with email: ${email}`);
      const usersList = await databases.listDocuments( // Use 'databases'
        APPWRITE_DATABASE_ID!,
        USERS_COLLECTION_ID!,
        [Query.equal('email', email), Query.limit(1)]
      );

      if (usersList.total === 0) {
        console.log(`API Route (Login): User with email ${email} not found in custom DB.`);
        return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 });
      }

      const userDocument = usersList.documents[0];
      console.log(`API Route (Login): User found. Verifying password for user ID: ${userDocument.$id}`);

      // WARNING: Comparing plaintext passwords. Highly insecure. For demonstration only.
      if (userDocument.passwordHash !== password) {
        console.log(`API Route (Login): Password mismatch for user ID: ${userDocument.$id}.`);
        return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 });
      }

      console.log(`API Route (Login): Login successful for user ID: ${userDocument.$id}.`);
      const { passwordHash: _, ...userResponseData } = userDocument;

      return NextResponse.json({ message: 'Login successful (custom DB). Session not implemented.', user: userResponseData }, { status: 200 });

    } catch (error: any) {
      let safeErrorMessage = "An internal server error occurred during login.";
      let statusCode = 500;

      console.error('API Route Error (Login): Error during custom login logic. Original error: ', error);

      if (error instanceof AppwriteException) {
        safeErrorMessage = `Appwrite Error (${error.code || 'N/A'}): ${error.message}`;
        statusCode = typeof error.code === 'number' && error.code >= 400 && error.code < 600 ? error.code : 500;
      } else if (error instanceof Error && error.message) {
        safeErrorMessage = "An unexpected error occurred while processing your login.";
      } else if (typeof error === 'string') {
        safeErrorMessage = error; // Should be rare
      }
      
      return NextResponse.json({ message: safeErrorMessage }, { status: statusCode });
    }
  } catch (topLevelError: any) {
    let safeTopLevelMessage = "A critical server error occurred in the login API.";
     console.error('API Route CRITICAL Error (Login): Unhandled exception. Original error: ', topLevelError);

    if (topLevelError instanceof Error && topLevelError.message) {
      safeTopLevelMessage = `Critical error: An unexpected server issue occurred.`;
    } else if (typeof topLevelError === 'string') {
      safeTopLevelMessage = `Critical error: An unexpected server issue occurred. Details: ${topLevelError}`;
    }
    
    return NextResponse.json(
        { message: safeTopLevelMessage },
        { status: 500 }
    );
  }
}
