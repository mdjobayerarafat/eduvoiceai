
import { NextResponse } from 'next/server';
import { AppwriteException, ID as AppwriteGeneratedID } from 'node-appwrite'; 
import { 
  databases, 
  users as appwriteAccount, 
  clientInitialized, 
  initializationError,
  APPWRITE_DATABASE_ID, 
  USERS_COLLECTION_ID,
  Query 
} from '@/lib/appwrite.node';

const INITIAL_FREE_TOKENS = 60000;

export async function POST(request: Request) {
  console.log("API Route: /api/custom-auth/register POST request received.");

  if (!clientInitialized) {
    const errorMsg = `Server configuration error: ${initializationError || 'Appwrite Node.js client failed to initialize.'}`;
    console.error("API Route Error:", errorMsg);
    return NextResponse.json({ message: errorMsg }, { status: 500 });
  }

  if (!APPWRITE_DATABASE_ID || !USERS_COLLECTION_ID) {
      const errorMsg = "Server configuration error: Database or Users collection ID is missing.";
      console.error("API Route Error:", errorMsg);
      return NextResponse.json({ message: errorMsg }, { status: 500 });
  }

  let email, password, username;
  try {
    const body = await request.json();
    email = body.email;
    password = body.password;
    username = body.username;
    console.log("API Route: Parsed request body:", { email, username, password_provided: !!password });
  } catch (parseError: any) {
    console.error("API Route Error: Failed to parse request body:", parseError);
    return NextResponse.json({ message: `Invalid request body: ${parseError.message}` }, { status: 400 });
  }

  if (!email || !password || !username) {
    return NextResponse.json({ message: 'Email, password, and username are required.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ message: 'Password must be at least 8 characters.' }, { status: 400 });
  }
  if (username.length < 3) {
    return NextResponse.json({ message: 'Username must be at least 3 characters.' }, { status: 400 });
  }

  let appwriteAuthUser;
  try {
    console.log("API Route: Creating user in Appwrite Authentication.");
    // Ensure the parameters are in the correct order: userId, email, phone, password, name
    // Passing undefined for the optional phone parameter.
    appwriteAuthUser = await appwriteAccount.create(
        AppwriteGeneratedID.unique(), 
        email,
        undefined, // Explicitly pass undefined for the optional phone parameter
        password,
        username 
    );
    console.log("API Route: User created in Appwrite Authentication:", appwriteAuthUser.$id);

  } catch (authError: any) {
    console.error('API Route Error: Error creating user in Appwrite Authentication:', authError);
    let message = authError.message || 'Failed to create user in Appwrite Authentication.';
    let statusCode = authError.code || 500;

    if (authError instanceof AppwriteException) {
        if (authError.code === 409 || authError.type === 'user_email_already_exists' || authError.type === 'user_already_exists') {
            message = 'A user with this email or username already exists.';
            statusCode = 409;
        } else if (authError.type === 'user_phone_already_exists') {
            message = 'A user with this phone number already exists.'; // Should not happen if phone is undefined
            statusCode = 409;
        } else if (authError.message.toLowerCase().includes("phone")) {
             message = `Appwrite Auth Error related to phone: ${authError.message}`;
             statusCode = 400; // Likely a validation error
        }
    }
    return NextResponse.json({ message, type: authError.type }, { status: statusCode });
  }
  
  try {
    console.log(`API Route: Creating document in custom DB (${USERS_COLLECTION_ID}) with Appwrite Auth User ID: ${appwriteAuthUser.$id}`);
    
    const newUserDocumentData = {
      email: email, 
      username: username, 
      token_balance: INITIAL_FREE_TOKENS,
      subscription_status: 'trial', 
    };

    const newUserDocument = await databases.createDocument(
      APPWRITE_DATABASE_ID!,
      USERS_COLLECTION_ID!,
      appwriteAuthUser.$id, 
      newUserDocumentData
    );
    console.log("API Route: User document created successfully in custom DB:", newUserDocument.$id);

    return NextResponse.json({ 
        message: 'User registered successfully. Please log in.', 
        userId: appwriteAuthUser.$id,
        customDbDocId: newUserDocument.$id 
    }, { status: 201 });

  } catch (dbError: any) {
    console.error('API Route Error: Error creating user document in custom DB:', dbError);
    // If document creation fails, we should ideally delete the Appwrite Auth user for consistency.
    // This is an advanced step often called a "rollback" or "compensation transaction".
    try {
        console.warn(`API Route: Attempting to delete Appwrite Auth user ${appwriteAuthUser.$id} due to DB document creation failure.`);
        await appwriteAccount.delete(appwriteAuthUser.$id);
        console.warn(`API Route: Successfully deleted Appwrite Auth user ${appwriteAuthUser.$id}.`);
    } catch (deleteError: any) {
        console.error(`API Route CRITICAL Error: Failed to delete Appwrite Auth user ${appwriteAuthUser.$id} after DB error. Manual cleanup required. Delete error:`, deleteError);
    }

    let message = dbError.message || 'Failed to create user profile in database after authentication.';
    let statusCode = dbError.code || 500;
    if (dbError instanceof AppwriteException && dbError.code === 409) {
        message = 'A profile for this user ID already exists in the database.';
        statusCode = 409;
    }
    return NextResponse.json({ message, type: dbError.type }, { status: statusCode });
  }
}
