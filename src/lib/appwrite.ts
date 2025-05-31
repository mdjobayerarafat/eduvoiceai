
import { Client, Account, Databases, Storage, Avatars, ID, Permission, Role, Query, AppwriteException } from 'appwrite';

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

const client = new Client();

try {
  client
    .setEndpoint(endpoint.trim())
    .setProject(projectId.trim());
} catch (e: any) {
  throw new Error(
    `Failed to configure Appwrite client. Endpoint used: "${endpoint}", Project ID used: "${projectId}". Original error: ${e.message}. Ensure the endpoint is a_valid_URL (e.g., https://cloud.appwrite.io/v1) and does not have extra characters or typos.`
  );
}

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);
const avatars = new Avatars(client);

export { client, account, databases, storage, avatars, ID, Permission, Role, Query, AppwriteException };

export const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const LECTURES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_LECTURES_COLLECTION_ID!;
