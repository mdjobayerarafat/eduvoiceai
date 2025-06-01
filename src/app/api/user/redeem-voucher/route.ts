import { NextResponse } from 'next/server';
import {
    databases,
    ID as AppwriteID,
    Query,
    AppwriteException,
    clientInitialized,
    initializationError,
    APPWRITE_DATABASE_ID,
    USERS_COLLECTION_ID,
    VOUCHERS_COLLECTION_ID,
    TRANSACTIONS_COLLECTION_ID
} from '@/lib/appwrite.node';
import type { Voucher } from '@/types/voucher'; // Assuming Voucher type is defined
import type { Models } from 'appwrite';

const VOUCHER_TOKEN_GRANT_AMOUNT = 60000;

interface UserProfileDocument extends Models.Document {
    token_balance?: number;
    // other user profile fields
}

export async function POST(request: Request) {
    if (!clientInitialized) {
        return NextResponse.json({ message: `Server configuration error: ${initializationError}` }, { status: 500 });
    }

    if (!APPWRITE_DATABASE_ID || !USERS_COLLECTION_ID || !VOUCHERS_COLLECTION_ID || !TRANSACTIONS_COLLECTION_ID) {
        return NextResponse.json({ message: 'Server configuration error: One or more Database/Collection IDs are missing.' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { userId, voucherCode } = body;

        if (!userId || !voucherCode) {
            return NextResponse.json({ message: 'Invalid request: userId and voucherCode are required.' }, { status: 400 });
        }

        // 1. Find the voucher
        let voucherDoc: Voucher;
        try {
            const voucherResponse = await databases.listDocuments(
                APPWRITE_DATABASE_ID,
                VOUCHERS_COLLECTION_ID,
                [Query.equal('key', voucherCode.toUpperCase()), Query.limit(1)]
            );

            if (voucherResponse.total === 0) {
                return NextResponse.json({ message: 'Voucher code not found.' }, { status: 404 });
            }
            voucherDoc = voucherResponse.documents[0] as Voucher;
        } catch (fetchVoucherError: any) {
            console.error('Error fetching voucher:', fetchVoucherError);
            return NextResponse.json({ message: 'Error validating voucher.', details: fetchVoucherError.message }, { status: 500 });
        }

        // 2. Validate the voucher
        if (voucherDoc.status === "Inactive") { // If you implement a manual 'status' field
             return NextResponse.json({ message: 'This voucher is currently inactive.' }, { status: 403 });
        }
        if (new Date(voucherDoc.ExpiryDate) < new Date()) {
            return NextResponse.json({ message: 'This voucher has expired.' }, { status: 403 });
        }
        const currentUses = voucherDoc.uses ?? 0;
        if (voucherDoc.MaxUses !== null && currentUses >= voucherDoc.MaxUses) {
            return NextResponse.json({ message: 'This voucher has reached its maximum usage limit.' }, { status: 403 });
        }

        // 3. Get user's current token balance
        let userProfileDoc: UserProfileDocument;
        try {
            userProfileDoc = await databases.getDocument(APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, userId) as UserProfileDocument;
        } catch (fetchUserError: any) {
            if (fetchUserError instanceof AppwriteException && fetchUserError.code === 404) {
                return NextResponse.json({ message: `User profile with ID ${userId} not found.` }, { status: 404 });
            }
            console.error('Error fetching user profile:', fetchUserError);
            return NextResponse.json({ message: 'Error fetching user data.', details: fetchUserError.message }, { status: 500 });
        }
        const currentTokenBalance = userProfileDoc.token_balance ?? 0;
        const newTokenBalance = currentTokenBalance + VOUCHER_TOKEN_GRANT_AMOUNT;

        // 4. Update user's token balance
        try {
            await databases.updateDocument(APPWRITE_DATABASE_ID, USERS_COLLECTION_ID, userId, {
                token_balance: newTokenBalance
            });
        } catch (updateUserError: any) {
            console.error('Error updating user token balance:', updateUserError);
            return NextResponse.json({ message: 'Error updating token balance.', details: updateUserError.message }, { status: 500 });
        }

        // 5. Update voucher usage count
        try {
            await databases.updateDocument(APPWRITE_DATABASE_ID, VOUCHERS_COLLECTION_ID, voucherDoc.$id, {
                uses: currentUses + 1
            });
        } catch (updateVoucherError: any) {
            console.warn('Failed to update voucher usage count, but tokens were granted. Manual check might be needed for voucher:', voucherDoc.$id, updateVoucherError);
            // Decide if this is a critical failure. For now, user got tokens, so proceed but log.
        }

        // 6. Log the transaction
        const transactionDescription = `Redeemed voucher ${voucherCode} for ${VOUCHER_TOKEN_GRANT_AMOUNT} tokens.`;
        try {
            await databases.createDocument(
                APPWRITE_DATABASE_ID,
                TRANSACTIONS_COLLECTION_ID,
                AppwriteID.unique(),
                {
                    user_id: userId,
                    type: 'voucher_redeemed',
                    token_amount_changed: VOUCHER_TOKEN_GRANT_AMOUNT,
                    new_balance: newTokenBalance,
                    transaction_description: transactionDescription,
                    timestamp: new Date().toISOString(),
                    reference_id: voucherDoc.$id // Optional: link to voucher document
                }
            );
        } catch (logError) {
            console.warn('Failed to log voucher redemption transaction:', logError);
        }

        return NextResponse.json({
            message: `Voucher redeemed successfully! ${VOUCHER_TOKEN_GRANT_AMOUNT.toLocaleString()} tokens added.`,
            newTokenBalance,
            tokensAdded: VOUCHER_TOKEN_GRANT_AMOUNT
        });

    } catch (error: any) {
        console.error('Error in redeem-voucher API route:', error);
        return NextResponse.json({ message: 'An internal server error occurred.', details: error.message }, { status: 500 });
    }
}