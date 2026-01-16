'use client';

import React, { useEffect, useState } from 'react';
import { useCreditorPayouts } from '@/hooks/dashboard/useCreditorPayouts';
import { useCurrency } from '@/hooks/useCurrency';
import { X, Loader2, Calendar, FileText } from 'lucide-react';

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
                            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                        </div>
                    ) : payouts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <p>No payouts recorded for this credit.</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-secondary)', textAlign: 'left' }}>
                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Date</th>
                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Type</th>
                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Principal</th>
                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Interest</th>
                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Total</th>
                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payouts.map((payout) => (
                                    <tr key={payout.id} style={{ borderBottom: '1px solid var(--border-tertiary)' }}>
                                        <td style={{ padding: '12px', color: 'var(--text-primary)' }}>
                                            {formatDate(payout.created_at)}
                                        </td>
                                        <td style={{ padding: '12px', color: 'var(--text-primary)' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                background: 'var(--bg-tertiary)',
                                                fontSize: '0.85rem'
                                            }}>
                                                {getTypeLabel(payout.payout_type)}
                                            </span>
                                            {payout.notes && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                    {payout.notes}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px', color: 'var(--text-primary)', textAlign: 'right' }}>
                                            {formatCurrency(payout.principal_amount)}
                                        </td>
                                        <td style={{ padding: '12px', color: 'var(--success)', textAlign: 'right' }}>
                                            {formatCurrency(payout.interest_amount)}
                                        </td>
                                        <td style={{ padding: '12px', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>
                                            {formatCurrency(payout.total_amount)}
                                        </td>
                                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                                            {payout.processor?.full_name || 'System'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
