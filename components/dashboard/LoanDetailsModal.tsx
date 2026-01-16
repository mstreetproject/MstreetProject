'use client';

import React, { useMemo } from 'react';
import { X, Calendar, DollarSign, Clock, Hash, Percent, User, ArrowRight } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

interface Loan {
    id: string;
    debtor_id: string;
    principal: number;
    interest_rate: number;
    tenure_months: number;
    start_date: string;
    end_date: string;
    status: string;
    debtor?: {
        full_name: string;
        email: string;
        phone?: string;
    };
}

interface LoanDetailsModalProps {
    isOpen: boolean;
    loan: Loan | null;
    onClose: () => void;
}

export default function LoanDetailsModal({ isOpen, loan, onClose }: LoanDetailsModalProps) {
    const { formatCurrency } = useCurrency();

    // Financial Calculations
    const financials = useMemo(() => {
        if (!loan) return null;

        const principal = loan.principal || 0;
        const rate = loan.interest_rate || 0;
        const tenureMonths = loan.tenure_months || 0;
        const startDate = new Date(loan.start_date);
        const today = new Date();

        // 1. Expected Interest on Maturity (Total Interest)
        // Formula: Principal * (Rate/100) * (Tenure in Years) -> Tenure/12
        const expectedMaturityInterest = principal * (rate / 100) * (tenureMonths / 12);
        const totalMaturityValue = principal + expectedMaturityInterest;

        // 2. Accrued Interest (Up to today)
        // Formula: Principal * (Rate/100) * (Days Elapsed / 365)
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysElapsed = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / msPerDay));
        // Cap accrued interest at maturity interest to avoid infinite growth if overdue (standard practice, though penalty might apply)
        const rawAccrued = principal * (rate / 100) * (daysElapsed / 365);
        const accruedInterest = Math.min(rawAccrued, expectedMaturityInterest);

        // 3. Expected Repayment (Current Settlement Value)
        // Only Principal + Accrued. (If overdue, this typically stays at Maturity Value + Penalties, but for now we simpler)
        const currentRepaymentValue = principal + accruedInterest;

        return {
            expectedMaturityInterest,
            totalMaturityValue,
            accruedInterest,
            currentRepaymentValue,
            daysElapsed
        };
    }, [loan]);

    if (!isOpen || !loan || !financials) return null;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100, // Higher than row actions usually
            padding: '20px',
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '600px',
                border: '1px solid var(--border-primary)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh',
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid var(--border-secondary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Loan Details</h2>
                        <span style={{
                            display: 'inline-block',
                            marginTop: '6px',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            background: loan.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-tertiary)',
                            color: loan.status === 'active' ? '#10B981' : 'var(--text-secondary)'
                        }}>
                            {loan.status}
                        </span>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'var(--bg-tertiary)',
                        border: 'none',
                        borderRadius: '8px',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        transition: 'all 0.2s'
                    }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ padding: '24px', overflowY: 'auto' }}>

                    {/* Debtor Info Section */}
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Debtor Information</h3>
                        <div style={{
                            background: 'var(--bg-tertiary)',
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px'
                        }}>
                            <div style={{
                                width: '48px', height: '48px',
                                borderRadius: '50%',
                                background: 'var(--accent-primary)',
                                color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.2rem', fontWeight: 700
                            }}>
                                {loan.debtor?.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.05rem' }}>{loan.debtor?.full_name}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{loan.debtor?.email}</div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Highlights (Grid) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

                        {/* Principal */}
                        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', padding: '16px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)' }}>
                                <DollarSign size={16} />
                                <span style={{ fontSize: '0.85rem' }}>Principal Amount</span>
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {formatCurrency(loan.principal)}
                            </div>
                        </div>

                        {/* Rate */}
                        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-secondary)', padding: '16px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)' }}>
                                <Percent size={16} />
                                <span style={{ fontSize: '0.85rem' }}>Interest Rate</span>
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {loan.interest_rate}% <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>p.a.</span>
                            </div>
                        </div>
                    </div>

                    {/* Calculated Metrics */}
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Financial Status</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Accrued Interest */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Accrued Interest</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{financials.daysElapsed} days elapsed</span>
                                </div>
                                <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                                    +{formatCurrency(financials.accruedInterest)}
                                </span>
                            </div>

                            {/* Current Repayment Value */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'linear-gradient(135deg, rgba(var(--accent-rgb), 0.1), rgba(var(--accent-rgb), 0.05))', borderRadius: '12px', border: '1px solid rgba(var(--accent-rgb), 0.2)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.95rem' }}>Current Repayment Value</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Principal + Accrued Interest</span>
                                </div>
                                <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.2rem' }}>
                                    {formatCurrency(financials.currentRepaymentValue)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Timeline & Projections */}
                    <div>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Timeline & Projections</h3>

                        <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '4px' }}>Start Date</div>
                                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{formatDate(loan.start_date)}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}><ArrowRight size={16} /></div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '4px' }}>Expected Maturity</div>
                                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{formatDate(loan.end_date)}</div>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Projected Total (Maturity)</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(financials.totalMaturityValue)}</span>
                            </div>
                            <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Interest at Maturity</span>
                                <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>+{formatCurrency(financials.expectedMaturityInterest)}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
