import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role to bypass RLS for public guarantor form
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            access_token,
            full_name,
            email,
            phone,
            address,
            relationship,
            employer,
            occupation,
            selfie_url,
            id_document_url
        } = body;

        if (!access_token) {
            return NextResponse.json({ error: 'Missing access token' }, { status: 400 });
        }

        // Verify the token exists
        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('guarantor_submissions')
            .select('id, status')
            .eq('access_token', access_token)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
        }

        if (existing.status === 'submitted' || existing.status === 'verified') {
            return NextResponse.json({ error: 'Form already submitted' }, { status: 400 });
        }

        // Update the guarantor submission
        const { data, error: updateError } = await supabaseAdmin
            .from('guarantor_submissions')
            .update({
                full_name,
                email,
                phone,
                address,
                relationship,
                employer,
                occupation,
                selfie_url,
                id_document_url,
                status: 'submitted',
                submitted_at: new Date().toISOString(),
            })
            .eq('access_token', access_token)
            .select()
            .single();

        if (updateError) {
            console.error('[API][Guarantor] Update error:', updateError);
            return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
        }

        console.log('[API][Guarantor] Successfully updated:', data.id);
        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('[API][Guarantor] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
