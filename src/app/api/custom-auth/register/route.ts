
import { NextResponse } from 'next/server';
import { databases as appwriteDatabases, ID, Query, AppwriteException, APPWRITE_DATABASE_ID, USERS_COLLECTION_ID } from '@/lib/appwrite.node';

const INITIAL_FREE_TOKENS = 60000;

export async function POST(request: Request) {
  // Log entry into the API route
  console.log("API Route: /api/custom-auth/register POST request received.");

  // Environment variable checks
  const requiredServerEnvs = {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    APPWRITE_API_KEY: process.env.APPWRITE_API_KEY,
    NEXT_PUBLIC_APPWRITE_DATABASE_ID: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
  };

  const missingEnvs = Object.entries(requiredServerEnvs)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingEnvs.length > 0) {
    console.error(`API Route Error: Missing server environment variables: ${missingEnvs.join(', ')}`);
    return NextResponse.json(
      { message: `Server configuration error: Missing environment variables: ${missingEnvs.join(', ')}` },
      { status: 500 }
    );
  }

  if (!APPWRITE_DATABASE_ID) {
    console.error("API Route Error: APPWRITE_DATABASE_ID is not configured in appwrite.node.ts or env.");
    return NextResponse.json(
      { message: "Server configuration error: Database ID is missing." },
      { status: 500 }
    );
  }
  if (!USERS_COLLECTION_ID) {
    // This is hardcoded in appwrite.node.ts, but good to check.
    console.error("API Route Error: USERS_COLLECTION_ID is not configured in appwrite.node.ts.");
    return NextResponse.json(
      { message: "Server configuration error: Users collection ID is missing." },
      { status: 500 }
    );
  }

  try {
    const { email, password, username } = await request.json();
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

    // Check if user with this email already exists
    console.log(`API Route: Checking for existing user with email: ${email}`);
    const existingUsers = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID!,
      USERS_COLLECTION_ID!,
      [Query.equal('email', email), Query.limit(1)]
    );

    if (existingUsers.total > 0) {
      console.log(`API Route: User with email ${email} already exists.`);
      return NextResponse.json({ message: 'User with this email already exists.' }, { status: 409 });
    }
    console.log(`API Route: No existing user found for email ${email}. Proceeding with registration.`);

    // WARNING: Storing plaintext password. DO NOT DO THIS IN PRODUCTION.
    // In a real application, hash the password here using a strong hashing algorithm (e.g., bcrypt, Argon2).
    const passwordHash = password; // Plaintext for this illustrative example ONLY.
    console.warn("API Route WARNING: Storing password as plaintext. This is insecure and for demonstration purposes only.");


    const newUserDocumentData = {
      email,
      username,
      passwordHash, // Store the (plaintext for now) password
      token_balance: INITIAL_FREE_TOKENS,
      subscription_status: 'free_tier',
      // Initialize other optional fields from your schema if needed
      // firstName: '',
      // lastName: '',
      // profileImageStorageId: null,
      // subscription_end_date: null,
      // voucher_code: null,
      // voucher_expiry_date: null,
      // voucher_usage_count: 0,
    };
    console.log("API Route: Preparing to create document in Appwrite with data:", newUserDocumentData);


    const newUserDocument = await appwriteDatabases.createDocument(
      APPWRITE_DATABASE_ID!,
      USERS_COLLECTION_ID!,
      ID.unique(),
      newUserDocumentData
    );
    console.log("API Route: User document created successfully in Appwrite:", newUserDocument.$id);

    // Exclude passwordHash from the response
    const { passwordHash: _, ...userResponseData } = newUserDocument;

    return NextResponse.json({ message: 'User registered successfully in custom DB.', user: userResponseData }, { status: 201 });

  } catch (error: any) {
    console.error('API Route Error: Error in custom registration API:', error);
    let message = 'An internal server error occurred during registration.';
    let statusCode = 500;

    if (error instanceof AppwriteException) {
      message = `Appwrite Error (${error.code} - ${error.type}): ${error.message}`;
      statusCode = error.code || 500; // Use Appwrite's error code if available
      console.error('API Route Error: AppwriteException details:', {
        message: error.message,
        code: error.code,
        type: error.type,
        response: error.response,
      });
    } else if (error.message) {
      message = error.message;
      console.error('API Route Error: Generic error details:', error.message, error.stack);
    } else {
      console.error('API Route Error: Unknown error object:', error);
    }
    
    return NextResponse.json({ message }, { status: statusCode });
  }
}
