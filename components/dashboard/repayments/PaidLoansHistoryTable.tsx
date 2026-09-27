import React, { useMemo } from 'react';
import { CheckCircle } from 'lucide-react';
import DataTable, { Column } from '../DataTable';

interface PaidLoansHistoryTableProps {
    paidLoans: any[];
    formatCurrency: (val: number) => string;
}

export default function PaidLoansHistoryTable({ paidLoans, formatCurrency }: PaidLoansHistoryTableProps) {
    const flattenedPaidLoans = useMemo(() => {
        return paidLoans.map(l => ({
            ...l,
            debtor_name: l.debtor?.full_name || 'N/A',
            debtor_email: l.debtor?.email || 'N/A',
            ref_no: l.reference_no || l.id.slice(0, 8),
            formatted_principal: formatCurrency(l.principal),
            formatted_repaid_date: new Date(l.updated_at || Date.now()).toLocaleDateString()
        }));
    }, [paidLoans, formatCurrency]);

    const repaidColumns: Column[] = [
        {
            key: 'debtor_name',
            label: 'Debtor',
            render: (val: any, row: any) => (
                <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{val}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.debtor_email}</div>
                </div>
            )
        },
        {
            key: 'ref_no',
            label: 'Ref #',
        },
        {
            key: 'principal',
            label: 'Principal',
            render: (val: any) => <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(val)}</span>
        },
        {
            key: 'formatted_repaid_date',
            label: 'Repaid On',
        },
        {
            key: 'status',
            label: 'Status',
            render: (val: any) => (
                <span style={{
                    fontSize: '0.7rem',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    textTransform: 'uppercase',
                    fontWeight: 700
                }}>Repaid</span>
            )
        }
    ];

    if (flattenedPaidLoans.length === 0) return null;

    return (
        <div style={{ marginTop: '40px', borderTop: '1px solid var(--border-secondary)', paddingTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <CheckCircle size={20} style={{ color: '#10b981' }} />
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Fully Repaid Loans History
                </h4>
            </div>
            
            <DataTable
                columns={repaidColumns}
                data={flattenedPaidLoans}
                emptyMessage="No fully repaid loans found"
                paginated
                defaultPageSize={10}
            />
        </div>
    );
}
