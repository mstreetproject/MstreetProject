'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import StatsCard from '@/components/dashboard/StatsCard';
import DataTable, { Column, RowAction } from '@/components/dashboard/DataTable';
import TimePeriodFilter from '@/components/dashboard/TimePeriodFilter';
import DateRangeFilter from '@/components/dashboard/DateRangeFilter';
import CurrencySelector from '@/components/dashboard/CurrencySelector';
import EditExpenseModal from '@/components/dashboard/EditExpenseModal';
import { useUser } from '@/hooks/dashboard/useUser';
import { useExpenseStats } from '@/hooks/dashboard/useExpenseStats';
import { useCurrency } from '@/hooks/useCurrency';
import { useActivityLog } from '@/hooks/useActivityLog';
import { createClient } from '@/lib/supabase/client';
import {
    Receipt,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Calendar,
    BarChart3,
    Edit,
    Trash2
} from 'lucide-react';
import styles from '../creditors/page.module.css';

// Format date helper
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

export default function ExpensesPage() {
    const { user, loading: userLoading } = useUser();
    const {
        stats,
        expenses,
        loading: statsLoading,
        timePeriod,
        setTimePeriod,
        dateRange,
        setDateRange,
        refetch
    } = useExpenseStats();

    const { formatCurrency } = useCurrency();
    const { logActivity } = useActivityLog();
    const [editingExpense, setEditingExpense] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // Check permissions
    const hasAccess = user?.roles?.some(
        role => ['super_admin', 'finance_manager'].includes(role.name)
    );

    // Handle Edit
    const handleEdit = (row: any) => {
        setEditingExpense(row);
        setShowEditModal(true);
    };

    // Handle Delete
    const handleDelete = async (row: any) => {
        if (!confirm(`Are you sure you want to delete this expense?\n\nName: ${row.expense_name}\nAmount: ${formatCurrency(row.amount)}`)) {
            return;
        }

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('operating_expenses')
                .delete()
                .eq('id', row.id);

            if (error) throw error;

            // Log the deletion
            await logActivity('DELETE_EXPENSE', 'expense', row.id, {
                expense_name: row.expense_name,
                amount: row.amount,
                expense_month: row.expense_month,
            });

            alert('Expense deleted successfully');
            refetch();
        } catch (err: any) {
            alert(`Error deleting expense: ${err.message}`);
        }
    };

    if (userLoading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading expenses...</p>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className={styles.error}>
                <h1>Access Denied</h1>
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }

    // Table Columns
    const columns: Column[] = [
        {
            key: 'expense_name',
            label: 'Expense Name',
            render: (value) => <strong>{value}</strong>
        },
        {
            key: 'amount',
            label: 'Amount',
            render: (value) => formatCurrency(value)
        },
        {
            key: 'expense_month',
            label: 'Month',
            render: (value) => <span style={{ textTransform: 'capitalize' }}>{value}</span>
        },
        {
            key: 'created_by',
            label: 'Created By',
            render: (_, row) => row.users?.full_name || row.created_by || 'System'
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
                {/* Header */}
                <div className={styles.pageHeader}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>Operating Expenses</h1>
                        <p className={styles.pageSubtitle}>Track and manage company expenses</p>
                    </div>
                    <div className={styles.headerRight}>
                        <div className={styles.expensesCount}>
                            <Receipt size={20} />
                            <span className={styles.countValue}>{stats.totalCount}</span>
                            <span className={styles.countLabel}>Records</span>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className={styles.filtersRow}>
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
                        title="Total Expenses"
                        value={formatCurrency(stats.totalValue)}
                        change={`${stats.totalCount} records`}
                        changeType="neutral"
                        icon={DollarSign}
                        loading={statsLoading}
                    />
                    <StatsCard
                        title="Average Expense"
                        value={formatCurrency(stats.averageValue)}
                        changeType="neutral"
                        icon={BarChart3}
                        loading={statsLoading}
                    />
                    <StatsCard
                        title="Highest Expense"
                        value={formatCurrency(stats.highestValue)}
                        changeType="negative"
                        icon={TrendingUp}
                        loading={statsLoading}
                    />
                </div>

                {/* Data Table */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Expense History</h2>
                    <DataTable
                        columns={columns}
                        data={expenses}
                        loading={statsLoading}
                        searchable
                        searchKeys={['expense_name', 'expense_month', 'created_by']}
                        paginated
                        defaultPageSize={10}
                        emptyMessage="No expenses found for the selected period"
                        actions={rowActions}
                    />
                </div>
            </div>

            {/* Edit Expense Modal */}
            <EditExpenseModal
                isOpen={showEditModal}
                expense={editingExpense}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingExpense(null);
                }}
                onSuccess={() => {
                    refetch();
                }}
            />
        </DashboardLayout>
    );
}

