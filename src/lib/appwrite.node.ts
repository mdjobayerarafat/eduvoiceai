
// This file is intended for server-side Appwrite SDK usage (Node.js environment)
// It should be used in API routes and server components where admin API key is appropriate.
// For client-side usage, continue using src/lib/appwrite.ts which doesn't expose the admin key.

import { Client, Databases, Users, Storage, Avatars, ID, Permission, Role, Query, AppwriteException } from 'node-appwrite';

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY; // Server-side Admin API Key

let clientInitialized = false;
let initializationError: string | null = null;

if (!endpoint || !projectId || !apiKey) {
  let missingVars = [];
  if (!endpoint) missingVars.push("NEXT_PUBLIC_APPWRITE_ENDPOINT");
  if (!projectId) missingVars.push("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  if (!apiKey) missingVars.push("APPWRITE_API_KEY (server-side)");
  initializationError = `Appwrite Node SDK: Missing one or more environment variables: ${missingVars.join(", ")}. Check your .env file or server environment configuration.`;
  console.error(initializationError); // Log error, but don't throw from module level
}

const client = new Client();

if (!initializationError) {
  try {
    client
      .setEndpoint(endpoint!)
      .setProject(projectId!)
      .setKey(apiKey!); // Use Admin API Key for server-side operations
    clientInitialized = true;
    console.log("Appwrite Node.js client initialized successfully for server-side operations.");
  } catch (e: any) {
    initializationError = `Failed to initialize Appwrite Node.js client: ${e.message}`;
    console.error(initializationError, e);
  }
}


// Conditionally export services or throw if not initialized when accessed.
// For simplicity here, we export them, but API routes should check `clientInitialized`
// or handle errors from using a non-initialized client.
const databases = new Databases(client);
const users = new Users(client); // Node SDK Users service
const storage = new Storage(client);
const avatars = new Avatars(client);

export { client, databases, users, storage, avatars, ID, Permission, Role, Query, AppwriteException, clientInitialized, initializationError };

// Re-export collection IDs
export const APPWRITE_DATABASE_ID = "683b4104002d15ee742c";
export const LECTURES_COLLECTION_ID = "683b410f00019daca347";
export const INTERVIEWS_COLLECTION_ID = "683b4b0300073d4d422d"; // interview_reports
export const VOUCHERS_COLLECTION_ID = "683b7afb0005412f9f72";
export const TRANSACTIONS_COLLECTION_ID = "683c0ac00011de2eaee0";
export const USERS_COLLECTION_ID = "683c09550030dd652653"; // Your custom users collection
export const PROFILE_IMAGES_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILE_IMAGES_BUCKET_ID!;

if (!APPWRITE_DATABASE_ID) {
    console.error("CRITICAL from appwrite.node.ts: NEXT_PUBLIC_APPWRITE_DATABASE_ID is not set in the environment. Database operations will fail.");
}
if (!USERS_COLLECTION_ID) { // Though hardcoded, a sanity check
    console.error("CRITICAL from appwrite.node.ts: USERS_COLLECTION_ID is not defined. Custom user operations will fail.");
}
