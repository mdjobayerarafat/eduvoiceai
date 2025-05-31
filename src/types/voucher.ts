
import type { Models } from 'appwrite';

export interface Voucher extends Models.Document {
  key: string; 
  Discount: number; 
  ExpiryDate: string; 
  MaxUses: number | null; 
  
  // Fields that might not be part of the core Appwrite schema,
  // or are derived/used by frontend logic.
  // If 'status' (for manual Inactive) or 'uses' (for tracking) are actual
  // Appwrite attributes, they would not be optional here.
  code?: string; // Often same as 'key', can be derived.
  status?: "Active" | "Inactive" | "Expired" | "Used Up"; 
  uses?: number; // For tracking usage; ideally an Appwrite attribute.
}


    