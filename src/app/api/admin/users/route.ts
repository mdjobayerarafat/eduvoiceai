
import { NextResponse, NextRequest } from 'next/server';
import { 
  databases, 
  APPWRITE_DATABASE_ID, 
  USERS_COLLECTION_ID, 
  clientInitialized, 
  initializationError,
  Query
} from '@/lib/appwrite.node';
import type { Models } from 'node-appwrite';

// Define a type for the documents expected from USERS_COLLECTION_ID
// This should align with your actual collection attributes
interface CustomUserDocument extends Models.Document {
  username: string;
  email: string;
  role?: string; // Assuming a 'role' attribute for admin status
  subscription_status?: string;
  token_balance?: number;
  // Add any other relevant fields from your USERS_COLLECTION_ID
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
      [Query.limit(100)] // Add pagination or increase limit as needed
    );
    // Return the documents directly
    return NextResponse.json(response.documents as CustomUserDocument[]);
  } catch (error: any) {
    console.error('Error fetching users from Appwrite custom collection:', error);
    return NextResponse.json({ message: 'Error fetching users from database', details: error.message }, { status: 500 });
  }
}

// The PUT request for updating user attributes like 'role' or 'status'
// would typically involve updating the document in USERS_COLLECTION_ID.
// This is more complex and requires careful consideration of what attributes
// can be updated and by whom. For now, the PUT endpoint is kept simple.
export async function PUT(req: NextRequest) {
  if (!clientInitialized) {
    return NextResponse.json({ message: `Server configuration error: ${initializationError}` }, { status: 500 });
  }
   if (!APPWRITE_DATABASE_ID || !USERS_COLLECTION_ID) {
    return NextResponse.json({ message: 'Server configuration error: Database or Collection IDs missing.' }, { status: 500 });
  }

  try {
    const { userId, attributesToUpdate } = await req.json();

    if (!userId || !attributesToUpdate) {
      return NextResponse.json({ message: 'Missing userId or attributesToUpdate in request body' }, { status: 400 });
    }

    // Example: updating a 'role' attribute in the USERS_COLLECTION_ID
    // const updatedDocument = await databases.updateDocument(
    //   APPWRITE_DATABASE_ID,
    //   USERS_COLLECTION_ID,
    //   userId,
    //   attributesToUpdate // e.g., { role: 'admin' }
    // );
    // return NextResponse.json({ message: 'User document updated successfully', data: updatedDocument });

    // For now, returning a conceptual message as full update logic is not implemented here.
    // The frontend "Make Admin" is also conceptual.
    return NextResponse.json({ message: 'User update endpoint called (requires specific implementation to update custom DB)' }, { status: 202 });

  } catch (error:any) {
    console.error('Error updating user in custom collection:', error);
    return NextResponse.json({ message: 'Error updating user in database', details: error.message }, { status: 500 });
  }
}
