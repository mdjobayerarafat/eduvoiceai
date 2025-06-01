
import { NextResponse } from 'next/server';
import { Query, AppwriteException, APPWRITE_DATABASE_ID, USERS_COLLECTION_ID } from '@/lib/appwrite.node'; // Using a .node suffix for clarity
import { Client, Databases } from 'node-appwrite';

// Initialize Appwrite Node SDK client
// Ensure these environment variables are set in your backend environment
const appwriteClient = new Client();
appwriteClient
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!); // Your secret Admin API key

const appwriteDatabases = new Databases(appwriteClient);

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
    }

    const users = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID!,
      USERS_COLLECTION_ID!,
      [Query.equal('email', email), Query.limit(1)]
    );

    if (users.total === 0) {
      return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 });
    }

    const userDocument = users.documents[0];

    // WARNING: Comparing plaintext password. DO NOT DO THIS IN PRODUCTION.
    // In a real application, retrieve the stored passwordHash and use a secure comparison function 
    // (e.g., bcrypt.compare) against the provided password.
    // @ts-ignore
    if (userDocument.passwordHash !== password) { 
      return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 });
    }

    // IMPORTANT: Session management is NOT handled here.
    // A real implementation would generate a session token (e.g., JWT),
    // set it in an HttpOnly cookie, and return user data.

    // Exclude passwordHash from the response
    // @ts-ignore
    const { passwordHash: _, ...userResponseData } = userDocument;

    return NextResponse.json({ message: 'Login successful (custom DB).', user: userResponseData }, { status: 200 });

  } catch (error: any) {
    console.error('Error in custom login API:', error);
    let message = 'An internal server error occurred during login.';
    let statusCode = 500;

    if (error instanceof AppwriteException) {
      message = error.message;
      statusCode = error.code || 500;
    } else if (error.message) {
      message = error.message;
    }
    
    return NextResponse.json({ message }, { status: statusCode });
  }
}
