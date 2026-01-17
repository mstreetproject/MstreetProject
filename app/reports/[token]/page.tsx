'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { FileText, Calendar, Eye, AlertCircle, Building2, Wallet, TrendingUp } from 'lucide-react';

interface PageProps {
    params: { token: string };
}

interface ReportData {
    report_type: string;
    date_start: string;
    date_end: string;
    created_at: string;
    view_count: number;
}

interface BalanceData {
    loansReceivable: number;
    accruedInterestReceivable: number;
    totalAssets: number;
    creditsPayable: number;
    accruedInterestPayable: number;
    totalLiabilities: number;
    totalEquity: number;
}

export default function SharedReportPage({ params }: PageProps) {
    const { formatCurrency } = useCurrency();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reportMeta, setReportMeta] = useState<ReportData | null>(null);
    const [balanceData, setBalanceData] = useState<BalanceData | null>(null);

    useEffect(() => {
        async function fetchReport() {
            try {
                const supabase = createClient();

                // Try to get report metadata (optional - gracefully handle if RPC doesn't exist)
                try {
                    const { data, error: rpcError } = await supabase.rpc('get_report_by_token', {
                        p_token: params.token
                    });
                    if (!rpcError && data && !data.error) {
                        setReportMeta(data);
                    }
                } catch {
                    // RPC function doesn't exist yet - that's OK, continue without metadata
                    console.log('Report share metadata not available');
                }

                // Fetch actual report data directly
                const { data: loans } = await supabase
                    .from('loans')
                    .select('principal, interest_rate, start_date, amount_repaid, interest_repaid')
                    .in('status', ['active', 'partial_repaid', 'overdue']);

                const { data: credits } = await supabase
                    .from('credits')
                    .select('principal, interest_rate, start_date, remaining_principal, total_paid_out')
                    .in('status', ['active', 'matured']);

                // Calculate balances
                let loansReceivable = 0;
                let accruedInterestReceivable = 0;
                loans?.forEach(loan => {
                    const remaining = Number(loan.principal) - Number(loan.amount_repaid || 0);
                    loansReceivable += remaining;
                    const start = new Date(loan.start_date);
                    const now = new Date();
                    const days = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                    // Calculate accrued interest, then subtract what's already been repaid
                    const interestAccrued = remaining * (Number(loan.interest_rate) / 100) * (days / 365);
                    accruedInterestReceivable += interestAccrued - Number(loan.interest_repaid || 0);
                });

                let creditsPayable = 0;
                let accruedInterestPayable = 0;
                credits?.forEach(credit => {
                    const remaining = Number(credit.remaining_principal ?? credit.principal);
                    creditsPayable += remaining;
                    const start = new Date(credit.start_date);
                    const now = new Date();
                    const days = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                    accruedInterestPayable += remaining * (Number(credit.interest_rate) / 100) * (days / 365);
                });

                const totalAssets = loansReceivable + accruedInterestReceivable;
                const totalLiabilities = creditsPayable + accruedInterestPayable;

                setBalanceData({
                    loansReceivable,
                    accruedInterestReceivable,
                    totalAssets,
                    creditsPayable,
                    accruedInterestPayable,
                    totalLiabilities,
                    totalEquity: totalAssets - totalLiabilities,
                });

            } catch (err: any) {
                console.error('Error loading report:', err);
                setError(err.message || 'Failed to load report');
            } finally {
                setLoading(false);
            }
        }

        fetchReport();
    }, [params.token]);

    const styles = {
        page: {
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            padding: '40px 20px',
        } as React.CSSProperties,
        container: {
            maxWidth: '900px',
            margin: '0 auto',
        } as React.CSSProperties,
        header: {
            textAlign: 'center' as const,
            marginBottom: '32px',
            color: 'white',
        } as React.CSSProperties,
        logo: {
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
        } as React.CSSProperties,
        meta: {
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.9rem',
        } as React.CSSProperties,
        metaItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
        } as React.CSSProperties,
        card: {
            background: 'white',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        } as React.CSSProperties,
        section: {
            padding: '24px',
            borderBottom: '1px solid #eee',
        } as React.CSSProperties,
        sectionHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
            color: '#2563eb',
            fontSize: '1rem',
            fontWeight: 700,
        } as React.CSSProperties,
        row: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 0',
            paddingLeft: '20px',
            borderBottom: '1px solid #f0f0f0',
        } as React.CSSProperties,
        totalRow: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 0',
            marginTop: '8px',
            borderTop: '2px solid #2563eb',
            fontWeight: 700,
            fontSize: '1.1rem',
        } as React.CSSProperties,
        error: {
            textAlign: 'center' as const,
            padding: '60px',
            color: 'white',
        } as React.CSSProperties,
        loading: {
            textAlign: 'center' as const,
            padding: '60px',
            color: 'white',
        } as React.CSSProperties,
    };

    if (loading) {
        return (
            <div style={styles.page}>
                <div style={styles.loading}>
                    <div style={{ fontSize: '1.2rem' }}>Loading report...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.page}>
                <div style={styles.error}>
                    <AlertCircle size={48} style={{ marginBottom: '16px' }} />
                    <h2 style={{ margin: '0 0 8px' }}>Report Not Found</h2>
                    <p style={{ opacity: 0.7 }}>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.logo}>
                        <img
                            src="/primary logo.svg"
                            alt="MStreet Financial"
                            style={{ height: '50px', width: 'auto' }}
                        />
                    </div>
                    <h1 style={{ fontSize: '2rem', margin: '16px 0 8px' }}>Balance Sheet</h1>
                    <div style={styles.meta}>
                        <div style={styles.metaItem}>
                            <Calendar size={16} />
                            As of {new Date().toLocaleDateString('en-US', {
                                year: 'numeric', month: 'long', day: 'numeric'
                            })}
                        </div>
                        <div style={styles.metaItem}>
                            <Eye size={16} />
                            {reportMeta?.view_count || 1} views
                        </div>
                    </div>
                </div>

                {/* Balance Sheet Card */}
                {balanceData && (
                    <div style={styles.card}>
                        {/* Logo Header - Inside Card */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '24px',
                            background: 'white',
                            borderBottom: '2px solid #6366f1'
                        }}>
                            <img
                                src="/secondary logo1.png"
                                alt="MStreet Financial"
                                style={{ height: '60px', width: 'auto' }}
                            />
                            <div style={{ color: '#1a1a2e' }}>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Balance Sheet</h2>
                                <p style={{ margin: '4px 0 0', fontSize: '0.9rem', opacity: 0.7 }}>
                                    As of {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        {/* Assets */}
                        <div style={styles.section}>
                            <div style={styles.sectionHeader}>
                                <Building2 size={20} />
                                ASSETS
                            </div>
                            <div style={styles.row}>
                                <span>Loans Receivable</span>
                                <span>{formatCurrency(balanceData.loansReceivable)}</span>
                            </div>
                            <div style={styles.row}>
                                <span>Accrued Interest Receivable</span>
                                <span>{formatCurrency(balanceData.accruedInterestReceivable)}</span>
                            </div>
                            <div style={styles.totalRow}>
                                <span>Total Assets</span>
                                <span style={{ color: '#2563eb' }}>{formatCurrency(balanceData.totalAssets)}</span>
                            </div>
                        </div>

                        {/* Liabilities */}
                        <div style={styles.section}>
                            <div style={styles.sectionHeader}>
                                <Wallet size={20} />
                                LIABILITIES
                            </div>
                            <div style={styles.row}>
                                <span>Credits Payable</span>
                                <span>{formatCurrency(balanceData.creditsPayable)}</span>
                            </div>
                            <div style={styles.row}>
                                <span>Accrued Interest Payable</span>
                                <span>{formatCurrency(balanceData.accruedInterestPayable)}</span>
                            </div>
                            <div style={styles.totalRow}>
                                <span>Total Liabilities</span>
                                <span style={{ color: '#dc2626' }}>{formatCurrency(balanceData.totalLiabilities)}</span>
                            </div>
                        </div>

                        {/* Equity */}
                        <div style={styles.section}>
                            <div style={styles.sectionHeader}>
                                <TrendingUp size={20} />
                                EQUITY
                            </div>
                            <div style={styles.totalRow}>
                                <span>Total Equity (Net Position)</span>
                                <span style={{ color: balanceData.totalEquity >= 0 ? '#16a34a' : '#dc2626' }}>
                                    {formatCurrency(balanceData.totalEquity)}
                                </span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '16px 24px',
                            background: '#f8fafc',
                            fontSize: '0.85rem',
                            color: '#64748b',
                            textAlign: 'center'
                        }}>
                            This report was shared via MStreet Finance.
                            Shared reports expire after 7 days.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
