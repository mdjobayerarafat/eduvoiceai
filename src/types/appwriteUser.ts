
import type { Models } from 'appwrite';

// This type represents the structure of a user object as returned by users.list()
// or account.get(). We extend Appwrite's Models.User to include labels.
export interface AppwriteUser extends Models.User<Models.Preferences & CustomUserPrefs> {
  labels: string[];
  // Conceptual fields - in a real app, these would come from a linked collection or prefs
  plan?: string; 
  tokensUsed?: number; 
  lastActivity?: string; // This would also be tracked in a separate activity log
}

// Define the shape of custom preferences we expect for profile information
export interface CustomUserPrefs {
  firstName?: string;
  lastName?: string;
  profileImageStorageId?: string;
}
