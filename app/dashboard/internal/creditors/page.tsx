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
import { DollarSign, TrendingUp, Users, CheckCircle, Wallet, PiggyBank, UserPlus, Edit, Trash2 } from 'lucide-react';
import CreateCreditorModal from '@/components/dashboard/CreateCreditorModal';
import EditCreditModal from '@/components/dashboard/EditCreditModal';
import styles from './page.module.css';

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

export default function CreditorsPage() {
    const { user, loading: userLoading } = useUser();
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
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCredit, setEditingCredit] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // Handle Edit
    const handleEdit = (row: any) => {
        setEditingCredit(row);
        setShowEditModal(true);
    };

    // Handle Delete
    const handleDelete = async (row: any) => {
        if (!confirm(`Are you sure you want to delete this credit?\n\nCreditor: ${row.creditor?.full_name}\nAmount: ${formatCurrency(row.principal)}`)) {
            return;
        }

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('credits')
                .delete()
                .eq('id', row.id);

            if (error) throw error;
            alert('Credit deleted successfully');
            refetch();
        } catch (err: any) {
            alert(`Error deleting credit: ${err.message}`);
        }
    };

    // RBAC Guard
    const hasAccess = user?.roles?.some(
        role => ['super_admin', 'finance_manager', 'ops_officer'].includes(role.name)
    );

    if (userLoading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading...</p>
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
            label: 'Accrued Today',
            render: (_, row) => {
                // Principal + Interest accrued from start date to today
                const principal = row.principal || 0;
                const rate = row.interest_rate || 0;
                const startDate = new Date(row.start_date);
                const today = new Date();
                const daysElapsed = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                const interestAccrued = principal * (rate / 100) * (daysElapsed / 365);
                return formatCurrency(principal + interestAccrued);
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
            label: 'Edit',
            icon: <Edit size={16} />,
            onClick: handleEdit,
        },
        {
            label: 'Delete',
            icon: <Trash2 size={16} />,
            onClick: handleDelete,
            variant: 'danger',
        }
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
                        value={formatCurrency(stats.totalValue)}
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
                        change={formatCurrency(stats.activeValue)}
                        changeType="neutral"
                        icon={DollarSign}
                        loading={creditsLoading}
                    />
                    <StatsCard
                        title="Matured"
                        value={stats.maturedCount}
                        change={formatCurrency(stats.maturedValue)}
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
        </DashboardLayout >
    );
}
