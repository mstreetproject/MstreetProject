'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DataTable, { Column, RowAction } from '@/components/dashboard/DataTable';
import StatsCard from '@/components/dashboard/StatsCard';
import TimePeriodFilter from '@/components/dashboard/TimePeriodFilter';
import DateRangeFilter from '@/components/dashboard/DateRangeFilter';
import CreditorFilter from '@/components/dashboard/CreditorFilter';
import { useUser } from '@/hooks/dashboard/useUser';
import { useCreditorStats } from '@/hooks/dashboard/useCreditorStats';
import { useUserCounts } from '@/hooks/dashboard/useUserCounts';
import { useCurrency } from '@/hooks/useCurrency';
import { createClient } from '@/lib/supabase/client';
import { calculateSimpleInterest } from '@/lib/interest';
import { DollarSign, TrendingUp, Users, CheckCircle, Wallet, PiggyBank, Edit, Trash2, FileText, UserPlus } from 'lucide-react';
import EditCreditModal from '@/components/dashboard/EditCreditModal';
import RecordPayoutModal from '@/components/dashboard/RecordPayoutModal';
import PayoutHistoryModal from '@/components/dashboard/PayoutHistoryModal';
import styles from './page.module.css';
import CreateCreditorModal from '@/components/dashboard/CreateCreditorModal';
import MStreetLoader from '@/components/ui/MStreetLoader';

// Format date
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

// Status badge
const StatusBadge = ({ status }: { status: string }) => {
    const getStatusClass = () => {
        switch (status) {
            case 'active':
                return styles.statusActive;
            case 'matured':
                return styles.statusSuccess;
            case 'withdrawn':
                return styles.statusNeutral;
            default:
                return styles.statusNeutral;
        }
    };

    return (
        <span className={`${styles.statusBadge} ${getStatusClass()}`}>
            {status}
        </span>
    );
};

import { useActivityLog } from '@/hooks/useActivityLog';

export default function CreditorsPage() {
    const { user, loading: userLoading } = useUser();
    const { logActivity } = useActivityLog();
    const {
        stats,
        credits,
        creditors,
        loading: creditsLoading,
        timePeriod,
        setTimePeriod,
        dateRange,
        setDateRange,
        selectedCreditor,
        setSelectedCreditor,
        refetch
    } = useCreditorStats('month');
    const { counts: userCounts } = useUserCounts();
    const { formatCurrency } = useCurrency();
    const [editingCredit, setEditingCredit] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [payoutCredit, setPayoutCredit] = useState<any>(null);
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [historyCreditId, setHistoryCreditId] = useState<string | null>(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [archivingId, setArchivingId] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Handle Edit
    const handleEdit = (row: any) => {
        setEditingCredit(row);
        setShowEditModal(true);
    };

    // Handle Payout
    const handlePayout = (row: any) => {
        setPayoutCredit(row);
        setShowPayoutModal(true);
    };

    // Handle View History
    const handleViewHistory = (row: any) => {
        setHistoryCreditId(row.id);
        setShowHistoryModal(true);
    };

    // Handle Archive (soft delete)
    const handleArchive = async (row: any) => {
        const reason = prompt(`Archive this credit for ${row.creditor?.full_name}?\n\nEnter reason (optional):`);
        if (reason !== null) {
            setArchivingId(row.id);
            try {
                const supabase = createClient();
                const { data: { user: authUser } } = await supabase.auth.getUser();

                const { error } = await supabase
                    .from('credits')
                    .update({
                        archived_at: new Date().toISOString(),
                        archived_by: authUser?.id,
                        archive_reason: reason || 'Archived by admin',
                    })
                    .eq('id', row.id);

                if (error) throw error;

                await logActivity('ARCHIVE_CREDIT', 'credit', row.id, { reason: reason || 'Archived by admin' });

                alert('Credit archived! It can be restored from the Archive page.');
                refetch();
            } catch (err: any) {
                alert(`Error archiving credit: ${err.message}`);
            } finally {
                setArchivingId(null);
            }
        }
    };

    // RBAC Guard
    const hasAccess = user?.roles?.some(
        role => ['super_admin', 'finance_manager', 'ops_officer'].includes(role.name)
    );

    if (userLoading) {
        return (
            <div className={styles.loading}>
                <MStreetLoader size={120} />
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Loading creditors...
                </p>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className={styles.error}>
                <h1>Access Denied</h1>
                <p>You do not have permission to view creditors.</p>
            </div>
        );
    }

    // Get selected creditor info
    const selectedCreditorInfo = selectedCreditor
        ? creditors.find(c => c.id === selectedCreditor)
        : null;

    // Table columns
    const columns: Column[] = [
        {
            key: 'creditor_name',
            label: 'Creditor',
            render: (_, row) => row.creditor?.full_name || 'N/A'
        },
        {
            key: 'principal',
            label: 'Principal',
            render: (value) => formatCurrency(value)
        },
        {
            key: 'interest_rate',
            label: 'Rate',
            render: (value) => `${value}%`
        },
        {
            key: 'tenure_months',
            label: 'Tenure',
            render: (value) => `${value}mo`
        },
        {
            key: 'current_accrued',
            label: 'Current Value',
            render: (_, row) => {
                // Use remaining_principal from DB (updated after payouts), fallback to principal
                const remaining = row.remaining_principal ?? row.principal;
                const interest = calculateSimpleInterest(remaining, row.interest_rate || 0, row.start_date);
                return formatCurrency(remaining + interest);
            }
        },
        {
            key: 'expected_maturity',
            label: 'Maturity Value',
            render: (_, row) => {
                // Principal + Total interest at end of tenure
                const principal = row.principal || 0;
                const rate = row.interest_rate || 0;
                const tenureMonths = row.tenure_months || 0;
                const totalInterest = principal * (rate / 100) * (tenureMonths / 12);
                return formatCurrency(principal + totalInterest);
            }
        },
        {
            key: 'maturity_date',
            label: 'Matures',
            render: (_, row) => {
                // Calculate end date from start_date + tenure
                if (row.end_date) {
                    return formatDate(row.end_date);
                }
                const startDate = new Date(row.start_date);
                startDate.setMonth(startDate.getMonth() + (row.tenure_months || 0));
                const isOverdue = startDate < new Date() && row.status === 'active';
                return (
                    <span style={{ color: isOverdue ? 'var(--danger)' : 'inherit' }}>
                        {formatDate(startDate.toISOString())}
                        {isOverdue && ' ⚠️'}
                    </span>
                );
            }
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => <StatusBadge status={value} />
        },
        {
            key: 'created_at',
            label: 'Date',
            render: (value) => formatDate(value)
        },
    ];

    // Row Actions
    const rowActions: RowAction[] = [
        {
            label: '💰 Record Payout',
            icon: <DollarSign size={16} />,
            onClick: handlePayout,
            hidden: (row) => row.status === 'withdrawn',
        },
        {
            label: '📜 History',
            icon: <FileText size={16} />,
            onClick: handleViewHistory,
        },
        {
            label: 'Edit',
            icon: <Edit size={16} />,
            onClick: handleEdit,
        },
        {
            label: archivingId ? 'Archiving...' : '📦 Archive',
            icon: archivingId ? <MStreetLoader size={16} color="var(--danger)" /> : <Trash2 size={16} />,
            onClick: handleArchive,
            variant: 'danger',
        },
    ];

    return (
        <DashboardLayout currentUser={user || undefined}>
            <div className={styles.container}>
                {/* Page Header */}
                <div className={styles.pageHeader}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>Creditors Management</h1>
                        <p className={styles.pageSubtitle}>
                            {selectedCreditorInfo
                                ? `Viewing: ${selectedCreditorInfo.full_name}`
                                : 'Manage all creditors and their credits'}
                        </p>
                    </div>
                    <div className={styles.headerRight}>
                        {/* Create Creditor Button */}
                        <button
                            className={styles.createBtn}
                            onClick={() => setShowCreateModal(true)}
                        >
                            <UserPlus size={20} />
                            <span>Add Creditor</span>
                        </button>

                        {/* Creditors Count Badge */}
                        <div className={styles.creditorsCount}>
                            <Users size={20} />
                            <span className={styles.countValue}>{userCounts.creditorCount}</span>
                            <span className={styles.countLabel}>Creditors</span>
                        </div>
                    </div>
                </div>

                {/* Filters Row */}
                <div className={styles.filtersRow}>
                    <CreditorFilter
                        creditors={creditors}
                        value={selectedCreditor}
                        onChange={setSelectedCreditor}
                    />
                    <TimePeriodFilter
                        value={timePeriod}
                        onChange={setTimePeriod}
                    />
                    <DateRangeFilter
                        value={dateRange}
                        onChange={setDateRange}
                    />
                </div>

                {/* Stats Grid */}
                <div className={styles.statsGrid}>
                    <StatsCard
                        title="Total Value"
                        value={formatCurrency(stats.totalCurrentValue)}
                        change={formatCurrency(stats.totalPrincipal)} // Show principal as subtext
                        changeType="neutral"
                        icon={Wallet}
                        loading={creditsLoading}
                    />
                    <StatsCard
                        title="Interest Accrued"
                        value={formatCurrency(stats.interestAccrued)}
                        changeType="positive"
                        icon={PiggyBank}
                        loading={creditsLoading}
                    />
                    <StatsCard
                        title="Active Credits"
                        value={stats.activeCount}
                        change={formatCurrency(stats.activeValue)} // Keeping active principal here
                        changeType="neutral"
                        icon={DollarSign}
                        loading={creditsLoading}
                    />
                    <StatsCard
                        title="Maturity Value"
                        value={formatCurrency(stats.totalMaturityValue)}
                        change={`${stats.maturedCount} matured`}
                        changeType="positive"
                        icon={TrendingUp}
                        loading={creditsLoading}
                    />
                    <StatsCard
                        title="Paid Out"
                        value={stats.paidOutCount}
                        change={formatCurrency(stats.paidOutValue)}
                        changeType="positive"
                        icon={CheckCircle}
                        loading={creditsLoading}
                    />
                </div>

                {/* Credits Table */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        {selectedCreditorInfo
                            ? `Credits for ${selectedCreditorInfo.full_name}`
                            : 'All Credits'}
                    </h2>
                    <DataTable
                        columns={columns}
                        data={credits}
                        loading={creditsLoading}
                        emptyMessage="No credits found"
                        searchable
                        searchPlaceholder="Search credits..."
                        searchKeys={['creditor.full_name', 'creditor.email', 'status']}
                        paginated
                        defaultPageSize={10}
                        actions={rowActions}
                    />
                </div>
            </div>

            {/* Edit Credit Modal */}
            <EditCreditModal
                isOpen={showEditModal}
                credit={editingCredit}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingCredit(null);
                }}
                onSuccess={() => {
                    refetch();
                }}
            />

            {/* Record Payout Modal */}
            <RecordPayoutModal
                isOpen={showPayoutModal}
                credit={payoutCredit}
                onClose={() => {
                    setShowPayoutModal(false);
                    setPayoutCredit(null);
                }}
                onSuccess={() => {
                    console.log('Payout successful - calling refetch');
                    refetch();
                }}
            />

            {/* Payout History Modal */}
            <PayoutHistoryModal
                isOpen={showHistoryModal}
                creditId={historyCreditId}
                onClose={() => {
                    setShowHistoryModal(false);
                    setHistoryCreditId(null);
                }}
            />

            {/* Create Creditor Modal */}
            <CreateCreditorModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    refetch();
                    setShowCreateModal(false);
                }}
            />
        </DashboardLayout >
    );
}
