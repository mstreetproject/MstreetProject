import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface ImportPlacementRow {
    creditor_name: string;
    email?: string | null;
    phone?: string | null;
    principal: number;
    interest_rate: number;
    tenure_months: number;
    start_date: string;
    status?: string;
}

interface ImportLoanRow {
    debtor_name: string;
    email?: string | null;
    phone?: string | null;
    principal: number;
    interest_rate: number;
    tenure_months: number;
    start_date: string;
    status?: string;
    repayment_cycle?: string;
}

function normalizePlacementStatus(raw: string): string {
    const s = String(raw || '').toLowerCase().trim();
    if (s.includes('mature')) return 'matured';
    if (s.includes('withdraw')) return 'withdrawn';
    if (s.includes('active') || s.includes('performing')) return 'active';
    return 'active';
}

function normalizeLoanStatus(raw: string): string {
    const s = String(raw || '').toLowerCase().trim();
    if (s.includes('provision') || s === 'full_provision') return 'full_provision';
    if (s.includes('non-performing') || s.includes('non_performing') || s.includes('overdue')) return 'non_performing';
    if (s.includes('preliquidated') || s.includes('closed') || s.includes('repaid')) return 'preliquidated';
    if (s.includes('archive')) return 'archived';
    if (s.includes('performing') || s.includes('active')) return 'performing';
    return 'performing';
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        // 1. Verify Admin access
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
        const { importType, rows } = body; // importType: 'placements' | 'loans'

        if (!Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: 'No data rows provided for import' }, { status: 400 });
        }

        let importedCount = 0;
        const errors: string[] = [];

        if (importType === 'placements') {
            for (let i = 0; i < rows.length; i++) {
                const row: ImportPlacementRow = rows[i];
                const name = String(row.creditor_name || '').trim();

                if (!name || !row.principal || !row.interest_rate || !row.tenure_months || !row.start_date) {
                    errors.push(`Row ${i + 1}: Missing required placement fields (name, principal, rate, tenure, or start date).`);
                    continue;
                }

                // Safely extract email and phone as strings
                const email = row.email !== undefined && row.email !== null && String(row.email).trim() !== '' ? String(row.email).trim() : null;
                const phone = row.phone !== undefined && row.phone !== null && String(row.phone).trim() !== '' ? String(row.phone).trim() : null;

                // Find or create Creditor
                let creditorId: string;
                const { data: existingUsers } = await supabaseAdmin
                    .from('users')
                    .select('id, email, phone')
                    .ilike('full_name', name)
                    .limit(1);

                const existingUser = existingUsers?.[0];

                if (existingUser) {
                    creditorId = existingUser.id;
                    const updatePayload: Record<string, any> = { is_creditor: true };
                    if (!existingUser.email && email) updatePayload.email = email;
                    if (!existingUser.phone && phone) updatePayload.phone = phone;
                    
                    await supabaseAdmin.from('users').update(updatePayload).eq('id', creditorId);
                } else {
                    const { data: newUser, error: createError } = await supabaseAdmin
                        .from('users')
                        .insert({
                            full_name: name,
                            email,
                            phone,
                            is_creditor: true,
                            is_debtor: false,
                            is_internal: false
                        })
                        .select('id')
                        .single();

                    if (createError || !newUser) {
                        errors.push(`Row ${i + 1}: Failed to create creditor "${name}": ${createError?.message}`);
                        continue;
                    }
                    creditorId = newUser.id;
                }

                // Calculate End Date
                const startDate = new Date(row.start_date);
                const endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + Number(row.tenure_months));
                const endDateStr = endDate.toISOString().split('T')[0];

                const validStatus = normalizePlacementStatus(row.status || '');

                // Insert Credit
                const { error: insertError } = await supabaseAdmin
                    .from('credits')
                    .insert({
                        creditor_id: creditorId,
                        principal: Number(row.principal),
                        interest_rate: Number(row.interest_rate),
                        tenure_months: Number(row.tenure_months),
                        start_date: row.start_date,
                        end_date: endDateStr,
                        status: validStatus
                    });

                if (insertError) {
                    errors.push(`Row ${i + 1}: Failed to record placement for "${name}": ${insertError.message}`);
                } else {
                    importedCount++;
                }
            }
        } else if (importType === 'loans') {
            for (let i = 0; i < rows.length; i++) {
                const row: ImportLoanRow = rows[i];
                const name = String(row.debtor_name || '').trim();

                if (!name || !row.principal || !row.interest_rate || !row.tenure_months || !row.start_date) {
                    errors.push(`Row ${i + 1}: Missing required loan fields (name, principal, rate, tenure, or start date).`);
                    continue;
                }

                // Safely extract email and phone as strings
                const email = row.email !== undefined && row.email !== null && String(row.email).trim() !== '' ? String(row.email).trim() : null;
                const phone = row.phone !== undefined && row.phone !== null && String(row.phone).trim() !== '' ? String(row.phone).trim() : null;

                // Find or create Debtor
                let debtorId: string;
                const { data: existingUsers } = await supabaseAdmin
                    .from('users')
                    .select('id, email, phone')
                    .ilike('full_name', name)
                    .limit(1);

                const existingUser = existingUsers?.[0];

                if (existingUser) {
                    debtorId = existingUser.id;
                    const updatePayload: Record<string, any> = { is_debtor: true };
                    if (!existingUser.email && email) updatePayload.email = email;
                    if (!existingUser.phone && phone) updatePayload.phone = phone;

                    await supabaseAdmin.from('users').update(updatePayload).eq('id', debtorId);
                } else {
                    const { data: newUser, error: createError } = await supabaseAdmin
                        .from('users')
                        .insert({
                            full_name: name,
                            email,
                            phone,
                            is_creditor: false,
                            is_debtor: true,
                            is_internal: false
                        })
                        .select('id')
                        .single();

                    if (createError || !newUser) {
                        errors.push(`Row ${i + 1}: Failed to create debtor "${name}": ${createError?.message}`);
                        continue;
                    }
                    debtorId = newUser.id;
                }

                const startDate = new Date(row.start_date);
                const endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + Number(row.tenure_months));
                const endDateStr = endDate.toISOString().split('T')[0];

                const validStatus = normalizeLoanStatus(row.status || '');

                const cycleStr = String(row.repayment_cycle || '').toLowerCase().trim();
                const validCycle = ['monthly', 'fortnightly', 'bi_monthly', 'quarterly', 'quadrimester', 'semiannual', 'annually', 'bullet'].includes(cycleStr)
                    ? cycleStr
                    : 'monthly';

                // Insert Loan
                const { error: insertError } = await supabaseAdmin
                    .from('loans')
                    .insert({
                        debtor_id: debtorId,
                        principal: Number(row.principal),
                        interest_rate: Number(row.interest_rate),
                        tenure_months: Number(row.tenure_months),
                        start_date: row.start_date,
                        end_date: endDateStr,
                        status: validStatus,
                        repayment_cycle: validCycle
                    });

                if (insertError) {
                    errors.push(`Row ${i + 1}: Failed to record loan for "${name}": ${insertError.message}`);
                } else {
                    importedCount++;
                }
            }
        } else {
            return NextResponse.json({ error: 'Invalid import type. Use "placements" or "loans".' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            importedCount,
            totalRows: rows.length,
            errors
        });

    } catch (err: any) {
        console.error('Import error:', err);
        return NextResponse.json({ error: err.message || 'Import failed' }, { status: 500 });
    }
}
