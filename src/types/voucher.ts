
import type { Models } from 'appwrite';

export interface Voucher extends Models.Document {
  key: string; // The required attribute for the voucher code
  Discount: number; // Changed from discountPercent
  ExpiryDate: string; // Changed from expiryDate, store as ISO string
  MaxUses: number | null; // Changed from maxUses
  
  // Fields primarily for frontend logic or if Appwrite collection allows extra fields
  code: string; // Human-readable voucher code, often same as 'key'
  status: "Active" | "Inactive" | "Expired"; // Determined by frontend logic or stored
  uses: number; // Current usage count
  // userId: string; // Optional: if a voucher is tied to a specific user
}
