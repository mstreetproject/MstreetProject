import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Use service role for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, full_name, redirectTo } = body;

        // Validate required fields
        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: 'Email and password are required' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { success: false, error: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        // Create Supabase client
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Create user via Supabase Auth
        // The database trigger (on_auth_user_created) will automatically
        // create the corresponding row in public.users
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: full_name || '',
                },
                emailRedirectTo: redirectTo || `${request.nextUrl.origin}/welcome`,
            },
        });

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }

        // Check if user already exists (Supabase returns user but no session)
        if (data.user && !data.session) {
            // User was created but needs email verification
            return NextResponse.json({
                success: true,
                message: 'User created successfully. Please check email for verification.',
                userId: data.user.id,
                requiresVerification: true,
            });
        }

        if (data.user && data.session) {
            // User was created and automatically logged in (if email verification is disabled)
            return NextResponse.json({
                success: true,
                message: 'User created and logged in successfully.',
                userId: data.user.id,
                requiresVerification: false,
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Sign up request processed.',
        });

    } catch (error: any) {
        console.error('Signup API error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
