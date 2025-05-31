
import type { Models } from 'appwrite';

export interface Voucher extends Models.Document {
  key: string; // The required attribute for the voucher code, matching Appwrite collection
  code: string; // Human-readable voucher code, can be same as key or different if needed
  discountPercent: number;
  expiryDate: string; // Store as ISO string, convert to Date object on client
  status: "Active" | "Inactive" | "Expired";
  uses: number;
  maxUses: number | null;
  // userId: string; // Optional: if a voucher is tied to a specific user
}
