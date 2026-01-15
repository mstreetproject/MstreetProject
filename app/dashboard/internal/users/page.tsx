'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DataTable, { Column, RowAction } from '@/components/dashboard/DataTable';
import StatsCard from '@/components/dashboard/StatsCard';
import { useUser } from '@/hooks/dashboard/useUser';
import { useRecentUsers } from '@/hooks/dashboard/useRecentUsers';
import { Users, UserPlus, Shield, Activity, Edit, UserX, Briefcase, DollarSign, TrendingUp } from 'lucide-react';
import UserManagementModal from '@/components/dashboard/UserManagementModal';
import styles from './page.module.css';
import { createClient } from '@/lib/supabase/client';

export default function UsersPage() {
    const { user, loading: userLoading } = useUser();
    // Fetch a large number of users for now.
    // Ideally we'd have server-side pagination, but client-side is fine for < 1000 users.
    const { users, loading: dataLoading, refetch } = useRecentUsers(500);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    // Filter states
    // 'all' | 'internal' | 'creditor' | 'debtor'
    const [filterType, setFilterType] = useState<string>('all');

    const isSuperAdmin = user?.roles?.some(role => role.name === 'super_admin');

    // Access Check
    if (userLoading) return <div className={styles.loading}><div className={styles.spinner}></div></div>;
    if (!isSuperAdmin) {
        return (
            <div className={styles.error}>
                <h1>Access Denied</h1>
                <p>Only Super Administrators can access User Management.</p>
            </div>
        );
    }

    // Filter Logic
    const filteredUsers = users.filter(u => {
        if (filterType === 'all') return true;
        if (filterType === 'internal') return u.is_internal;
        if (filterType === 'creditor') return u.is_creditor;
        if (filterType === 'debtor') return u.is_debtor;
        return true;
    });

    const activeUsers = users.filter(u => u.email_activated);

    // Stats
    const stats = {
        total: users.length,
        internal: users.filter(u => u.is_internal).length,
        creditors: users.filter(u => u.is_creditor).length,
        debtors: users.filter(u => u.is_debtor).length
    };

    // Handlers
    const handleEdit = (row: any) => {
        // Need to fetch user roles for the user to populate the form correctly?
        // useRecentUsers doesn't fetch roles by default (based on previous view_file).
        // The modal handles fetching/logic if we pass basic data, or we could fetch here.
        // For simplicity, we pass what we have; Modal might need role data or we can assume viewer/fetch inside modal?
        // Actually, let's just pass basic data to modal and let user re-select role if needed, or better, 
        // the modal should fetch current roles if editing. 
        // For this iteration, I'll pass the row data.
        setEditingUser(row);
        setIsModalOpen(true);
    };

    const handleDelete = async (row: any) => {
        if (!confirm(`Are you sure you want to delete ${row.full_name}? This cannot be undone.`)) return;

        try {
            const supabase = createClient();
            const { error } = await supabase.from('users').delete().eq('id', row.id);
            if (error) throw error;
            refetch();
        } catch (err: any) {
            alert('Error deleting user: ' + err.message);
        }
    };

    // Columns
    const columns: Column[] = [
        { key: 'full_name', label: 'Name' },
        { key: 'email', label: 'Email' },
        {
            key: 'roles',
            label: 'Type',
            render: (_, row) => (
                <div>
                    {row.is_internal && <span className={`${styles.roleBadge} ${styles.roleInternal}`}>Staff</span>}
                    {row.is_creditor && <span className={`${styles.roleBadge} ${styles.roleCreditor}`}>Creditor</span>}
                    {row.is_debtor && <span className={`${styles.roleBadge} ${styles.roleDebtor}`}>Debtor</span>}
                </div>
            )
        },
        {
            key: 'email_activated',
            label: 'Status',
            render: (val) => (
                <span className={val ? styles.statusSuccess : styles.statusNeutral} style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: val ? 'var(--success-bg)' : 'rgba(255,255,255,0.1)',
                    color: val ? 'var(--success)' : '#94A3B8'
                }}>
                    {val ? 'Active' : 'Pending'}
                </span>
            )
        }
    ];

    const actions: RowAction[] = [
        {
            label: 'Edit',
            icon: <Edit size={16} />,
            onClick: handleEdit
        },
        {
            label: 'Delete',
            icon: <UserX size={16} />,
            onClick: handleDelete,
            variant: 'danger'
        }
    ];

    return (
        <DashboardLayout currentUser={user || undefined}>
            <div className={styles.container}>
                <div className={styles.pageHeader}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>User Management</h1>
                        <p className={styles.pageSubtitle}>Centralized control for all platform users</p>
                    </div>
                    <div className={styles.headerRight}>
                        <button
                            className={styles.createBtn}
                            onClick={() => {
                                setEditingUser(null);
                                setIsModalOpen(true);
                            }}
                        >
                            <UserPlus size={20} />
                            <span>Create User</span>
                        </button>
                    </div>
                </div>

                <div className={styles.statsGrid}>
                    <StatsCard title="Total Users" value={stats.total} icon={Users} loading={dataLoading} />
                    <StatsCard title="Internal Staff" value={stats.internal} icon={Briefcase} loading={dataLoading} />
                    <StatsCard title="Creditors" value={stats.creditors} icon={DollarSign} loading={dataLoading} />
                    <StatsCard title="Debtors" value={stats.debtors} icon={TrendingUp} loading={dataLoading} />
                </div>

                {/* Simple Filters */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    {['all', 'internal', 'creditor', 'debtor'].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-primary)',
                                background: filterType === type ? 'var(--accent-primary)' : 'var(--bg-card)',
                                color: filterType === type ? '#070757' : 'var(--text-secondary)',
                                fontWeight: filterType === type ? 700 : 500,
                                textTransform: 'capitalize',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                <div className={styles.section}>
                    <DataTable
                        columns={columns}
                        data={filteredUsers}
                        actions={actions}
                        loading={dataLoading}
                        searchable
                        searchKeys={['full_name', 'email']}
                        paginated
                        defaultPageSize={10}
                    />
                </div>
            </div>

            <UserManagementModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    refetch();
                    setIsModalOpen(false);
                }}
                initialData={editingUser}
            />
        </DashboardLayout>
    );
}
