
import * as Appwrite from 'appwrite';

// For debugging: Log the imported Appwrite object to see its structure
console.log('Appwrite SDK imported:', Appwrite);
if (Appwrite) {
  console.log('Appwrite.Users exists:', typeof Appwrite.Users !== 'undefined');
  console.log('Appwrite.Client exists:', typeof Appwrite.Client !== 'undefined');
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
  // To prevent further errors, we export 'undefined' but this indicates a fundamental problem.
  usersServiceInstance = undefined; 
}

const ID = Appwrite.ID;
const Permission = Appwrite.Permission;
const Role = Appwrite.Role;
const Query = Appwrite.Query;
const AppwriteException = Appwrite.AppwriteException;

// Export the instance as 'users'
export { client, account, databases, storage, avatars, usersServiceInstance as users, ID, Permission, Role, Query, AppwriteException };

export const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const LECTURES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_LECTURES_COLLECTION_ID!;
export const INTERVIEWS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_INTERVIEWS_COLLECTION_ID!;

export const VOUCHERS_COLLECTION_ID = process.env.NEXT_PUBLIC_VOUCHERS_COLLECTION_ID;

if (typeof VOUCHERS_COLLECTION_ID !== 'string' || VOUCHERS_COLLECTION_ID.trim() === '') {
  throw new Error(
    `VOUCHERS_COLLECTION_ID is not a valid string or is empty. Value: "${VOUCHERS_COLLECTION_ID}", Type: ${typeof VOUCHERS_COLLECTION_ID}. Please check your .env file and ensure your Next.js server has been restarted.`
  );
}
