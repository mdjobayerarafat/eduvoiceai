
import * as Appwrite from 'appwrite';

// For debugging: Log the imported Appwrite object to see its structure
console.log('Appwrite SDK imported:', Appwrite);
if (Appwrite) {
  console.log('Appwrite.Client exists:', typeof Appwrite.Client !== 'undefined');
  console.log('Appwrite.Account exists:', typeof Appwrite.Account !== 'undefined');
  console.log('Appwrite.Databases exists:', typeof Appwrite.Databases !== 'undefined');
  console.log('Appwrite.Storage exists:', typeof Appwrite.Storage !== 'undefined');
  console.log('Appwrite.Avatars exists:', typeof Appwrite.Avatars !== 'undefined');
  console.log('Appwrite.Users exists:', typeof Appwrite.Users !== 'undefined'); // Diagnostic
  console.log('Appwrite.ID exists:', typeof Appwrite.ID !== 'undefined');
}


const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (typeof endpoint !== 'string' || endpoint.trim() === '') {
  throw new Error(
    `NEXT_PUBLIC_APPWRITE_ENDPOINT is not a valid string or is empty. Value: "${endpoint}", Type: ${typeof endpoint}. Please check your .env file and ensure your Next.js server has been restarted.`
  );
}
if (typeof projectId !== 'string' || projectId.trim() === '') {
  throw new Error(
    `NEXT_PUBLIC_APPWRITE_PROJECT_ID is not a valid string or is empty. Value: "${projectId}", Type: ${typeof projectId}. Please check your .env file and ensure your Next.js server has been restarted.`
  );
}

const client = new Appwrite.Client();

try {
  client
    .setEndpoint(endpoint.trim())
    .setProject(projectId.trim());
} catch (e: any) {
  throw new Error(
    `Failed to configure Appwrite client. Endpoint used: "${endpoint}", Project ID used: "${projectId}". Original error: ${e.message}. Ensure the endpoint is a valid URL (e.g., https://cloud.appwrite.io/v1) and does not have extra characters or typos.`
  );
}

const account = new Appwrite.Account(client);
const databases = new Appwrite.Databases(client);
const storage = new Appwrite.Storage(client);
const avatars = new Appwrite.Avatars(client);

let usersServiceInstance;
if (Appwrite.Users) {
  usersServiceInstance = new Appwrite.Users(client);
  console.log('Appwrite.Users service successfully instantiated.');
} else {
  console.error('CRITICAL: Appwrite.Users constructor is not found on the imported Appwrite SDK object. The Users service cannot be initialized.');
  usersServiceInstance = undefined; 
}


// Re-export Appwrite utilities for convenience
const ID = Appwrite.ID;
const Permission = Appwrite.Permission;
const Role = Appwrite.Role;
const Query = Appwrite.Query;
const AppwriteException = Appwrite.AppwriteException;

// Export the instance as 'users'
export { client, account, databases, storage, avatars, usersServiceInstance as users, ID, Permission, Role, Query, AppwriteException };


export const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

// Using specific Collection IDs provided by the user
export const LECTURES_COLLECTION_ID = "683b410f00019daca347";
export const INTERVIEWS_COLLECTION_ID = "683b4b0300073d4d422d";
export const VOUCHERS_COLLECTION_ID = "683b7afb0005412f9f72";
export const TRANSACTIONS_COLLECTION_ID = "683c0ac00011de2eaee0";
// Note: The 'users' collection ID '683c09550030dd652653' is noted but not directly used by core auth/token logic,
// which uses user prefs. It can be used for other custom user data.

export const PROFILE_IMAGES_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILE_IMAGES_BUCKET_ID!;


if (typeof PROFILE_IMAGES_BUCKET_ID !== 'string' || PROFILE_IMAGES_BUCKET_ID.trim() === '') {
  console.warn( 
    `PROFILE_IMAGES_BUCKET_ID is not a valid string or is empty. Value: "${PROFILE_IMAGES_BUCKET_ID}", Type: ${typeof PROFILE_IMAGES_BUCKET_ID}. Please check your .env file and ensure your Next.js server has been restarted. Profile image functionality will be affected.`
  );
}

// Ensuring core collection IDs are valid before certain operations
if (!LECTURES_COLLECTION_ID || !INTERVIEWS_COLLECTION_ID || !VOUCHERS_COLLECTION_ID || !TRANSACTIONS_COLLECTION_ID) {
    console.error("One or more critical Appwrite Collection IDs are missing. Please check src/lib/appwrite.ts and ensure they are correctly set.");
}
if (!APPWRITE_DATABASE_ID) {
    console.error("APPWRITE_DATABASE_ID is missing. Please set NEXT_PUBLIC_APPWRITE_DATABASE_ID in your .env file.");
}

