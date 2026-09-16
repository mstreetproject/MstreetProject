'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFundPoolData } from '@/hooks/dashboard/useFundPoolData';
import { useCurrency } from '@/hooks/useCurrency';
import MStreetLoader from '@/components/ui/MStreetLoader';
import DateRangeFilter from './DateRangeFilter';
import { DateRange } from '@/hooks/dashboard/useCreditorStats';
import { TrendingUp, TrendingDown, Scale, DollarSign, ArrowRight, Search, List, ArrowLeftRight, Info, Download, Printer, ChevronDown, FileText } from 'lucide-react';
import styles from './FundPoolSection.module.css';

type ViewMode = 'all' | 'liabilities' | 'assets';

export default function FundPoolSection() {
    const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null });
    const [viewMode, setViewMode] = useState<ViewMode>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const { liabilities, assets, summary, loading } = useFundPoolData(dateRange);
    const { formatCurrency } = useCurrency();

    // Filter Logic
    const filteredLiabilities = useMemo(() => {
        if (!searchQuery) return liabilities;
        return liabilities.filter(item =>
            item.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.reference && item.reference.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [liabilities, searchQuery]);

    const filteredAssets = useMemo(() => {
        if (!searchQuery) return assets;
        return assets.filter(item =>
            item.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.reference && item.reference.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [assets, searchQuery]);

    const handleExport = () => {
        const dateStr = new Date().toISOString().split('T')[0];
        const rows = [
            ['Fund Pool Analysis Report'],
            [`Generated On: ${dateStr}`],
            [],
            ['-- Summary --'],
            ['Metric', 'Value'],
            ['Total Source of Funds', summary.totalLiabilities],
            ['Total Use of Funds', summary.totalAssets],
            ['W. Avg Cost of Funds', `${summary.weightedAvgCostOfFunds.toFixed(2)}%`],
            ['W. Avg Yield', `${summary.weightedAvgYield.toFixed(2)}%`],
            [],
            ['-- Source of Funds (Liabilities) --'],
            ['Source', 'Reference', 'Amount', 'Cost (%)', 'Return'],
            ...filteredLiabilities.map(item => [
                item.source,
                item.reference || '-',
                item.amount,
                `${item.rate}%`,
                item.cumulativeReturn
            ]),
            [],
            ['-- Use of Funds (Assets) --'],
            ['Deployment', 'Reference', 'Amount', 'Yield (%)', 'Return'],
            ...filteredAssets.map(item => [
                item.source,
                item.reference || '-',
                item.amount,
                `${item.rate}%`,
                item.cumulativeReturn
            ])
        ];

        const csvContent = "data:text/csv;charset=utf-8," +
            rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `fund_pool_report_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

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
            {/* Print Header - Visible only in Print Mode */}
            <div className="print-header" style={{ display: 'none', marginBottom: '20px', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <img
                        src="/secondary logo1.png"
                        alt="MStreet Financial"
                        style={{ height: '40px' }}
                    />
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#000', margin: 0 }}>Fund Pool Analysis</h2>
                        <p style={{ margin: 0, color: '#666' }}>As of {new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            {/* Header Controls */}
            <div className={styles.filterSection}>
                <div className={styles.leftControls}>
                    {/* View Toggle */}
                    <div className={styles.toggleGroup}>
                        <button
                            className={`${styles.toggleBtn} ${viewMode === 'all' ? styles.active : ''}`}
                            onClick={() => setViewMode('all')}
                        >
                            <ArrowLeftRight size={14} style={{ marginRight: 4 }} />
                            Split View
                        </button>
                        <button
                            className={`${styles.toggleBtn} ${viewMode === 'liabilities' ? styles.active : ''}`}
                            onClick={() => setViewMode('liabilities')}
                        >
                            <TrendingDown size={14} style={{ marginRight: 4 }} />
                            Liabilities
                        </button>
                        <button
                            className={`${styles.toggleBtn} ${viewMode === 'assets' ? styles.active : ''}`}
                            onClick={() => setViewMode('assets')}
                        >
                            <TrendingUp size={14} style={{ marginRight: 4 }} />
                            Assets
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className={styles.searchContainer}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Search by name or ref..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                </div>

                <div className={styles.rightControls}>
                    <div style={{ position: 'relative' }} ref={dropdownRef}>
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className={styles.toggleBtn}
                            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}
                        >
                            <Download size={14} style={{ marginRight: 6 }} />
                            Export
                            <ChevronDown size={14} style={{ marginLeft: 6 }} />
                        </button>

                        {showExportMenu && (
                            <div className={styles.exportDropdown}>
                                <button
                                    onClick={() => { handleExport(); setShowExportMenu(false); }}
                                    className={styles.menuItem}
                                >
                                    <FileText size={14} />
                                    Download CSV
                                </button>
                                <button
                                    onClick={() => { handlePrint(); setShowExportMenu(false); }}
                                    className={styles.menuItem}
                                >
                                    <Printer size={14} />
                                    Print / PDF
                                </button>
                            </div>
                        )}
                    </div>
                    <DateRangeFilter value={dateRange} onChange={setDateRange} />
                </div>
            </div>

            {/* Summary Cards */}
            <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className={styles.cardTitle}>Total Source of Funds</span>
                        <div className={styles.tooltipWrapper}>
                            <Info size={14} className={styles.infoIcon} />
                            <div className={styles.tooltip}>Total Liabilities (Credits) from all Creditors.</div>
                        </div>
                    </div>
                    <span className={styles.cardValue}>{formatCurrency(summary.totalLiabilities)}</span>
                    <div className={styles.cardTrend}>
                        <TrendingDown size={14} className={styles.trendNeutral} />
                        <span className={styles.trendNeutral}>Liabilities Pool</span>
                    </div>
                </div>

                <div className={styles.summaryCard}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className={styles.cardTitle}>Total Use of Funds</span>
                        <div className={styles.tooltipWrapper}>
                            <Info size={14} className={styles.infoIcon} />
                            <div className={styles.tooltip}>Total Assets (Loans + Investments) currently deployed.</div>
                        </div>
                    </div>
                    <span className={styles.cardValue}>{formatCurrency(summary.totalAssets)}</span>
                    <div className={styles.cardTrend}>
                        <TrendingUp size={14} className={styles.trendGood} />
                        <span className={styles.trendGood}>Deployed Assets</span>
                    </div>
                </div>

                <div className={styles.summaryCard}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className={styles.cardTitle}>W. Avg Cost of Funds</span>
                        <div className={styles.tooltipWrapper}>
                            <Info size={14} className={styles.infoIcon} />
                            <div className={styles.tooltip}>Weighted Average Rate of all active liabilities.</div>
                        </div>
                    </div>
                    <span className={styles.cardValue} style={{ color: '#fe4a49' }}>
                        {summary.weightedAvgCostOfFunds.toFixed(2)}%
                    </span>
                    <div className={styles.cardTrend}>
                        <span className={styles.trendBad}>Interest Expense</span>
                    </div>
                </div>

                <div className={styles.summaryCard}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className={styles.cardTitle}>W. Avg Yield</span>
                        <div className={styles.tooltipWrapper}>
                            <Info size={14} className={styles.infoIcon} />
                            <div className={styles.tooltip}>Weighted Average Rate of Return on all deployed assets.</div>
                        </div>
                    </div>
                    <span className={styles.cardValue} style={{ color: '#22c55e' }}>
                        {summary.weightedAvgYield.toFixed(2)}%
                    </span>
                    <div className={styles.cardTrend}>
                        <span className={styles.trendGood}>+ {(summary.weightedAvgYield - summary.weightedAvgCostOfFunds).toFixed(2)}% Spread</span>
                    </div>
                </div>
            </div>

            {/* Tables Container */}
            <div className={`${styles.tablesContainer} ${viewMode !== 'all' ? styles.fullWidth : ''}`}>

                {/* Liabilities Table */}
                {(viewMode === 'all' || viewMode === 'liabilities') && (
                    <div className={styles.tableSection}>
                        <div className={styles.tableHeader}>
                            <div className={styles.sectionTitle}>
                                <TrendingDown size={18} style={{ color: '#fe4a49' }} />
                                Source of Funds (Liabilities)
                            </div>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Source</th>
                                        <th>Ref</th>
                                        <th style={{ textAlign: 'right' }}>Amount</th>
                                        <th style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                Cost (%)
                                                <div className={styles.tooltipWrapper}>
                                                    <Info size={12} className={styles.infoIcon} />
                                                    <div className={styles.tooltip}>Annual Interest Rate payable to the Creditor.</div>
                                                </div>
                                            </div>
                                        </th>
                                        <th style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                Return
                                                <div className={styles.tooltipWrapper}>
                                                    <Info size={12} className={styles.infoIcon} />
                                                    <div className={styles.tooltip}>Total interest accrued on this credit so far.</div>
                                                </div>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLiabilities.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className={styles.emptyState}>
                                                {searchQuery ? 'No matching liabilities' : 'No liabilities found'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLiabilities.map(item => (
                                            <tr key={item.id}>
                                                <td style={{ fontWeight: 500 }}>{item.source}</td>
                                                <td style={{ color: 'var(--text-muted)' }}>{item.reference || '-'}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                    {formatCurrency(item.amount)}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={styles.rateTag}>{item.rate}%</span>
                                                </td>
                                                <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                                                    {formatCurrency(item.cumulativeReturn)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    {/* Total Row (Show ONLY if not searching, or maybe meaningful to show filtered total?) */}
                                    {/* Decision: Show filtered totals if searching, global totals if not? 
                                        Let's show filtered totals to be responsive to the view. 
                                    */}
                                    {filteredLiabilities.length > 0 && (
                                        <tr style={{ background: 'var(--bg-tertiary)', borderTop: '2px solid var(--border-secondary)' }}>
                                            <td colSpan={2} style={{ fontWeight: 700 }}>
                                                {searchQuery ? 'Filtered Total' : 'Total'}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                                {formatCurrency(filteredLiabilities.reduce((sum, i) => sum + i.amount, 0))}
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 700 }}>
                                                -
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                                {formatCurrency(filteredLiabilities.reduce((sum, i) => sum + i.cumulativeReturn, 0))}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Assets Table */}
                {(viewMode === 'all' || viewMode === 'assets') && (
                    <div className={styles.tableSection}>
                        <div className={styles.tableHeader}>
                            <div className={styles.sectionTitle}>
                                <TrendingUp size={18} style={{ color: '#22c55e' }} />
                                Use of Funds (Assets)
                            </div>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Deployment</th>
                                        <th>Ref</th>
                                        <th style={{ textAlign: 'right' }}>Amount</th>
                                        <th style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                Yield (%)
                                                <div className={styles.tooltipWrapper}>
                                                    <Info size={12} className={styles.infoIcon} />
                                                    <div className={styles.tooltip}>Annual Rate of Return expected from this asset.</div>
                                                </div>
                                            </div>
                                        </th>
                                        <th style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                Return
                                                <div className={styles.tooltipWrapper}>
                                                    <Info size={12} className={styles.infoIcon} />
                                                    <div className={styles.tooltip}>Total earnings generated by this asset so far.</div>
                                                </div>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAssets.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className={styles.emptyState}>
                                                {searchQuery ? 'No matching assets' : 'No assets deployed'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAssets.map(item => (
                                            <tr key={item.id}>
                                                <td style={{ fontWeight: 500 }}>{item.source}</td>
                                                <td style={{ color: 'var(--text-muted)' }}>{item.reference || '-'}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                    {formatCurrency(item.amount)}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={styles.rateTag} style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                                                        {item.rate}%
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                                                    {formatCurrency(item.cumulativeReturn)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    {/* Total Row */}
                                    {filteredAssets.length > 0 && (
                                        <tr style={{ background: 'var(--bg-tertiary)', borderTop: '2px solid var(--border-secondary)' }}>
                                            <td colSpan={2} style={{ fontWeight: 700 }}>
                                                {searchQuery ? 'Filtered Total' : 'Total'}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                                {formatCurrency(filteredAssets.reduce((sum, i) => sum + i.amount, 0))}
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 700 }}>
                                                -
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                                {formatCurrency(filteredAssets.reduce((sum, i) => sum + i.cumulativeReturn, 0))}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

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
                    .${styles.filterSection} {
                        display: none !important;
                    }
                    .print-header {
                        display: block !important;
                    }
                    /* Ensure tables print nicely */
                    table {
                        width: 100% !important;
                        font-size: 10pt !important;
                    }
                    th, td {
                        color: black !important;
                        border-bottom: 1px solid #ddd !important;
                    }
                    /* Hide tooltips in print */
                    .${styles.tooltipWrapper} .${styles.infoIcon},
                    .${styles.tooltip} {
                        display: none !important;
                    }
                    /* Adjust Card Colors for Print */
                    .${styles.summaryCard} {
                        border: 1px solid #eee !important;
                        background: none !important;
                        color: black !important;
                    }
                    .${styles.cardValue} {
                        color: black !important;
                    }
                    span[style*="#22c55e"] { color: #166534 !important; } /* Darker green for print */
                    span[style*="#fe4a49"] { color: #991b1b !important; } /* Darker red for print */
                }
            `}</style>
        </div>
    );
}
