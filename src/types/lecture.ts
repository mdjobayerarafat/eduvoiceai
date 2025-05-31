
import type { Models } from 'appwrite';

// Extends Appwrite's Document type for built-in fields like $id, $createdAt etc.
export interface Lecture extends Models.Document {
  userId: string;
  topic: string;
  lectureContent: string;
  summary: string;
  youtubeVideoLinks?: string[]; // Optional as it might not always be present
}
