"use client";

import dynamic from 'next/dynamic';

const RegisterForm = dynamic(() => import('@/components/auth/RegisterForm').then((mod) => mod.RegisterForm as typeof mod.RegisterForm), { ssr: false });

export default function RegisterClientPage() {
  return <RegisterForm />;
}// In your backend registration API route (src/app/api/custom-auth/register/route.ts)

import { NextResponse } from 'next/server';
import { Query, AppwriteException, APPWRITE_DATABASE_ID, USERS_COLLECTION_ID } from '@/lib/appwrite.node';
import { Client, Databases, Account } from 'node-appwrite'; // Import Account service

// Initialize Appwrite Node SDK client
const appwriteClient = new Client();
appwriteClient
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!); // Your secret Admin API key

const appwriteDatabases = new Databases(appwriteClient);
const appwriteAccount = new Account(appwriteClient); // Initialize Account service for server-side auth

const INITIAL_FREE_TOKENS = 60000;

export async function POST(request: Request) {
  console.log("API Route: /api/custom-auth/register POST request received.");

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


    // 1. Check if user with this email already exists in your custom database
    // (Optional but good practice to avoid duplicate profile documents)
    console.log(`API Route: Checking for existing user in custom DB with email: ${email}`);
    const existingUsers = await appwriteDatabases.listDocuments(
      APPWRITE_DATABASE_ID!,
      USERS_COLLECTION_ID!,
      [Query.equal('email', email), Query.limit(1)]
    );

    if (existingUsers.total > 0) {
      console.log(`API Route: User with email ${email} already exists in custom DB.`);
      // You might also want to check Appwrite Auth for users with this email
      return NextResponse.json({ message: 'User with this email already exists.' }, { status: 409 });
    }
    console.log(`API Route: No existing user found in custom DB for email ${email}.`);

    // 2. Create User in Appwrite Authentication System
    console.log("API Route: Creating user in Appwrite Authentication.");
    const appwriteAuthUser = await appwriteAccount.create(
      'unique()', // Let Appwrite generate a unique ID for the user
      email,
      password,
      username // Optional: Set the user's name in Appwrite Auth
    );
    console.log("API Route: User created in Appwrite Authentication:", appwriteAuthUser.$id);


    // 3. Create Document in Custom Database, linking by Appwrite User ID
    console.log(`API Route: Creating document in custom DB (${USERS_COLLECTION_ID}) with Appwrite User ID: ${appwriteAuthUser.$id}`);

    const newUserDocumentData = {
      // Store data in your custom document
      email: email, // Store email
      username: username, // Store username
      // WARNING: DO NOT STORE PLAINTEXT PASSWORD IN YOUR CUSTOM DATABASE IN PRODUCTION.
      // This is for illustration to match your current login logic's expectation.
      // In a real app, you'd only store a securely generated hash.
      passwordHash: password, // Storing plaintext for demo consistency ONLY

      token_balance: INITIAL_FREE_TOKENS, // Set initial tokens
      subscription_status: 'trial', // Set initial status (ensure this is one of your enum values)
      // Initialize other optional fields from your schema if needed
      // firstName: '',
      // lastName: '',
      // profileImageStorageId: null,
      // subscription_end_date: null,
      // voucher_code: null,
      // voucher_usage_count: 0,
    };

    const newUserDocument = await appwriteDatabases.createDocument(
      APPWRITE_DATABASE_ID!,
      USERS_COLLECTION_ID!,
      appwriteAuthUser.$id, // *** USE THE APPWRITE USER ID AS THE DOCUMENT ID ***
      newUserDocumentData
    );
    console.log("API Route: User document created successfully in custom DB:", newUserDocument.$id);

    // Exclude passwordHash from the response
    const { passwordHash: _, ...userResponseData } = newUserDocument;

    // You might want to return the Appwrite Auth user details or just a success message
    return NextResponse.json({ message: 'User registered and linked successfully.', user: userResponseData, appwriteAuthUserId: appwriteAuthUser.$id }, { status: 201 });

  } catch (error: any) {
    console.error('API Route Error: Error during custom registration API:', error);
    let message = 'An internal server error occurred during registration.';
    let statusCode = 500;
    let fieldErrors: { [key: string]: string } | undefined;

    if (error instanceof AppwriteException) {
        console.error('API Route Error: AppwriteException details:', {
            message: error.message,
            code: error.code,
            type: error.type,
            response: error.response,
        });

        // Handle specific Appwrite errors during user creation (e.g., user already exists in Auth)
        if (error.code === 409 && error.type === 'user_email_already_exists') {
            message = 'A user with this email already exists in Appwrite Authentication.';
            statusCode = 409; // Conflict
            fieldErrors = { email: message };
        } else if (error.code) {
             message = `Appwrite Error (${error.code}): ${error.message}`;
             statusCode = error.code;
        } else {
             message = `Appwrite Error: ${error.message}`;
             statusCode = 500;
        }


    } else if (error.message) {
      message = error.message;
      console.error('API Route Error: Generic error details:', error.message, error.stack);
    } else {
      console.error('API Route Error: Unknown error object:', error);
    }

    // If a user was created in Appwrite Auth but document creation failed,
    // you might want to clean up the Appwrite Auth user here to avoid orphaned users.
    // This adds complexity but ensures data consistency.


    return NextResponse.json({ message, fieldErrors }, { status: statusCode });
  }
}
