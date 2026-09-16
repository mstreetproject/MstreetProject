'use client';

import React, { useState, useMemo } from 'react';
import { useAllInvestments, Investment } from '@/hooks/dashboard/useAllInvestments';
import { useCurrency } from '@/hooks/useCurrency';
import { createClient } from '@/lib/supabase/client';
import DataTable, { Column, RowAction } from './DataTable';
import StatsCard from './StatsCard';
import DocumentViewerModal from './DocumentViewerModal';
import {
    TrendingUp,
    ArrowUpRight,
    DollarSign,
    Building2,
    Calendar,
    Trash2,
    Clock,
    FileText
} from 'lucide-react';
import styles from './ManageInvestments.module.css';

interface ManageInvestmentsProps {
    hideHeader?: boolean;
}

export default function ManageInvestments({ hideHeader = false }: ManageInvestmentsProps) {
    const { investments, loading, stats, refresh } = useAllInvestments();
    const { formatCurrency } = useCurrency();
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedDoc, setSelectedDoc] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);

    const maturingSoon = useMemo(() => {
        const now = new Date();
        const thirtyDaysOut = new Date();
        thirtyDaysOut.setDate(now.getDate() + 30);

        return investments.filter(inv => {
            if (inv.status !== 'active') return false;
            const endDate = new Date(inv.end_date);
            return endDate <= thirtyDaysOut && endDate >= now;
        }).length;
    }, [investments]);

    const filteredInvestments = useMemo(() => {
        if (filterStatus === 'all') return investments;
        if (filterStatus === 'maturing') {
            const now = new Date();
            const thirtyDaysOut = new Date();
            thirtyDaysOut.setDate(now.getDate() + 30);
            return investments.filter(inv => {
                const endDate = new Date(inv.end_date);
                return inv.status === 'active' && endDate <= thirtyDaysOut;
            });
        }
        return investments.filter(inv => inv.status === filterStatus);
    }, [investments, filterStatus]);

    const handleCashOut = async (investment: Investment) => {
        const amount = prompt(`Enter liquidation amount for ${investment.investee_name}:`, investment.principal.toString());
        if (amount === null) return;

        const supabase = createClient();
        const { error } = await supabase
            .from('investments')
            .update({
                status: 'liquidated',
                liquidated_at: new Date().toISOString(),
                liquidation_amount: parseFloat(amount),
                liquidation_notes: 'Cashed out via operations dashboard'
            })
            .eq('id', investment.id);

        if (error) {
            alert('Failed to cash out: ' + error.message);
        } else {
            refresh();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this investment record?')) return;

        const supabase = createClient();
        const { error } = await supabase.from('investments').delete().eq('id', id);

        if (error) {
            alert('Failed to delete: ' + error.message);
        } else {
            refresh();
        }
    };

    const columns: Column[] = [
        {
            key: 'investee_name',
            label: 'Investment',
            render: (val) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-primary)'
                    }}>
                        <Building2 size={16} />
                    </div>
                    <span style={{ fontWeight: 600 }}>{val}</span>
                </div>
            )
        },
        {
            key: 'principal',
            label: 'Principal',
            render: (val) => <span style={{ fontWeight: 700 }}>{formatCurrency(val)}</span>
        },
        {
            key: 'roi_rate',
            label: 'ROI (%)',
            render: (val) => `${val}%`,
            width: '80px',
            align: 'center'
        },
        {
            key: 'end_date',
            label: 'Maturity Date',
            render: (val) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                    {new Date(val).toLocaleDateString()}
                </div>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (val) => {

                return (
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: val === 'active' ? 'rgba(2, 179, 255, 0.1)' :
                            val === 'liquidated' ? 'rgba(34, 197, 94, 0.1)' :
                                val === 'matured' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                        color: val === 'active' ? 'var(--accent-primary)' :
                            val === 'liquidated' ? '#22c55e' :
                                val === 'matured' ? '#3b82f6' : '#6b7280'
                    }}>
                        {val}
                    </span>
                );
            }
        }
    ];

    const actions: RowAction[] = [
        {
            label: 'Cash Out / Liquidate',
            icon: <DollarSign size={16} />,
            onClick: handleCashOut,
            hidden: (row) => row.status !== 'active' && row.status !== 'matured'
        },
        {
            label: 'View Documents',
            icon: <FileText size={16} />,
            onClick: (row) => {
                if (row.documents?.length > 0) {
                    const doc = row.documents[0];
                    setSelectedDoc({
                        id: doc.id,
                        file_url: doc.file_url,
                        file_name: doc.file_name,
                        type: 'investment_letter',
                        user_name: row.investee_name,
                        investment_id: row.id,
                        investee_id: row.investee_id
                    });
                    setShowModal(true);
                } else {
                    alert('No documents found for this investment.');
                }
            },
            hidden: (row) => !row.documents || row.documents.length === 0
        },
        {
            label: 'Delete Record',
            icon: <Trash2 size={16} />,
            onClick: (row) => handleDelete(row.id),
            variant: 'danger'
        }
    ];

    return (
        <div className={styles.container}>
            {!hideHeader && (
                <div className={styles.header}>
                    <h3 className={styles.title}>Investment Portfolio Management</h3>
                    <p className={styles.subtitle}>Track maturity, ROI, and liquidations for company investments</p>
                </div>
            )}

            <div className={styles.statsGrid}>
                <StatsCard
                    title="Active Investments"
                    value={stats.activeCount}
                    icon={TrendingUp}
                    tooltip="Number of current ongoing investments"
                />
                <StatsCard
                    title="Maturing Soon"
                    value={maturingSoon}
                    icon={Clock}
                    tooltip="Active investments maturing within the next 30 days"
                />
                <StatsCard
                    title="Expected ROI"
                    value={formatCurrency(stats.totalROIExpected)}
                    icon={ArrowUpRight}
                    tooltip="Estimated return on investment for all active projects"
                />
            </div>

            <div className={styles.filterTabs}>
                <button
                    className={`${styles.filterTab} ${filterStatus === 'all' ? styles.active : ''}`}
                    onClick={() => setFilterStatus('all')}
                >
                    All Tracked
                </button>
                <button
                    className={`${styles.filterTab} ${filterStatus === 'active' ? styles.active : ''}`}
                    onClick={() => setFilterStatus('active')}
                >
                    Active
                </button>
                <button
                    className={`${styles.filterTab} ${filterStatus === 'maturing' ? styles.active : ''}`}
                    onClick={() => setFilterStatus('maturing')}
                >
                    Maturing Soon
                </button>
                <button
                    className={`${styles.filterTab} ${filterStatus === 'liquidated' ? styles.active : ''}`}
                    onClick={() => setFilterStatus('liquidated')}
                >
                    Archived / Paid Out
                </button>
            </div>

            <div className={styles.tableCard}>
                <DataTable
                    columns={columns}
                    data={filteredInvestments}
                    loading={loading}
                    emptyMessage="No investments found matching this criteria"
                    actions={actions}
                    searchable
                    searchPlaceholder="Search companies..."
                    paginated
                    defaultPageSize={10}
                />
            </div>

            {/* Document Viewer Modal */}
            <DocumentViewerModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setSelectedDoc(null);
                }}
                document={selectedDoc}
                onDelete={refresh}
                onUpdate={refresh}
            />
        </div>
    );
}
