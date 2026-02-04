'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useUser } from '@/hooks/dashboard/useUser';
import { useAllInvestments, Investment } from '@/hooks/dashboard/useAllInvestments';
import {
    TrendingUp,
    Plus,
    Search,
    Filter,

    Trash2,
    DollarSign,
    Building2,
    FileText,
    ArrowUpRight
} from 'lucide-react';
import DocumentViewerModal from '@/components/dashboard/DocumentViewerModal';
import MStreetLoader from '@/components/ui/MStreetLoader';
import StatsCard from '@/components/dashboard/StatsCard';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import styles from './InvestmentsPage.module.css';

export default function InvestmentsDashboard() {
    const { user, loading: userLoading } = useUser();
    const { investments, loading, stats, refresh } = useAllInvestments();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const [selectedDoc, setSelectedDoc] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);

    // RBAC Guard
    const hasAccess = user?.roles?.some(
        role => ['super_admin', 'finance_manager', 'ops_officer'].includes(role.name)
    );

    if (userLoading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
                <MStreetLoader size={40} color="var(--accent-primary)" />
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <DashboardLayout currentUser={user || undefined}>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <h1 style={{ color: 'var(--text-primary)' }}>Access Denied</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>You do not have permission to view this page.</p>
                </div>
            </DashboardLayout>
        );
    }

    const filteredInvestments = investments.filter(inv => {
        const matchesSearch = inv.investee_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
        }).format(amount);
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
                liquidation_notes: 'Cashed out via dashboard'
            })
            .eq('id', investment.id);

        if (error) {
            alert('Failed to cash out: ' + error.message);
        } else {
            refresh();
        }
    };

    return (
        <DashboardLayout currentUser={user || undefined}>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.pageHeader}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>Company Investments</h1>
                        <p className={styles.pageSubtitle}>Manage MStreet's outward investments and ROI</p>
                    </div>
                    <div className={styles.headerRight}>
                        <Link href="/dashboard/internal/operations?tab=investment" className={styles.addBtn}>
                            <Plus size={18} />
                            Record New Investment
                        </Link>
                    </div>
                </div>

                {/* Stats */}
                <div className={styles.statsGrid}>
                    <StatsCard
                        title="Total Active Principal"
                        value={formatCurrency(stats.totalInvested)}
                        icon={TrendingUp}
                        tooltip="Sum of principal for all investments with 'active' status"
                    />
                    <StatsCard
                        title="Expected ROI Assets"
                        value={formatCurrency(stats.totalROIExpected)}
                        icon={ArrowUpRight}
                        tooltip="Calculated ROI assets based on tenure and rate for active projects"
                    />
                    <StatsCard
                        title="Completed Exits"
                        value={investments.filter(i => i.status === 'liquidated').length.toString()}
                        icon={DollarSign}
                        tooltip="Number of investments that have been fully liquidated/cashed out"
                    />
                </div>

                {/* Filters */}
                <div className={styles.filtersBar}>
                    <div className={styles.searchBox}>
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search companies..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <Filter size={18} />
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="matured">Matured</option>
                            <option value="liquidated">Liquidated</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className={styles.tableCard}>
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <MStreetLoader size={30} color="var(--accent-primary)" />
                        </div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Investee</th>
                                    <th>Principal</th>
                                    <th>ROI Rate</th>
                                    <th>Tenure</th>
                                    <th>Start Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvestments.map((inv) => (
                                    <tr key={inv.id}>
                                        <td>
                                            <div className={styles.investeeCell}>
                                                <div className={styles.investeeIcon}>
                                                    <Building2 size={16} />
                                                </div>
                                                <span>{inv.investee_name}</span>
                                            </div>
                                        </td>
                                        <td className={styles.bold}>{formatCurrency(inv.principal)}</td>
                                        <td>{inv.roi_rate}%</td>
                                        <td>{inv.tenure_months} Months</td>
                                        <td>{new Date(inv.start_date).toLocaleDateString()}</td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${styles[inv.status]}`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.actions}>
                                                {(inv.status === 'active' || inv.status === 'matured') && (
                                                    <button
                                                        onClick={() => handleCashOut(inv)}
                                                        className={styles.cashOutBtn}
                                                        title="Cash Out / Liquidate"
                                                    >
                                                        <DollarSign size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(inv.id)}
                                                    className={styles.deleteBtn}
                                                    title="Delete Record"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                {inv.documents && inv.documents.length > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            const doc = inv.documents[0];
                                                            setSelectedDoc({
                                                                id: doc.id,
                                                                file_url: doc.file_url,
                                                                file_name: doc.file_name,
                                                                type: 'investment_letter',
                                                                user_name: inv.investee_name,
                                                                investment_id: inv.id,
                                                                investee_id: inv.investee_id
                                                            });
                                                            setShowModal(true);
                                                        }}
                                                        className={styles.docBtn}
                                                        title="View Document"
                                                    >
                                                        <FileText size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredInvestments.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className={styles.emptyRow}>
                                            No investments found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
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
        </DashboardLayout>
    );
}
