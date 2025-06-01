import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query } from 'node-appwrite';

// Appwrite Constants
export const APPWRITE_DATABASE_ID = "683b4104002d15ee742c";
export const LECTURES_COLLECTION_ID = "683b410f00019daca347";
export const INTERVIEWS_COLLECTION_ID = "683b4b0300073d4d422d";
export const VOUCHERS_COLLECTION_ID = "683b7afb0005412f9f72";
export const TRANSACTIONS_COLLECTION_ID = "683c0ac00011de2eaee0";
export const USERS_COLLECTION_ID = "683c09550030dd652653";
export const PROFILE_IMAGES_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILE_IMAGES_BUCKET_ID!;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = body.email;

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'YOUR_APPWRITE_ENDPOINT')
    .setProject(process.env.APPWRITE_PROJECT_ID || 'YOUR_APPWRITE_PROJECT_ID')
    .setKey(process.env.APPWRITE_API_KEY || 'YOUR_APPWRITE_API_KEY');

  const databases = new Databases(client);

  try {
    // Find user by email
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('email', email)]
    );

    if (response.documents.length === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (response.documents.length > 1) {
      console.error(`Multiple users found with email: ${email}`);
      return NextResponse.json({ error: 'Multiple users found with this email.' }, { status: 500 });
    }

    const userDocument = response.documents[0];
    const userId = userDocument.$id;

    // Set subscription end date (1 year from now)
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);

    // Update the user's subscription
    await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      USERS_COLLECTION_ID,
      userId,
      {
        subscription_status: 'activate',
        subscription_end_date: subscriptionEndDate.toISOString(),
        // Optionally update token_balance, etc.
      }
    );

    return NextResponse.json({ message: 'Pro plan activated successfully!' }, { status: 200 });
  } catch (error) {
    console.error('Error activating pro plan:', error);
    return NextResponse.json({ error: 'Failed to activate pro plan.' }, { status: 500 });
  }
}
