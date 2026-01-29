'use client';

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export type ActivityAction =
    // Auth actions
    | 'LOGIN'
    | 'LOGOUT'
    // Loan actions
    | 'CREATE_LOAN'
    | 'UPDATE_LOAN'
    | 'APPROVE_LOAN'
    | 'REJECT_LOAN'
    | 'DELETE_LOAN'
    | 'ARCHIVE_LOAN'
    | 'RESTORE_LOAN'
    // Credit actions
    | 'CREATE_CREDIT'
    | 'UPDATE_CREDIT'
    | 'RECORD_INVESTMENT'
    | 'ARCHIVE_CREDIT'
    | 'RESTORE_CREDIT'
    | 'DELETE_CREDIT'
    // Payout/Repayment actions
    | 'RECORD_PAYOUT'
    | 'RECORD_REPAYMENT'
    // User/Debtor actions
    | 'CREATE_USER'
    | 'UPDATE_USER'
    | 'DELETE_USER'
    | 'APPROVE_USER'
    | 'REJECT_USER'
    | 'CREATE_DEBTOR'
    | 'UPDATE_DEBTOR'
    // Expense actions
    | 'CREATE_EXPENSE'
    | 'UPDATE_EXPENSE'
    | 'DELETE_EXPENSE'
    // Loan Request actions
    | 'CREATE_LOAN_REQUEST'
    | 'UPDATE_LOAN_REQUEST'
    | 'APPROVE_LOAN_REQUEST'
    | 'REJECT_LOAN_REQUEST'
    | 'ARCHIVE_LOAN_REQUEST'
    | 'RESTORE_LOAN_REQUEST'
    | 'DELETE_LOAN_REQUEST'
    // Payment Upload actions
    | 'CREATE_PAYMENT_UPLOAD'
    | 'APPROVE_PAYMENT_UPLOAD'
    | 'REJECT_PAYMENT_UPLOAD'
    | 'ARCHIVE_PAYMENT_UPLOAD'
    | 'RESTORE_PAYMENT_UPLOAD'
    | 'DELETE_PAYMENT_UPLOAD'
    // Document actions
    | 'SIGN_DOCUMENT'
    | 'UPLOAD_DOCUMENT';

export type EntityType = 'user' | 'loan' | 'credit' | 'payout' | 'system' | 'expense' | 'loan_request' | 'payment_upload' | 'loan_document';

export function useActivityLog() {
    const logActivity = useCallback(async (
        action: ActivityAction,
        entityType: EntityType,
        entityId: string,
        details: Record<string, any> = {}
    ) => {
        try {
            const supabase = createClient();

            // Use the RPC function if available for simpler permissions handling
            // or fall back to direct insert if RPC not used
            const { error } = await supabase.rpc('log_activity', {
                p_action: action,
                p_entity_type: entityType,
                p_entity_id: entityId,
                p_details: details
            });

            if (error) {
                console.error('Failed to log activity:', error);
                // We typically don't block the UI if logging fails, just report it
            }
        } catch (err) {
            console.error('Error logging activity:', err);
        }
    }, []);

    return { logActivity };
}
