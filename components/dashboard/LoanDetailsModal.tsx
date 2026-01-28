'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { X, Calendar, Banknote, Clock, Hash, Percent, User, ArrowRight, History, FileText, List, ExternalLink, CheckCircle } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import { useCurrency } from '@/hooks/useCurrency';
import { createClient } from '@/lib/supabase/client';
import { useRepaymentSchedule } from '@/hooks/dashboard/useRepaymentSchedule';
import { useLoanDocuments } from '@/hooks/dashboard/useLoanDocuments';
import DataTable from '@/components/dashboard/DataTable';
import PdfViewerModal from '@/components/dashboard/PdfViewerModal';

interface LoanRepayment {
    id: string;
    amount_principal: number;
    amount_interest: number;
    total_amount: number;
    payment_type: 'full' | 'partial';
    notes: string | null;
    created_at: string;
}

interface Loan {
    id: string;
    debtor_id: string;
    principal: number;
    interest_rate: number;
    tenure_months: number;
    start_date: string;
    end_date: string;
    status: string;
    repayment_cycle?: string;
    origination_date?: string;
    disbursed_date?: string;
    first_repayment_date?: string;
    reference_no?: string;
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
    const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [viewingPdf, setViewingPdf] = useState<{ url: string, name: string } | null>(null);

    const { schedule, loading: loadingSchedule } = useRepaymentSchedule(loan?.id || null);
    const { documents, loading: loadingDocs } = useLoanDocuments(loan?.id || null);

    useEffect(() => {
        if (isOpen && loan?.id) {
            fetchRepayments();
        }
    }, [isOpen, loan?.id]);

    const fetchRepayments = async () => {
        if (!loan?.id) return;
        setLoadingHistory(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('loan_repayments')
                .select('*')
                .eq('loan_id', loan.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRepayments(data || []);
        } catch (err) {
            console.error('Error fetching loan history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Loan Details</h2>
                            {loan.reference_no && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>#{loan.reference_no}</span>
                            )}
                        </div>
                        <span style={{
                            display: 'inline-block',
                            marginTop: '6px',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            background:
                                loan.status === 'performing' ? 'rgba(16, 185, 129, 0.1)' :
                                    loan.status === 'non_performing' ? 'rgba(245, 158, 11, 0.1)' :
                                        loan.status === 'full_provision' ? 'rgba(239, 68, 68, 0.1)' :
                                            'var(--bg-tertiary)',
                            color:
                                loan.status === 'performing' ? '#10B981' :
                                    loan.status === 'non_performing' ? '#F59E0B' :
                                        loan.status === 'full_provision' ? '#EF4444' :
                                            'var(--text-secondary)'
                        }}>
                            {loan.status === 'performing' ? 'Performing' :
                                loan.status === 'non_performing' ? 'Non-performing' :
                                    loan.status === 'full_provision' ? 'Full Provision Required' :
                                        loan.status === 'preliquidated' ? 'Preliquidated' :
                                            loan.status}
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
                                <Banknote size={16} />
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
                                {loan.interest_rate}%
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
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Timeline & Projections</h3>

                        <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '4px' }}>Origination</div>
                                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{formatDate(loan.origination_date || loan.start_date)}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', flexDirection: 'column' }}>
                                    <div style={{ fontSize: '0.7rem' }}>Disbursed</div>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{formatDate(loan.disbursed_date || loan.start_date)}</div>
                                    <ArrowRight size={14} />
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '4px' }}>Maturity</div>
                                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{formatDate(loan.end_date)}</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '4px' }}>Cycle</div>
                                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, textTransform: 'capitalize' }}>
                                        {loan.repayment_cycle?.replace('_', ' ') || 'Monthly'}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '4px' }}>First Repayment</div>
                                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                        {loan.first_repayment_date ? formatDate(loan.first_repayment_date) : 'N/A'}
                                    </div>
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

                    {/* Repayment History Section */}
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <History size={16} />
                            Repayment History
                        </h3>

                        {loadingHistory ? (
                            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                <MStreetLoader size={30} />
                                <p style={{ margin: 0, fontSize: '0.85rem' }}>Loading history...</p>
                            </div>
                        ) : repayments.length === 0 ? (
                            <div style={{ padding: '24px', background: 'var(--bg-tertiary)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <p style={{ margin: 0, fontSize: '0.85rem' }}>No repayment history found.</p>
                            </div>
                        ) : (
                            <DataTable
                                columns={[
                                    {
                                        key: 'created_at',
                                        label: 'Date',
                                        render: (val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                    },
                                    {
                                        key: 'amount_principal',
                                        label: 'Principal',
                                        render: (val) => <div style={{ textAlign: 'right' }}>{formatCurrency(val)}</div>
                                    },
                                    {
                                        key: 'amount_interest',
                                        label: 'Interest',
                                        render: (val) => <div style={{ textAlign: 'right', color: 'var(--accent-primary)', fontWeight: 500 }}>{formatCurrency(val)}</div>
                                    },
                                    {
                                        key: 'notes',
                                        label: 'Notes',
                                        render: (val) => <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} title={val}>{val || '-'}</div>
                                    }
                                ]}
                                data={repayments}
                                emptyMessage="No repayment history found."
                            />
                        )}
                    </div>

                    {/* Repayment Schedule Section */}
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <List size={16} />
                            Repayment Schedule
                        </h3>

                        {loadingSchedule ? (
                            <div style={{ textAlign: 'center', padding: '16px' }}><MStreetLoader size={24} /></div>
                        ) : schedule.length === 0 ? (
                            <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                No schedule generated for this loan.
                            </div>
                        ) : (
                            <DataTable
                                columns={[
                                    { key: 'installment_no', label: 'Inst.' },
                                    { key: 'due_date', label: 'Due Date' },
                                    {
                                        key: 'total_amount',
                                        label: 'Amount',
                                        render: (val) => <div style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(val)}</div>
                                    },
                                    {
                                        key: 'status',
                                        label: 'Status',
                                        render: (val) => (
                                            <div style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '2px 6px',
                                                    borderRadius: '8px',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    background:
                                                        val === 'paid' ? 'rgba(16, 185, 129, 0.1)' :
                                                            val === 'overdue' ? 'rgba(239, 68, 68, 0.1)' :
                                                                val === 'partial' ? 'rgba(245, 158, 11, 0.1)' :
                                                                    'rgba(107, 114, 128, 0.05)',
                                                    color:
                                                        val === 'paid' ? '#10b981' :
                                                            val === 'overdue' ? '#ef4444' :
                                                                val === 'partial' ? '#f59e0b' :
                                                                    'var(--text-muted)'
                                                }}>
                                                    {val}
                                                </span>
                                            </div>
                                        )
                                    }
                                ]}
                                data={schedule}
                                emptyMessage="No schedule generated for this loan."
                            />
                        )}
                    </div>

                    {/* Offer Letter Section */}
                    <div style={{ marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={16} />
                            Offer Letter
                        </h3>

                        {loadingDocs ? (
                            <div style={{ textAlign: 'center', padding: '16px' }}><MStreetLoader size={24} /></div>
                        ) : documents.length === 0 ? (
                            <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                No documents uploaded.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                {documents.map((doc) => (
                                    <div
                                        key={doc.id}
                                        onClick={() => setViewingPdf({ url: doc.signed_file_url || doc.file_url, name: doc.file_name })}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 16px',
                                            background: 'var(--bg-tertiary)',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-secondary)',
                                            textDecoration: 'none',
                                            color: 'inherit',
                                            transition: 'transform 0.2s',
                                            cursor: 'pointer'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <FileText size={20} style={{ color: 'var(--accent-primary)' }} />
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{doc.file_name}</div>
                                                    {doc.is_signed && (
                                                        <span style={{
                                                            fontSize: '0.6rem',
                                                            background: '#10b981',
                                                            color: 'white',
                                                            padding: '2px 6px',
                                                            borderRadius: '8px',
                                                            fontWeight: 700,
                                                            textTransform: 'uppercase',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '3px'
                                                        }}>
                                                            <CheckCircle size={10} /> Signed
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    Uploaded on {formatDate(doc.created_at)}
                                                    {doc.is_signed && doc.signed_at && ` • Signed on ${new Date(doc.signed_at).toLocaleDateString()}`}
                                                </div>
                                            </div>
                                        </div>
                                        <ExternalLink size={16} style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            <PdfViewerModal
                isOpen={!!viewingPdf}
                pdfUrl={viewingPdf?.url || ''}
                title={viewingPdf?.name || 'Document'}
                onClose={() => setViewingPdf(null)}
            />
        </div>
    );
}
