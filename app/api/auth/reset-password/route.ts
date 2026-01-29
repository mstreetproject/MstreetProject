import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { password, access_token, refresh_token } = body;

        // Validate required fields
        if (!password) {
            return NextResponse.json(
                { success: false, error: 'Password is required' },
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

        // If tokens are provided, set the session first
        // (This is needed when calling from a different domain than where the reset link was clicked)
        if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
                access_token,
                refresh_token,
            });

            if (sessionError) {
                return NextResponse.json(
                    { success: false, error: 'Invalid or expired reset token' },
                    { status: 401 }
                );
            }
        }

        // Update the user's password
        const { error } = await supabase.auth.updateUser({
            password: password,
        });

        if (error) {
            // Handle specific error cases
            if (error.message.includes('not authenticated')) {
                return NextResponse.json(
                    { success: false, error: 'Session expired. Please request a new password reset.' },
                    { status: 401 }
                );
            }
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Password updated successfully.',
        });

    } catch (error: any) {
        console.error('Reset password API error:', error);
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
