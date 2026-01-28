'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Banknote, Calendar } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import { createClient } from '@/lib/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';

interface LoanRepayment {
    id: string;
    amount_principal: number;
    amount_interest: number;
    total_amount: number;
    payment_type: 'full' | 'partial';
    notes: string | null;
    created_at: string;
    recorded_by: string | null;
}

interface LoanHistoryModalProps {
    isOpen: boolean;
    loanId: string | null;
    onClose: () => void;
}

export default function LoanHistoryModal({ isOpen, loanId, onClose }: LoanHistoryModalProps) {
    const { formatCurrency } = useCurrency();
    const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && loanId) {
            fetchRepayments();
        }
    }, [isOpen, loanId]);

    const fetchRepayments = async () => {
        if (!loanId) return;

        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { data, error: fetchError } = await supabase
                .from('loan_repayments')
                .select('*')
                .eq('loan_id', loanId)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setRepayments(data || []);
        } catch (err: any) {
            console.error('Error fetching repayments:', err);
            setError(err.message || 'Failed to load repayment history');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Calculate totals
    const totals = repayments.reduce(
        (acc, r) => ({
            principal: acc.principal + Number(r.amount_principal),
            interest: acc.interest + Number(r.amount_interest),
            total: acc.total + Number(r.total_amount || (r.amount_principal + r.amount_interest)),
        }),
        { principal: 0, interest: 0, total: 0 }
    );

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
                maxWidth: '650px',
                border: '1px solid var(--border-primary)',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={24} />
                        Repayment History
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <MStreetLoader size={40} />
                            <p>Loading repayment history...</p>
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
                            <p>{error}</p>
                        </div>
                    ) : repayments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <Banknote size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                            <p>No repayments recorded yet</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary */}
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '20px',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                            }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center' }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Principal Paid</p>
                                        <p style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {formatCurrency(totals.principal)}
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Interest Paid</p>
                                        <p style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                                            {formatCurrency(totals.interest)}
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Paid</p>
                                        <p style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>
                                            {formatCurrency(totals.total)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Repayment List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {repayments.map((repayment, index) => (
                                    <div
                                        key={repayment.id}
                                        style={{
                                            background: 'var(--bg-tertiary)',
                                            borderRadius: '10px',
                                            padding: '16px',
                                            border: '1px solid var(--border-secondary)',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{
                                                    background: 'var(--accent-primary)',
                                                    color: 'white',
                                                    borderRadius: '50%',
                                                    width: '24px',
                                                    height: '24px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                }}>
                                                    {repayments.length - index}
                                                </span>
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '8px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 600,
                                                    background: repayment.payment_type === 'full'
                                                        ? 'rgba(16, 185, 129, 0.15)'
                                                        : 'rgba(168, 85, 247, 0.15)',
                                                    color: repayment.payment_type === 'full'
                                                        ? '#10b981'
                                                        : '#a855f7',
                                                    textTransform: 'uppercase',
                                                }}>
                                                    {repayment.payment_type}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                <Calendar size={14} />
                                                {formatDate(repayment.created_at)}
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '12px' }}>
                                            <div>
                                                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Principal</p>
                                                <p style={{ margin: '2px 0 0', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {formatCurrency(repayment.amount_principal)}
                                                </p>
                                            </div>
                                            <div>
                                                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Interest</p>
                                                <p style={{ margin: '2px 0 0', fontWeight: 600, color: 'var(--accent-primary)' }}>
                                                    {formatCurrency(repayment.amount_interest)}
                                                </p>
                                            </div>
                                            <div>
                                                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total</p>
                                                <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#10b981' }}>
                                                    {formatCurrency(repayment.total_amount || (repayment.amount_principal + repayment.amount_interest))}
                                                </p>
                                            </div>
                                        </div>

                                        {repayment.notes && (
                                            <div style={{ marginTop: '12px', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                    {repayment.notes}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
