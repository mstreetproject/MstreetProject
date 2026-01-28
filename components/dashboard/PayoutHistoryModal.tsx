'use client';

import React, { useEffect, useState } from 'react';
import { useCreditorPayouts } from '@/hooks/dashboard/useCreditorPayouts';
import { useCurrency } from '@/hooks/useCurrency';
import { X, Calendar, FileText } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import DataTable from './DataTable';

interface PayoutHistoryModalProps {
    isOpen: boolean;
    creditId: string | null;
    onClose: () => void;
}

export default function PayoutHistoryModal({ isOpen, creditId, onClose }: PayoutHistoryModalProps) {
    const { fetchPayoutsForCredit, loading, error } = useCreditorPayouts();
    const { formatCurrency } = useCurrency();
    const [payouts, setPayouts] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && creditId) {
            fetchPayoutsForCredit(creditId).then(data => setPayouts(data));
        }
    }, [isOpen, creditId, fetchPayoutsForCredit]);

    if (!isOpen) return null;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'interest_only': return 'Interest Payment';
            case 'partial_principal': return 'Partial Withdrawal';
            case 'full_maturity': return 'Maturity Payout';
            case 'early_withdrawal': return 'Early Withdrawal';
            default: return type;
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
        }}>
            <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '16px',
                padding: '32px',
                width: '100%',
                maxWidth: '800px',
                border: '1px solid var(--border-primary)',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={24} />
                        Payout History
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                            <MStreetLoader size={60} />
                        </div>
                    ) : payouts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <p>No payouts recorded for this credit.</p>
                        </div>
                    ) : (
                        <DataTable
                            columns={[
                                {
                                    key: 'created_at',
                                    label: 'Date',
                                    render: (val) => formatDate(val)
                                },
                                {
                                    key: 'payout_type',
                                    label: 'Type',
                                    render: (val, row) => (
                                        <div>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                background: 'var(--bg-tertiary)',
                                                fontSize: '0.85rem'
                                            }}>
                                                {getTypeLabel(val)}
                                            </span>
                                            {row.notes && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                    {row.notes}
                                                </div>
                                            )}
                                        </div>
                                    )
                                },
                                {
                                    key: 'principal_amount',
                                    label: 'Principal',
                                    render: (val) => <div style={{ textAlign: 'right' }}>{formatCurrency(val)}</div>
                                },
                                {
                                    key: 'interest_amount',
                                    label: 'Interest',
                                    render: (val) => <div style={{ textAlign: 'right', color: 'var(--success)' }}>{formatCurrency(val)}</div>
                                },
                                {
                                    key: 'total_amount',
                                    label: 'Total',
                                    render: (val) => <div style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(val)}</div>
                                },
                                {
                                    key: 'processor',
                                    label: 'By',
                                    render: (val) => val?.full_name || 'System'
                                }
                            ]}
                            data={payouts}
                            emptyMessage="No payouts recorded for this credit."
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
