"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize the admin client (needed for password updates without old password)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

export async function requestPasswordReset(email: string) {
    try {
        // 1. Generate a secure token
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expiry = new Date(Date.now() + 3600000); // 1 hour from now

        // 2. Save token to our custom users table
        const { error } = await supabaseAdmin
            .from("users")
            .update({
                password_reset_token: token,
                password_reset_expires_at: expiry.toISOString()
            })
            .eq("email", email);

        if (error) throw error;

        // 3. Return the token (In production, you'd send this via email)
        return { success: true, token };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function resetPassword(token: string, newPassword: string) {
    try {
        // 1. Find the user with this token
        const { data: user, error: fetchError } = await supabaseAdmin
            .from("users")
            .select("id, password_reset_expires_at")
            .eq("password_reset_token", token)
            .single();

        if (fetchError || !user) throw new Error("Invalid or expired token");

        // 2. Check expiry
        if (new Date(user.password_reset_expires_at) < new Date()) {
            throw new Error("Token has expired");
        }

        // 3. Update password in Supabase Auth
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { password: newPassword }
        );

        if (updateError) throw updateError;

        // 4. Clear the token from our custom table
        await supabaseAdmin
            .from("users")
            .update({
                password_reset_token: null,
                password_reset_expires_at: null
            })
            .eq("id", user.id);

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function createStaffUser(data: {
    email: string;
    full_name: string;
    role: string;
    is_internal: boolean;
    is_creditor: boolean;
    is_debtor: boolean;
}) {
    try {
        // 1. Create the user in Supabase Auth via Admin API
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            email_confirm: true, // Auto-confirm staff emails
            user_metadata: { full_name: data.full_name },
            password: Math.random().toString(36).slice(-12), // Initial random password
        });

        if (authError) throw authError;

        // 2. The trigger handles the public.users insert, but we need to update the flags
        // because the trigger default is is_internal = FALSE
        const { error: updateError } = await supabaseAdmin
            .from("users")
            .update({
                is_internal: data.is_internal,
                is_creditor: data.is_creditor,
                is_debtor: data.is_debtor
            })
            .eq("id", authUser.user.id);

        if (updateError) throw updateError;

        // 3. Assign Role if provided
        if (data.role) {
            const { data: roleRow } = await supabaseAdmin
                .from("roles")
                .select("id")
                .eq("name", data.role)
                .single();

            if (roleRow) {
                await supabaseAdmin
                    .from("user_roles")
                    .insert({ user_id: authUser.user.id, role_id: roleRow.id });
            }
        }

        return { success: true, userId: authUser.user.id };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
