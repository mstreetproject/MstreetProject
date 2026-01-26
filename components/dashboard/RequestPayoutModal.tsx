'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/dashboard/useUser';
import { useCurrency } from '@/hooks/useCurrency';
import { X, DollarSign, Send } from 'lucide-react';
import MStreetLoader from '../ui/MStreetLoader';

interface Investment {
    id: string;
    borrower: string;
    amount: number;
    interest_rate: number;
    start_date: string;
    status: string;
}

interface RequestPayoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    investments: Investment[];
}

export default function RequestPayoutModal({ isOpen, onClose, onSuccess, investments }: RequestPayoutModalProps) {
    const { user } = useUser();
    const { formatCurrency } = useCurrency();
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedInvestmentId, setSelectedInvestmentId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    // Filter relevant investments (Active or Matured)
    const eligibleInvestments = investments.filter(inv =>
        ['active', 'matured'].includes(inv.status.toLowerCase())
    );

    const handleInvestmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedInvestmentId(id);

        if (id) {
            const investment = eligibleInvestments.find(inv => inv.id === id);
            if (investment) {
                // Auto-fill amount with the principal amount (user can edit if partial)
                setAmount(investment.amount.toString());
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (!amount || parseFloat(amount) <= 0) {
                throw new Error('Please enter a valid amount');
            }

            if (!selectedInvestmentId) {
                throw new Error('Please select an investment to withdraw from');
            }

            const supabase = createClient();

            const { error: insertError } = await supabase
                .from('payout_requests')
                .insert({
                    creditor_id: user?.id,
                    credit_id: selectedInvestmentId,
                    amount: parseFloat(amount),
                    notes: notes || null,
                    status: 'pending'
                });

            if (insertError) throw insertError;

            onSuccess();
            onClose();
            setAmount('');
            setNotes('');
            setSelectedInvestmentId('');
            alert('Request sent successfully!');
        } catch (err: any) {
            console.error('Error submitting request:', err);
            setError(err.message || 'Failed to submit request');
        } finally {
            setLoading(false);
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
                padding: '28px',
                width: '100%',
                maxWidth: '500px',
                border: '1px solid var(--border-primary)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                        Request Payment
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            Select Investment
                        </label>
                        <select
                            value={selectedInvestmentId}
                            onChange={handleInvestmentChange}
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-primary)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                fontSize: '1rem',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">-- Choose an investment --</option>
                            {eligibleInvestments.map(inv => (
                                <option key={inv.id} value={inv.id}>
                                    {formatCurrency(inv.amount)} - {inv.borrower} ({inv.status})
                                </option>
                            ))}
                        </select>
                        {eligibleInvestments.length === 0 && (
                            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '6px' }}>
                                No eligible investments found suitable for withdrawal.
                            </p>
                        )}
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            Amount to Withdraw
                        </label>
                        <div style={{ position: 'relative' }}>
                            <DollarSign size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 40px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-primary)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Bank details, references..."
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-primary)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-primary)',
                                fontSize: '0.9rem',
                                resize: 'none',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px',
                            background: 'var(--danger-bg)',
                            color: 'var(--danger)',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            fontSize: '0.9rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-primary)',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !selectedInvestmentId}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                color: 'white',
                                fontWeight: 600,
                                cursor: (loading || !selectedInvestmentId) ? 'not-allowed' : 'pointer',
                                opacity: (loading || !selectedInvestmentId) ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            {loading ? <MStreetLoader size={18} color="#ffffff" /> : <Send size={18} />}
                            {loading ? 'Sending...' : 'Send Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
