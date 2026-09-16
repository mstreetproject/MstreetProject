import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const supabase = await createClient();

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Redirect to the root (admin.mstreetsfinance.com)
    // Status 303 changes the HTTP method from POST back to GET to prevent 405 errors
    const requestUrl = new URL(request.url);
    return NextResponse.redirect(new URL('/', requestUrl.origin), { status: 303 });
}

export async function GET(request: Request) {
    const supabase = await createClient();

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Redirect to the root (admin.mstreetsfinance.com)
    // Status 303 changes the HTTP method to GET to prevent 405 errors
    const requestUrl = new URL(request.url);
    return NextResponse.redirect(new URL('/', requestUrl.origin), { status: 303 });
}
