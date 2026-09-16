import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        // 1. Verify Requesting User is Admin
        const cookieSupabase = await createServerClient();
        const { data: { user: currentUser }, error: authError } = await cookieSupabase.auth.getUser();

        if (authError || !currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
        const { userId, email, password, action } = body; // action: 'send_invite' | 'set_password'

        if (!userId || !email) {
            return NextResponse.json({ error: 'User ID and email address are required.' }, { status: 400 });
        }

        const targetEmail = String(email).trim().toLowerCase();

        // 2. Fetch existing profile from public.users
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (profileError || !userProfile) {
            return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
        }

        // Update email on public.users if changed
        if (userProfile.email !== targetEmail) {
            await supabaseAdmin
                .from('users')
                .update({ email: targetEmail })
                .eq('id', userId);
        }

        // 3. Check if user already exists in auth.users by email
        const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
        let authUser = existingAuthUsers?.users?.find(u => u.id === userId || u.email?.toLowerCase() === targetEmail);

        const origin = new URL(request.url).origin;
        const redirectTo = `${origin}/reset-password`;

        if (action === 'set_password') {
            if (!password || String(password).trim().length < 6) {
                return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
            }

            const cleanPassword = String(password).trim();

            if (authUser) {
                // Update password for existing auth user
                const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
                    password: cleanPassword,
                    email_confirm: true
                });
                if (updateErr) throw updateErr;
            } else {
                // Create auth user with provided ID or linked ID
                const { data: newAuth, error: createErr } = await supabaseAdmin.auth.admin.createUser({
                    email: targetEmail,
                    password: cleanPassword,
                    email_confirm: true,
                    user_metadata: { full_name: userProfile.full_name }
                });
                if (createErr) throw createErr;
                authUser = newAuth.user;

                // Update public.users to link or sync ID
                await supabaseAdmin
                    .from('users')
                    .update({ email_activated: true })
                    .eq('id', userId);
            }

            return NextResponse.json({
                success: true,
                message: `Portal access granted and password set for ${userProfile.full_name}! They can now log in at /login.`
            });

        } else {
            // action === 'send_invite'
            let actionLink = '';

            if (authUser) {
                // 1. Dispatch email automatically via Supabase SMTP (Resend integration)
                const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(targetEmail, { redirectTo });
                if (resetErr) {
                    console.warn('Supabase reset email send warning:', resetErr.message);
                }

                // 2. Generate link for manual copy backup
                const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
                    type: 'recovery',
                    email: targetEmail,
                    options: { redirectTo }
                });
                actionLink = linkData?.properties?.action_link || '';
            } else {
                // 1. Send invite email automatically via Supabase SMTP (Resend integration)
                const { data: inviteRes, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(targetEmail, {
                    redirectTo,
                    data: { full_name: userProfile.full_name }
                });

                if (inviteErr) {
                    console.warn('inviteUserByEmail warning, falling back to manual create:', inviteErr.message);
                    // Fallback to createUser + recovery email
                    const { data: fallbackAuth, error: fbErr } = await supabaseAdmin.auth.admin.createUser({
                        email: targetEmail,
                        password: `Tmp#${Math.random().toString(36).slice(-8)}`,
                        email_confirm: true,
                        user_metadata: { full_name: userProfile.full_name }
                    });
                    if (fbErr) throw fbErr;

                    // Trigger reset email
                    await supabaseAdmin.auth.resetPasswordForEmail(targetEmail, { redirectTo });

                    const { data: recData } = await supabaseAdmin.auth.admin.generateLink({
                        type: 'recovery',
                        email: targetEmail,
                        options: { redirectTo }
                    });
                    actionLink = recData?.properties?.action_link || '';
                } else {
                    // Generate link for manual copy backup
                    const { data: inviteData } = await supabaseAdmin.auth.admin.generateLink({
                        type: 'invite',
                        email: targetEmail,
                        options: {
                            redirectTo,
                            data: { full_name: userProfile.full_name }
                        }
                    });
                    actionLink = inviteData?.properties?.action_link || '';
                }
            }

            // Update email_activated status
            await supabaseAdmin
                .from('users')
                .update({ email_activated: true })
                .eq('id', userId);

            return NextResponse.json({
                success: true,
                message: `Portal activation email sent to ${targetEmail}! (Advise the user to check their inbox and spam/junk folder).`,
                actionLink
            });
        }

    } catch (err: any) {
        console.error('Grant access error:', err);
        return NextResponse.json({ error: err.message || 'Failed to grant portal access.' }, { status: 500 });
    }
}
