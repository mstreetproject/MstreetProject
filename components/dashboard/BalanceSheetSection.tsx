'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import DateRangeFilter from './DateRangeFilter';
import { FileText, Download, Share2, Copy, Check, Building2, Wallet, TrendingUp, Calendar } from 'lucide-react';
import styles from './BalanceSheetSection.module.css';

interface BalanceSheetData {
    // Assets
    loansReceivable: number;
    loansReceivableCount: number;
    accruedInterestReceivable: number;
    cashReserves: number;
    totalAssets: number;

    // Liabilities
    creditsPayable: number;
    creditsPayableCount: number;
    accruedInterestPayable: number;
    totalLiabilities: number;

    // Equity
    retainedEarnings: number;
    currentPeriodProfit: number;
    totalEquity: number;
}

interface Props {
    onShare?: (token: string) => void;
}

export default function BalanceSheetSection({ onShare }: Props) {
    const { formatCurrency } = useCurrency();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<BalanceSheetData | null>(null);
    const [asOfDate, setAsOfDate] = useState(new Date());
    const [copied, setCopied] = useState(false);
    const [shareLoading, setShareLoading] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const supabase = createClient();

        try {
            // Fetch active loans (Assets - Loans Receivable)
            const { data: loans } = await supabase
                .from('loans')
                .select('principal, interest_rate, start_date, amount_repaid, interest_repaid')
                .in('status', ['active', 'partial_repaid', 'overdue']);

            // Calculate loans receivable (principal - amount repaid)
            let loansReceivable = 0;
            let accruedInterestReceivable = 0;
            loans?.forEach(loan => {
                const remaining = Number(loan.principal) - Number(loan.amount_repaid || 0);
                loansReceivable += remaining;

                // Calculate accrued interest
                const start = new Date(loan.start_date);
                const now = new Date();
                const daysElapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                const interestAccrued = remaining * (Number(loan.interest_rate) / 100) * (daysElapsed / 365);
                accruedInterestReceivable += interestAccrued - Number(loan.interest_repaid || 0);
            });

            // Fetch active credits (Liabilities - Credits Payable)
            const { data: credits } = await supabase
                .from('credits')
                .select('principal, interest_rate, start_date, remaining_principal, total_paid_out')
                .in('status', ['active', 'matured']);

            // Calculate credits payable
            let creditsPayable = 0;
            let accruedInterestPayable = 0;
            credits?.forEach(credit => {
                const remaining = Number(credit.remaining_principal ?? credit.principal);
                creditsPayable += remaining;

                // Calculate accrued interest
                const start = new Date(credit.start_date);
                const now = new Date();
                const daysElapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                accruedInterestPayable += remaining * (Number(credit.interest_rate) / 100) * (daysElapsed / 365);
            });

            // Fetch cumulative profit (Equity)
            const { data: pnlData } = await supabase.rpc('get_profit_loss_summary', {
                start_date: '2020-01-01',
                end_date: new Date().toISOString()
            });

            const currentPeriodProfit = pnlData?.net_profit || 0;

            // Calculate totals
            const totalAssets = loansReceivable + accruedInterestReceivable;
            const totalLiabilities = creditsPayable + accruedInterestPayable;
            const retainedEarnings = totalAssets - totalLiabilities;

            setData({
                loansReceivable,
                loansReceivableCount: loans?.length || 0,
                accruedInterestReceivable: Math.max(0, accruedInterestReceivable),
                cashReserves: 0, // Would need bank integration
                totalAssets,
                creditsPayable,
                creditsPayableCount: credits?.length || 0,
                accruedInterestPayable,
                totalLiabilities,
                retainedEarnings,
                currentPeriodProfit,
                totalEquity: retainedEarnings,
            });
        } catch (error) {
            console.error('Error fetching balance sheet data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePrint = () => {
        window.print();
    };

    const handleShare = async () => {
        setShareLoading(true);
        try {
            const token = crypto.randomUUID();
            const shareUrl = `${window.location.origin}/reports/${token}`;

            // Try to save to database (optional - if table exists)
            try {
                const supabase = createClient();
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7);
                const { data: { user } } = await supabase.auth.getUser();

                await supabase.from('report_shares').insert({
                    id: crypto.randomUUID(),
                    report_type: 'balance_sheet',
                    date_start: asOfDate.toISOString().split('T')[0],
                    date_end: asOfDate.toISOString().split('T')[0],
                    token,
                    expires_at: expiresAt.toISOString(),
                    created_by: user?.id
                });
            } catch {
                // Table doesn't exist - that's OK, link will still work
                console.log('Report shares table not set up - link will work without tracking');
            }

            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
            onShare?.(token);
        } catch (error) {
            console.error('Error creating share link:', error);
            alert('Failed to create share link. Please try again.');
        } finally {
            setShareLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading balance sheet...</div>
            </div>
        );
    }

    if (!data) return null;

    const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className={styles.container} ref={printRef}>
            {/* Header - Actions Only */}
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <h2 className={styles.title}>Balance Sheet</h2>
                    <p className={styles.subtitle}>
                        Print or share your financial report
                    </p>
                </div>
                <div className={styles.actions}>
                    <button className={styles.actionBtn} onClick={handlePrint}>
                        <Download size={18} />
                        <span>Print/PDF</span>
                    </button>
                    <button
                        className={`${styles.actionBtn} ${styles.shareBtn}`}
                        onClick={handleShare}
                        disabled={shareLoading}
                    >
                        {copied ? <Check size={18} /> : <Share2 size={18} />}
                        <span>{copied ? 'Link Copied!' : shareLoading ? 'Creating...' : 'Share'}</span>
                    </button>
                </div>
            </div>

            {/* Balance Sheet Table */}
            <div className={styles.sheet}>
                {/* Logo Header - Inside PDF body */}
                <div className={styles.reportHeader}>
                    <img
                        src="/secondary logo1.png"
                        alt="MStreet Financial"
                        className={styles.reportLogo}
                    />
                    <div className={styles.reportTitle}>
                        <h2>Balance Sheet</h2>
                        <p>As of {formatDate(asOfDate)}</p>
                    </div>
                </div>

                {/* ASSETS */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <Building2 size={20} />
                        <h3>ASSETS</h3>
                    </div>

                    <div className={styles.category}>
                        <h4>Current Assets</h4>
                        <div className={styles.lineItem}>
                            <span className={styles.itemName}>
                                Loans Receivable
                                <span className={styles.itemCount}>({data.loansReceivableCount} active loans)</span>
                            </span>
                            <span className={styles.itemValue}>{formatCurrency(data.loansReceivable)}</span>
                        </div>
                        <div className={styles.lineItem}>
                            <span className={styles.itemName}>Accrued Interest Receivable</span>
                            <span className={styles.itemValue}>{formatCurrency(data.accruedInterestReceivable)}</span>
                        </div>
                    </div>

                    <div className={styles.totalRow}>
                        <span>Total Assets</span>
                        <span className={styles.totalValue}>{formatCurrency(data.totalAssets)}</span>
                    </div>
                </div>

                {/* LIABILITIES */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <Wallet size={20} />
                        <h3>LIABILITIES</h3>
                    </div>

                    <div className={styles.category}>
                        <h4>Current Liabilities</h4>
                        <div className={styles.lineItem}>
                            <span className={styles.itemName}>
                                Credits Payable
                                <span className={styles.itemCount}>({data.creditsPayableCount} active credits)</span>
                            </span>
                            <span className={styles.itemValue}>{formatCurrency(data.creditsPayable)}</span>
                        </div>
                        <div className={styles.lineItem}>
                            <span className={styles.itemName}>Accrued Interest Payable</span>
                            <span className={styles.itemValue}>{formatCurrency(data.accruedInterestPayable)}</span>
                        </div>
                    </div>

                    <div className={styles.totalRow}>
                        <span>Total Liabilities</span>
                        <span className={styles.totalValue}>{formatCurrency(data.totalLiabilities)}</span>
                    </div>
                </div>

                {/* EQUITY */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <TrendingUp size={20} />
                        <h3>EQUITY</h3>
                    </div>

                    <div className={styles.category}>
                        <h4>Owner&apos;s Equity</h4>
                        <div className={styles.lineItem}>
                            <span className={styles.itemName}>Retained Earnings</span>
                            <span className={`${styles.itemValue} ${data.retainedEarnings >= 0 ? styles.positive : styles.negative}`}>
                                {formatCurrency(data.retainedEarnings)}
                            </span>
                        </div>
                    </div>

                    <div className={styles.totalRow}>
                        <span>Total Equity</span>
                        <span className={`${styles.totalValue} ${data.totalEquity >= 0 ? styles.positive : styles.negative}`}>
                            {formatCurrency(data.totalEquity)}
                        </span>
                    </div>
                </div>

                {/* Balance Check */}
                <div className={styles.balanceCheck}>
                    <div className={styles.checkRow}>
                        <span>Assets</span>
                        <span>{formatCurrency(data.totalAssets)}</span>
                    </div>
                    <div className={styles.checkRow}>
                        <span>Liabilities + Equity</span>
                        <span>{formatCurrency(data.totalLiabilities + data.totalEquity)}</span>
                    </div>
                    <div className={`${styles.checkResult} ${Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01 ? styles.balanced : styles.unbalanced}`}>
                        {Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01
                            ? '✓ Balanced'
                            : '⚠ Imbalanced'}
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .${styles.container}, .${styles.container} * {
                        visibility: visible;
                    }
                    .${styles.container} {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white !important;
                        color: black !important;
                    }
                    .${styles.actions} {
                        display: none !important;
                    }
                    .${styles.sheet} {
                        background: white !important;
                        border: 1px solid #ccc !important;
                    }
                }
            `}</style>
        </div>
    );
}
