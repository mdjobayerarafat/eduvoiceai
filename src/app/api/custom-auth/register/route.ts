
import { NextResponse } from 'next/server';
import { databases, ID, Query, AppwriteException, APPWRITE_DATABASE_ID, USERS_COLLECTION_ID } from '@/lib/appwrite.node'; // Using a .node suffix for clarity if you make a separate admin client
import { Client, Databases } from 'node-appwrite';

// Initialize Appwrite Node SDK client
// Ensure these environment variables are set in your backend environment
const appwriteClient = new Client();
appwriteClient
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!); // Your secret Admin API key

const appwriteDatabases = new Databases(appwriteClient);

const INITIAL_FREE_TOKENS = 60000;

export async function POST(request: Request) {
  try {
    const { email, password, username } = await request.json();

    if (!email || !password || !username) {
      return NextResponse.json({ message: 'Email, password, and username are required.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters.' }, { status: 400, fieldErrors: { password: 'Password must be at least 8 characters.'} });
    }
    if (username.length < 3) {
      return NextResponse.json({ message: 'Username must be at least 3 characters.' }, { status: 400, fieldErrors: { username: 'Username must be at least 3 characters.'} });
    }


    // Check if user with this email already exists
    try {
      const existingUsers = await appwriteDatabases.listDocuments(
        APPWRITE_DATABASE_ID!,
        USERS_COLLECTION_ID!,
        [Query.equal('email', email)]
      );
      if (existingUsers.total > 0) {
        return NextResponse.json({ message: 'User with this email already exists.', fieldErrors: { email: 'User with this email already exists.'} }, { status: 409 });
      }
    } catch (error) {
      // If collection doesn't exist or other DB error, log it and continue (creation might still fail if schema is wrong)
      console.error("Error checking for existing user (this might be ok if collection is new):", error);
    }


    // WARNING: Storing plaintext password. DO NOT DO THIS IN PRODUCTION.
    // In a real application, hash the password here using a strong hashing algorithm (e.g., bcrypt, Argon2).
    const passwordHash = password; // Plaintext for this illustrative example ONLY.

    const newUserDocumentData = {
      email,
      username,
      passwordHash, // Store the (plaintext for now) password
      token_balance: INITIAL_FREE_TOKENS,
      subscription_status: 'free_tier',
      // Initialize other optional fields from your schema if needed
      // subscription_end_date: null,
      // voucher_code: null,
      // voucher_expiry_date: null,
      // voucher_usage_count: 0,
      // firstName: '',
      // lastName: '',
      // profileImageStorageId: null,
    };

    const newUserDocument = await appwriteDatabases.createDocument(
      APPWRITE_DATABASE_ID!,
      USERS_COLLECTION_ID!,
      ID.unique(),
      newUserDocumentData
    );

    // Exclude passwordHash from the response
    const { passwordHash: _, ...userResponseData } = newUserDocument;

    return NextResponse.json({ message: 'User registered successfully in custom DB.', user: userResponseData }, { status: 201 });

  } catch (error: any) {
    console.error('Error in custom registration API:', error);
    let message = 'An internal server error occurred during registration.';
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
