
import { NextResponse, NextRequest } from 'next/server';
import { 
  databases, 
  APPWRITE_DATABASE_ID, 
  USERS_COLLECTION_ID, 
  clientInitialized, 
  initializationError,
  Query,
  AppwriteException
} from '@/lib/appwrite.node';
import type { Models } from 'node-appwrite';

interface CustomUserDocument extends Models.Document {
  username: string;
  email: string;
  role?: string; 
  subscription_status?: "trial" | "active" | "cancelled" | "past_due";
  token_balance?: number;
  subscription_end_date?: string;
}

export async function GET() {
  if (!clientInitialized) {
    console.error("/api/admin/users Error: Appwrite client not initialized.", initializationError);
    return NextResponse.json({ message: `Server configuration error: ${initializationError}` }, { status: 500 });
  }

  if (!APPWRITE_DATABASE_ID || !USERS_COLLECTION_ID) {
    console.error("/api/admin/users Error: Appwrite Database or Users Collection ID missing.");
    return NextResponse.json({ message: 'Server configuration error: Database or Collection IDs missing.' }, { status: 500 });
  }

  try {
    console.log(`Fetching users from DB: ${APPWRITE_DATABASE_ID}, Collection: ${USERS_COLLECTION_ID}`);
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.limit(100), Query.orderDesc("$createdAt")] 
    );
    return NextResponse.json(response.documents as CustomUserDocument[]);
  } catch (error: any) {
    console.error('Error fetching users from Appwrite custom collection:', error);
    return NextResponse.json({ message: 'Error fetching users from database', details: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!clientInitialized) {
    return NextResponse.json({ message: `Server configuration error: ${initializationError}` }, { status: 500 });
  }
   if (!APPWRITE_DATABASE_ID || !USERS_COLLECTION_ID) {
    return NextResponse.json({ message: 'Server configuration error: Database or Collection IDs missing.' }, { status: 500 });
  }

  try {
    const { userId, subscription_status } = await req.json();

    if (!userId || !subscription_status) {
      return NextResponse.json({ message: 'Missing userId or subscription_status in request body' }, { status: 400 });
    }

    // Validate subscription_status if needed (e.g., ensure it's one of the allowed values)
    const allowedStatuses = ["trial", "active", "cancelled", "past_due"];
    if (!allowedStatuses.includes(subscription_status)) {
      return NextResponse.json({ message: 'Invalid subscription_status value.' }, { status: 400 });
    }

    const attributesToUpdate = { subscription_status };

    const updatedDocument = await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      USERS_COLLECTION_ID,
      userId,
      attributesToUpdate 
    );
    return NextResponse.json({ message: 'User subscription status updated successfully', data: updatedDocument as CustomUserDocument });

  } catch (error:any) {
    console.error('Error updating user subscription status in custom collection:', error);
    let details = error.message;
    if (error instanceof AppwriteException) {
        details = `Appwrite Error (Code: ${error.code}, Type: ${error.type}): ${error.message}`;
    }
    return NextResponse.json({ message: 'Error updating user subscription status', details }, { status: 500 });
  }
}

    