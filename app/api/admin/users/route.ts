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

        const userEmail = email && typeof email === 'string' && email.trim() !== '' ? email.trim() : null;
        const userPassword = password && typeof password === 'string' && password.trim() !== '' ? password.trim() : null;

        if (is_internal && (!userEmail || !userPassword)) {
            return NextResponse.json({ error: 'Email and password are required for internal staff accounts.' }, { status: 400 });
        }

        let userId: string;
        let createdAuthUser: any = null;

        if (userEmail && userPassword) {
            // 2. Create Auth User
            const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: userEmail,
                password: userPassword,
                email_confirm: true, // Auto-confirm for admin-created users
                user_metadata: { full_name }
            });

            if (createError) {
                // Check for duplicate email error
                if (createError.message?.includes('already been registered') ||
                    createError.message?.includes('already exists') ||
                    createError.code === 'email_exists') {
                    return NextResponse.json({
                        error: `A user with email "${userEmail}" already exists. Please use a different email or edit the existing user.`
                    }, { status: 409 });
                }
                throw createError;
            }
            if (!authUser.user) throw new Error('Failed to create user');

            userId = authUser.user.id;
            createdAuthUser = authUser.user;

            // 3. Create/Update Profile (public.users) - use upsert to ensure row exists
            const { error: profileError } = await supabaseAdmin
                .from('users')
                .upsert({
                    id: userId,
                    full_name,
                    email: userEmail,
                    phone: phone || null,
                    address: address || null,
                    is_internal: is_internal || false,
                    is_creditor: is_creditor || false,
                    is_debtor: is_debtor || false,
                    email_activated: true // Admin-created users are auto-confirmed
                }, { onConflict: 'id' });

            if (profileError) {
                console.error('Profile upsert error:', profileError);
                // If profile creation fails, clean up auth user
                await supabaseAdmin.auth.admin.deleteUser(userId);
                throw new Error(`Failed to create user profile: ${profileError.message}`);
            }
        } else {
            // Profile-only creation (no auth user) for creditors/debtors without portal login details
            const { data: profileUser, error: profileError } = await supabaseAdmin
                .from('users')
                .insert({
                    full_name,
                    email: userEmail,
                    phone: phone || null,
                    address: address || null,
                    is_internal: false,
                    is_creditor: is_creditor || false,
                    is_debtor: is_debtor || false,
                    email_activated: false
                })
                .select()
                .single();

            if (profileError) {
                console.error('Profile insert error:', profileError);
                throw new Error(`Failed to create user profile: ${profileError.message}`);
            }

            userId = profileUser.id;
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

        return NextResponse.json({ success: true, user: createdAuthUser || { id: userId, full_name, email: userEmail } });

    } catch (err: any) {
        console.error('Create user error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
