import React from 'react';
import { AlertCircle, List } from 'lucide-react';
import DataTable, { Column } from '../DataTable';
import { RepaymentTransaction } from '@/types/dashboard';
import styles from '../CreateCreditForm.module.css';

interface TransactionHistoryTableProps {
    loan: any;
    transactions: RepaymentTransaction[];
    loadingTransactions: boolean;
    isSuperAdmin: boolean;
    submitting: boolean;
    formatCurrency: (val: number) => string;
    handleRevertTransaction: (tx: RepaymentTransaction) => Promise<void>;
}

export default function TransactionHistoryTable({
    loan,
    transactions,
    loadingTransactions,
    isSuperAdmin,
    submitting,
    formatCurrency,
    handleRevertTransaction
}: TransactionHistoryTableProps) {
    if (!loan) return null;

    const transactionColumns: Column[] = [
        {
            key: 'created_at',
            label: 'Date',
            render: (val: any) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{new Date(val).toLocaleDateString()}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(val).toLocaleTimeString()}</span>
                </div>
            )
        },
        {
            key: 'total_paid',
            label: 'Amount Paid',
            render: (val: any, row: any) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCurrency(val)}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {formatCurrency(row.principal_paid)} P + {formatCurrency(row.interest_paid)} I
                    </span>
                </div>
            )
        },
        {
            key: 'payment_mode',
            label: 'Mode',
            render: (val: any) => (
                <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-secondary)'
                }}>
                    {val?.replace('_', ' ') || 'Custom'}
                </span>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (val: any, row: any) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background: val === 'successful' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: val === 'successful' ? '#10b981' : '#ef4444',
                        border: `1px solid ${val === 'successful' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        display: 'inline-block',
                        width: 'max-content'
                    }}>
                        {val}
                    </span>
                    {val === 'reverted' && row.reverter && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            by {row.reverter.full_name}
                        </span>
                    )}
                </div>
            )
        },
        {
            key: 'recorder',
            label: 'Recorded By',
            render: (val: any) => val?.full_name || 'System'
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (_: any, row: any) => {
                if (row.status === 'reverted') return <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Reverted</span>;
                if (!isSuperAdmin) return null;
                
                return (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRevertTransaction(row);
                        }}
                        disabled={submitting}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            color: '#ef4444',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    >
                        <AlertCircle size={14} />
                        Revert
                    </button>
                );
            }
        }
    ];

    return (
        <div style={{ marginTop: '40px', borderTop: '1px solid var(--border-secondary)', paddingTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <List size={20} style={{ color: 'var(--accent-primary)' }} />
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Transaction History for {loan.debtor?.full_name}
                    </h4>
                </div>
            </div>

            {transactions.length === 0 && !loadingTransactions ? (
                <div className={styles.emptyState} style={{ padding: '30px' }}>
                    <List size={40} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No payments recorded for this loan yet.</p>
                </div>
            ) : (
                <DataTable
                    columns={transactionColumns}
                    data={transactions}
                    loading={loadingTransactions}
                    emptyMessage="No transactions found"
                    paginated
                    defaultPageSize={5}
                />
            )}
        </div>
    );
}
