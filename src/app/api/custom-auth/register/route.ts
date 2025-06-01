
import { NextResponse } from 'next/server';
import { Query, AppwriteException, ID as AppwriteGeneratedID } from 'node-appwrite'; // Import ID for generating unique user ID for Auth
import { 
  databases, 
  users as appwriteAccount, // Use 'users' service from node-appwrite for server-side user creation
  clientInitialized, 
  initializationError,
  APPWRITE_DATABASE_ID, 
  USERS_COLLECTION_ID 
} from '@/lib/appwrite.node';

const INITIAL_FREE_TOKENS = 60000;

export async function POST(request: Request) {
  console.log("API Route: /api/custom-auth/register POST request received.");

  if (!clientInitialized) {
    console.error("API Route Error: Appwrite Node client not initialized.", initializationError);
    return NextResponse.json(
      { message: `Server configuration error: ${initializationError || 'Appwrite client failed to initialize.'}` },
      { status: 500 }
    );
  }

  if (!APPWRITE_DATABASE_ID || !USERS_COLLECTION_ID) {
      console.error("API Route Error: Database or Users collection ID is missing.");
      return NextResponse.json(
        { message: "Server configuration error: Database or Users collection ID is missing." },
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


    // 1. Check if user with this email already exists in your custom database OR Appwrite Auth
    // It's better to check Appwrite Auth first, as that's the primary store for auth identity.
    try {
        // Try to get user by email from Appwrite Auth - this isn't directly available in Node SDK
        // A common pattern is to attempt creation and catch conflict, or query custom DB first if email is unique there.
        // For simplicity, we'll query custom DB for email first.
        console.log(`API Route: Checking for existing user in custom DB with email: ${email}`);
        const existingUsersInCustomDB = await databases.listDocuments(
            APPWRITE_DATABASE_ID!,
            USERS_COLLECTION_ID!,
            [Query.equal('email', email), Query.limit(1)]
        );

        if (existingUsersInCustomDB.total > 0) {
            console.log(`API Route: User with email ${email} already exists in custom DB.`);
            return NextResponse.json({ message: 'User with this email already exists.' }, { status: 409 });
        }
    } catch (dbQueryError) {
        // If query fails for reasons other than "not found", it's a server issue.
        console.error("API Route Error: Error querying custom users DB:", dbQueryError);
        // Don't immediately fail; proceed to try creating in Appwrite Auth, which has its own checks.
    }
    

    // 2. Create User in Appwrite Authentication System
    let appwriteAuthUser;
    try {
        console.log("API Route: Creating user in Appwrite Authentication.");
        appwriteAuthUser = await appwriteAccount.create(
            AppwriteGeneratedID.unique(), // Let Appwrite generate a unique ID for the user
            email,
            password,
            username // Optional: Set the user's name in Appwrite Auth
        );
        console.log("API Route: User created in Appwrite Authentication:", appwriteAuthUser.$id);
    } catch (authError: any) {
        if (authError instanceof AppwriteException && (authError.code === 409 || authError.type === 'user_email_already_exists' || authError.type === 'user_already_exists')) {
            console.log(`API Route: User with email ${email} already exists in Appwrite Auth.`);
            return NextResponse.json({ message: 'User with this email already exists.' }, { status: 409 });
        }
        console.error('API Route Error: Error creating user in Appwrite Authentication:', authError);
        return NextResponse.json({ message: authError.message || 'Failed to create user in Appwrite Auth.', type: authError.type }, { status: authError.code || 500 });
    }
    

    // 3. Create Document in Custom Database, linking by Appwrite User ID
    console.log(`API Route: Creating document in custom DB (${USERS_COLLECTION_ID}) with Appwrite User ID: ${appwriteAuthUser.$id}`);
    
    const newUserDocumentData = {
      email: email, 
      username: username, 
      // DO NOT store password or passwordHash here if Appwrite Auth is handling it.
      token_balance: INITIAL_FREE_TOKENS,
      subscription_status: 'trial', 
      // Initialize other fields as per your `users` collection schema
      // e.g., firstName: '', lastName: '', profileImageStorageId: null, subscription_end_date: null, etc.
    };

    const newUserDocument = await databases.createDocument(
      APPWRITE_DATABASE_ID!,
      USERS_COLLECTION_ID!,
      appwriteAuthUser.$id, // *** USE THE APPWRITE AUTH USER ID AS THE DOCUMENT ID ***
      newUserDocumentData
      // Permissions for the custom user document:
      // Typically, the user themselves should have read/write access to their own profile document.
      // [
      //   Permission.read(Role.user(appwriteAuthUser.$id)),
      //   Permission.update(Role.user(appwriteAuthUser.$id)),
      //   // admins might need broader access if they can edit profiles
      // ]
    );
    console.log("API Route: User document created successfully in custom DB:", newUserDocument.$id);

    // The user is created in Appwrite Auth and their profile in custom DB.
    // No need to call /api/user/update-subscription to set tokens, it's done here.
    // Frontend will then redirect to login.

    return NextResponse.json({ 
        message: 'User registered successfully. Please log in.', 
        userId: appwriteAuthUser.$id,
        customDbDocId: newUserDocument.$id 
    }, { status: 201 });

  } catch (error: any) {
    console.error('API Route Error: Unhandled error during registration:', error);
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
