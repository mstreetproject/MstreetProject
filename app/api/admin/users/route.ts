import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Create a Admin client with Service Role Key
// meaningful for creating users in auth.users without session constraints
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function POST(request: Request) {
    try {
        // 1. Verify Requesting User is Admin
        const cookieSupabase = await createServerClient();
        const { data: { user: currentUser }, error: authError } = await cookieSupabase.auth.getUser();

        if (authError || !currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch User Roles to confirm Admin/Manager status
        const { data: roles } = await cookieSupabase
            .from('user_roles')
            .select('role:roles(name)')
            .eq('user_id', currentUser.id);

        const isAdmin = roles?.some((r: any) =>
            ['super_admin', 'finance_manager', 'ops_officer'].includes(r.role?.name)
        );

        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const {
            email,
            password,
            full_name,
            phone,
            address,
            is_internal,
            is_creditor,
            is_debtor,
            role
        } = body;

        // 2. Create Auth User
        const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm for admin-created users
            user_metadata: { full_name }
        });

        if (createError) throw createError;
        if (!authUser.user) throw new Error('Failed to create user');

        const userId = authUser.user.id;

        // 3. Update Profile (public.users)
        // calculated pause to ensure trigger has fired? 
        // Actually, trigger fires synchronously usually. But to be safe, we can use upsert or update.
        // We use supabaseAdmin to bypass RLS for this initial setup if needed, 
        // though the Trigger usually sets the owner. But since we are Admin, we might need to update fields the trigger didn't set.

        const { error: profileError } = await supabaseAdmin
            .from('users')
            .update({
                full_name,
                phone,
                address,
                is_internal,
                is_creditor,
                is_debtor,
                // Ensure email is set/synced
                email
            })
            .eq('id', userId);

        if (profileError) {
            // If update fails (e.g. trigger didn't run yet?), try upsert?
            // But trigger SHOULD run.
            console.error('Profile update error:', profileError);
            // Fallback: manually insert if not exists (upsert)
            const { error: upsertError } = await supabaseAdmin
                .from('users')
                .upsert({
                    id: userId,
                    full_name,
                    email,
                    phone,
                    address,
                    is_internal,
                    is_creditor,
                    is_debtor
                });
            if (upsertError) throw upsertError;
        }

        // 4. Assign Role (if internal)
        if (is_internal && role) {
            const { data: roleData, error: roleError } = await supabaseAdmin
                .from('roles')
                .select('id')
                .eq('name', role)
                .single();

            if (roleError) throw new Error(`Invalid role: ${role}`);

            const { error: linkError } = await supabaseAdmin
                .from('user_roles')
                .insert({
                    user_id: userId,
                    role_id: roleData.id
                });

            if (linkError) throw linkError;
        }

        return NextResponse.json({ success: true, user: authUser.user });

    } catch (err: any) {
        console.error('Create user error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
