import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const supabase = await createClient();

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Redirect to login page using the request origin
    const requestUrl = new URL(request.url);
    return NextResponse.redirect(new URL('/login', requestUrl.origin));
}

export async function GET(request: Request) {
    const supabase = await createClient();

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Redirect to login page using the request origin
    const requestUrl = new URL(request.url);
    return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
