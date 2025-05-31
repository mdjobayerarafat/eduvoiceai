
import type { Models } from 'appwrite';

export interface Voucher extends Models.Document {
  code: string;
  discountPercent: number;
  expiryDate: string; // Store as ISO string, convert to Date object on client
  status: "Active" | "Inactive" | "Expired";
  uses: number;
  maxUses: number | null;
  // userId: string; // Optional: if a voucher is tied to a specific user
}
