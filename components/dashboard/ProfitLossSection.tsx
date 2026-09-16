'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import StatsCard from './StatsCard';
import DateRangeFilter from './DateRangeFilter';
import { useCurrency } from '@/hooks/useCurrency';
import { TrendingUp, TrendingDown, Banknote, Wallet, AlertOctagon, Download, Share2, Check } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import styles from './ProfitLossSection.module.css';

interface PnLSummary {
    total_revenue: number;
    finance_costs: number;
    operating_expenses: number;
    bad_debt: number;
    net_profit: number;
}

/**
 * Revenue calculation matching the Google Sheet formula:
 *   Revenue = Principal × Rate × (Days_Elapsed / Avg_Days_Per_Month)
 *
 * Where:
 *   - Principal = principal_amount_ngn (or disbursed_amount as fallback)
 *   - Rate = monthly interest rate (e.g. 0.05 for 5%)
 *   - Days_Elapsed = days from disbursed_date to the report end date
 *   - Avg_Days_Per_Month = Days_Elapsed / tenor_months (or 30.4167 as fallback)
 */
function calculateLoanRevenue(
    principal: number,
    monthlyRate: number,
    disbursedDate: string,
    tenorMonths: number,
    endDate: Date
): number {
    const start = new Date(disbursedDate);
    const daysElapsed = Math.max(0, Math.floor((endDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    if (daysElapsed === 0 || tenorMonths === 0) return 0;

    // Fixed average days per month for consistent accrual
    const AVG_DAYS_PER_MONTH = 30.4167; // 365 / 12

    // Revenue = Principal × Rate × (Days_Elapsed / AVG_DAYS_PER_MONTH)
    // Capped at total maturity revenue so overdue loans don't artificially overstate earnings
    const rawRevenue = principal * monthlyRate * (daysElapsed / AVG_DAYS_PER_MONTH);
    const maxRevenue = principal * monthlyRate * tenorMonths;
    return Math.min(rawRevenue, maxRevenue);
}

/**
 * Finance cost calculation for credits/placements.
 * Uses the same formula approach as revenue but for creditor interest.
 *   Finance Cost = Principal × Rate × (Days_Elapsed / Avg_Days_Per_Month)
 */
function calculateCreditCost(
    principal: number,
    annualRate: number,
    startDate: string,
    tenorMonths: number,
    endDate: Date
): number {
    const start = new Date(startDate);
    const daysElapsed = Math.max(0, Math.floor((endDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    if (daysElapsed === 0 || tenorMonths === 0) return 0;

    // Credits use annual rate, convert to monthly
    const monthlyRate = annualRate / 12;
    const AVG_DAYS_PER_MONTH = 30.4167;

    const rawCost = principal * monthlyRate * (daysElapsed / AVG_DAYS_PER_MONTH);
    const maxCost = principal * monthlyRate * tenorMonths;
    return Math.min(rawCost, maxCost);
}

export default function ProfitLossSection() {
    const { formatCurrency } = useCurrency();
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [shareLoading, setShareLoading] = useState(false);
    const [data, setData] = useState<PnLSummary>({
        total_revenue: 0,
        finance_costs: 0,
        operating_expenses: 0,
        bad_debt: 0,
        net_profit: 0
    });

    const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
        startDate: null,
        endDate: new Date()
    });

    const fetchData = useCallback(async () => {
        if (!dateRange.endDate) return;

        setLoading(true);
        const supabase = createClient();
        const endDate = dateRange.endDate;
        const startDateISO = dateRange.startDate ? dateRange.startDate.toISOString().split('T')[0] : null;
        const endDateISO = dateRange.endDate.toISOString().split('T')[0];

        try {
            // Build OpEx query
            let opexQuery = supabase
                .from('operating_expenses')
                .select('amount')
                .lte('expense_month', endDateISO);
            if (startDateISO) opexQuery = opexQuery.gte('expense_month', startDateISO);

            // Build Bad Debt query
            let badDebtQuery = supabase
                .from('bad_debts')
                .select('amount')
                .lte('declared_date', endDateISO);
            if (startDateISO) badDebtQuery = badDebtQuery.gte('declared_date', startDateISO);

            // Fetch all data in parallel
            const [
                loanAdvancesResult,
                investmentsResult,
                creditsResult,
                opexResult,
                badDebtResult,
                fullProvisionLoansResult
            ] = await Promise.all([
                // 1a. Revenue: From loans (performing/non-performing)
                supabase
                    .from('loans')
                    .select('principal, interest_rate, tenure_months, start_date, disbursed_date, status, id')
                    .in('status', ['performing', 'non_performing', 'preliquidated']),

                // 1b. Revenue: From investments (active investments)
                supabase
                    .from('investments')
                    .select('principal, roi_rate, tenure_months, start_date, status')
                    .eq('status', 'active'),

                // 2. Finance Costs: From credits (active/matured placements)
                supabase
                    .from('credits')
                    .select('principal, interest_rate, tenure_months, start_date')
                    .in('status', ['active', 'matured']),

                // 3. Operating Expenses (date-filtered dynamically above)
                opexQuery,

                // 4. Bad Debt (date-filtered dynamically above)
                badDebtQuery,

                // 5. Fallback Bad Debt: Loans marked as full_provision
                supabase
                    .from('loans')
                    .select('principal, id, status')
                    .eq('status', 'full_provision')
            ]);

            // Debug: Log query results and errors
            if (loanAdvancesResult.error) console.error('P&L: loans query error:', loanAdvancesResult.error);
            if (investmentsResult.error) console.error('P&L: investments query error:', investmentsResult.error);
            if (creditsResult.error) console.error('P&L: credits query error:', creditsResult.error);
            if (opexResult.error) console.error('P&L: operating_expenses query error:', opexResult.error);
            if (badDebtResult.error) console.error('P&L: bad_debts query error:', badDebtResult.error);
            if (fullProvisionLoansResult.error) console.error('P&L: full_provision query error:', fullProvisionLoansResult.error);

            console.log('P&L Data:', {
                loans: loanAdvancesResult.data?.length ?? 'null',
                investments: investmentsResult.data?.length ?? 'null',
                credits: creditsResult.data?.length ?? 'null',
                opex: opexResult.data?.length ?? 'null',
                badDebt: badDebtResult.data?.length ?? 'null',
                fullProvision: fullProvisionLoansResult.data?.length ?? 'null'
            });

            // --- Revenue from Loans ---
            const loans = loanAdvancesResult.data || [];
            const loanRevenue = loans.reduce((sum, loan: any) => {
                const principal = Number(loan.principal || 0);
                const rate = Number(loan.interest_rate || 0) / 100; // Rate as decimal
                const tenorMonths = Number(loan.tenure_months || 0);
                const loanDate = loan.disbursed_date || loan.start_date; // fallback to start_date

                if (!loanDate || principal === 0 || rate === 0 || tenorMonths === 0) {
                    return sum;
                }

                const revenue = calculateLoanRevenue(principal, rate, loanDate, tenorMonths, endDate);
                return sum + revenue;
            }, 0);

            // --- Revenue from Investments (ROI) ---
            const investments = investmentsResult.data || [];
            const investmentRevenue = investments.reduce((sum, inv: any) => {
                const principal = Number(inv.principal || 0);
                const roiRate = Number(inv.roi_rate || 0) / 100; // Convert percentage to decimal
                const tenorMonths = Number(inv.tenure_months || 0);
                const startDate = inv.start_date;

                if (!startDate || principal === 0 || roiRate === 0 || tenorMonths === 0) return sum;

                return sum + calculateLoanRevenue(principal, roiRate, startDate, tenorMonths, endDate);
            }, 0);

            // --- Total Revenue = Loan Revenue + Investment Revenue ---
            const totalRevenue = loanRevenue + investmentRevenue;

            // --- Finance Costs: Accrued interest on credits/placements ---
            const credits = creditsResult.data || [];
            const totalFinanceCosts = credits.reduce((sum, credit: any) => {
                const principal = Number(credit.principal || 0);
                const annualRate = Number(credit.interest_rate || 0) / 100;
                const tenorMonths = Number(credit.tenure_months || 0);
                const startDate = credit.start_date;

                if (!startDate || principal === 0 || annualRate === 0 || tenorMonths === 0) return sum;

                return sum + calculateCreditCost(principal, annualRate, startDate, tenorMonths, endDate);
            }, 0);

            // --- Operating Expenses ---
            const totalOpex = (opexResult.data || []).reduce(
                (sum, expense: any) => sum + Number(expense.amount || 0), 0
            );

            // --- Bad Debt: Manual records + Full Provision loans ---
            const badDebtsManualData = badDebtResult.data || [];
            const badDebtsManualSum = badDebtsManualData.reduce(
                (sum, bd: any) => sum + Number(bd.amount || 0), 0
            );

            // Get unique loan_ids from manual bad_debts to avoid double counting
            const manualBadDebtLoanIds = new Set(badDebtsManualData.map((bd: any) => bd.loan_id));

            const badDebtsFromLoans = (fullProvisionLoansResult.data || [])
                .filter((l: any) => !manualBadDebtLoanIds.has(l.id))
                .reduce((sum, l: any) => sum + Number(l.principal || 0), 0);

            const totalBadDebt = badDebtsManualSum + badDebtsFromLoans;

            // --- Net Profit ---
            const netProfit = totalRevenue - totalFinanceCosts - totalOpex - totalBadDebt;

            setData({
                total_revenue: totalRevenue,
                finance_costs: totalFinanceCosts,
                operating_expenses: totalOpex,
                bad_debt: totalBadDebt,
                net_profit: netProfit
            });
        } catch (error) {
            console.error('Error fetching P&L data:', error);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePrint = () => {
        window.print();
    };

    const handleShare = async () => {
        setShareLoading(true);
        try {
            const supabase = createClient();
            const token = crypto.randomUUID();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            const { data: { user } } = await supabase.auth.getUser();

            await supabase.from('report_shares').insert({
                id: crypto.randomUUID(),
                report_type: 'profit_loss',
                date_start: dateRange.startDate?.toISOString().split('T')[0],
                date_end: dateRange.endDate?.toISOString().split('T')[0],
                token,
                expires_at: expiresAt.toISOString(),
                created_by: user?.id
            });

            const shareUrl = `${window.location.origin}/reports/${token}`;
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch (error) {
            console.error('Error creating share link:', error);
            alert('Failed to create share link');
        } finally {
            setShareLoading(false);
        }
    };

    const isProfitPositive = data.net_profit >= 0;

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '400px',
                width: '100%'
            }}>
                <MStreetLoader size={80} />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <h2 className={styles.title}>Profit & Loss Statement</h2>
                    <p className={styles.subtitle}>
                        Overview of revenue, expenses, and net profit
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <DateRangeFilter
                        value={dateRange}
                        onChange={setDateRange}
                    />
                    <div className={styles.actionBtns}>
                        <button className={styles.actionBtn} onClick={handlePrint} title="Print/Download PDF">
                            <Download size={18} />
                        </button>
                        <button
                            className={`${styles.actionBtn} ${styles.shareBtn}`}
                            onClick={handleShare}
                            disabled={shareLoading}
                            title="Share Report"
                        >
                            {copied ? <Check size={18} /> : <Share2 size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.grid}>
                {/* Revenue */}
                <StatsCard
                    title="Revenue"
                    value={formatCurrency(data.total_revenue)}
                    icon={TrendingUp}
                    loading={loading}
                    changeType="positive"
                    change="Loan Collections"
                    tooltip="Daily accrual of project interest from active loans. Formula: Principal × Monthly Rate × (Days Elapsed / 30.42)."
                />

                {/* Finance Costs */}
                <StatsCard
                    title="Finance Costs"
                    value={formatCurrency(data.finance_costs)}
                    icon={Wallet}
                    loading={loading}
                    changeType="negative"
                    change="Payout from Placements"
                    tooltip="Daily accrual of payout interest owed to placement providers. Formula: Principal × (Annual Rate / 12) × (Days Elapsed / 30.42)."
                />

                {/* Operating Expenses */}
                <StatsCard
                    title="Operating Expenses"
                    value={formatCurrency(data.operating_expenses)}
                    icon={Banknote}
                    loading={loading}
                    changeType="negative"
                    change="Ops & Overhead"
                    tooltip="Staff salaries, rent, utilities, and other operational costs. Source: operating_expenses table, filtered by the selected date range."
                />

                {/* Bad Debt */}
                <StatsCard
                    title="Bad Debt Provision"
                    value={formatCurrency(data.bad_debt)}
                    icon={AlertOctagon}
                    loading={loading}
                    changeType="negative"
                    change="Defaulted Principal"
                    tooltip="Principal from loans marked as full provision, plus manual entries in the bad_debts ledger."
                />

                {/* Net Profit */}
                <div className={`${styles.netProfitWrapper} ${isProfitPositive ? '' : styles.negativeProfit}`}>
                    <StatsCard
                        title="Net Profit"
                        value={formatCurrency(data.net_profit)}
                        icon={isProfitPositive ? TrendingUp : TrendingDown}
                        loading={loading}
                        changeType={isProfitPositive ? 'positive' : 'negative'}
                        change={isProfitPositive ? 'Net Gain' : 'Net Loss'}
                        tooltip="Net Profit = Revenue − Finance Costs − Operating Expenses − Bad Debt Provision. A positive value indicates profitability for the selected period."
                    />
                </div>
            </div>
        </div>
    );
}
