'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DataTable, { Column, RowAction } from '@/components/dashboard/DataTable';
import StatsCard from '@/components/dashboard/StatsCard';
import { useUser } from '@/hooks/dashboard/useUser';
import { useRecentUsers } from '@/hooks/dashboard/useRecentUsers';
import { useUserCounts } from '@/hooks/dashboard/useUserCounts';
import { Users, UserPlus, Shield, Activity, Edit, Trash2, UserX } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from '../creditors/page.module.css';

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

// Edit Role Modal
const EditRoleModal = ({ userId, userEmail, onClose, onUpdate }: {
    userId: string;
    userEmail: string;
    onClose: () => void;
    onUpdate: () => void;
}) => {
    const [selectedRole, setSelectedRole] = useState('ops_officer');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const supabase = createClient();

            const { data: roleData } = await supabase
                .from('roles')
                .select('id')
                .eq('name', selectedRole)
                .single();

            if (!roleData) throw new Error('Role not found');

            await supabase
                .from('user_roles')
                .delete()
                .eq('user_id', userId);

            const { error } = await supabase
                .from('user_roles')
                .insert({
                    user_id: userId,
                    role_id: roleData.id
                });

            if (error) throw error;

            alert('Role updated successfully');
            onUpdate();
            onClose();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
        }}
            onClick={onClose}
        >
            <div style={{
                background: 'rgba(7, 7, 87, 0.98)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(2, 179, 255, 0.2)',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '400px',
                width: '90%'
            }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 style={{ color: '#fff', marginBottom: '8px', fontSize: '1.5rem' }}>Edit User Role</h3>
                <p style={{ color: '#94A3B8', marginBottom: '24px' }}>{userEmail}</p>

                <form onSubmit={handleSubmit}>
                    <label style={{
                        display: 'block',
                        color: '#E2E8F0',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        marginBottom: '8px'
                    }}>
                        Select Role
                    </label>
                    <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'white',
                            fontSize: '1rem',
                            marginBottom: '24px'
                        }}
                    >
                        <option value="super_admin" style={{ background: '#070757', color: 'white' }}>Super Admin</option>
                        <option value="finance_manager" style={{ background: '#070757', color: 'white' }}>Finance Manager</option>
                        <option value="ops_officer" style={{ background: '#070757', color: 'white' }}>Operations Officer</option>
                        <option value="risk_officer" style={{ background: '#070757', color: 'white' }}>Risk Officer</option>
                    </select>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#94A3B8',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #02B3FF, #B8DB0F)',
                                color: '#070757',
                                fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1
                            }}
                        >
                            {loading ? 'Updating...' : 'Update Role'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function StaffPage() {
    const { user, loading: userLoading } = useUser();
    const { users, loading: usersLoading, refetch } = useRecentUsers(100);
    const { counts: userCounts, loading: countsLoading } = useUserCounts();
    const [editingUser, setEditingUser] = useState<{ id: string; email: string } | null>(null);

    const isSuperAdmin = user?.roles?.some(role => role.name === 'super_admin');

    // Action handlers
    const handleDelete = async (row: any) => {
        if (!confirm(`Are you sure you want to delete user ${row.email}?`)) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', row.id);

            if (error) throw error;
            alert('User deleted successfully');
            refetch?.();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleSuspend = async (row: any) => {
        if (!confirm(`Are you sure you want to suspend user ${row.email}?`)) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('users')
                .update({ email_activated: false })
                .eq('id', row.id);

            if (error) throw error;
            alert('User suspended successfully');
            refetch?.();
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleEdit = (row: any) => {
        setEditingUser({ id: row.id, email: row.email });
    };

    if (userLoading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!isSuperAdmin) {
        return (
            <div className={styles.error}>
                <h1>Access Denied</h1>
                <p>Only super administrators can access staff management.</p>
            </div>
        );
    }

    const staffMembers = users.filter(u => u.is_internal);
    const activeStaff = staffMembers.filter(u => u.email_activated);

    const columns: Column[] = [
        { key: 'full_name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        {
            key: 'email_activated',
            label: 'Status',
            render: (value) => (
                <span className={value ? styles.statusSuccess : styles.statusNeutral} style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600
                }}>
                    {value ? 'Active' : 'Pending'}
                </span>
            )
        },
        {
            key: 'created_at',
            label: 'Joined',
            render: (value) => formatDate(value)
        }
    ];

    const rowActions: RowAction[] = [
        {
            label: 'Edit Role',
            icon: <Edit size={16} />,
            onClick: handleEdit,
        },
        {
            label: 'Suspend',
            icon: <UserX size={16} />,
            onClick: handleSuspend,
            hidden: (row) => !row.email_activated, // Hide if already suspended
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
                <div className={styles.pageHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 className={styles.pageTitle}>Staff Management</h1>
                        <p className={styles.pageSubtitle}>
                            Manage internal staff accounts and permissions
                        </p>
                    </div>

                </div>

                <div className={styles.statsGrid}>
                    <StatsCard
                        title="Total Staff"
                        value={userCounts.internalCount}
                        icon={Users}
                        loading={countsLoading}
                    />
                    <StatsCard
                        title="Active Staff"
                        value={userCounts.activeInternalCount}
                        icon={Activity}
                        loading={countsLoading}
                    />
                    <StatsCard
                        title="Pending Activation"
                        value={userCounts.internalCount - userCounts.activeInternalCount}
                        icon={Shield}
                        loading={countsLoading}
                    />
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>All Staff Members</h2>
                    <DataTable
                        columns={columns}
                        data={staffMembers}
                        loading={usersLoading}
                        emptyMessage="No staff members found"
                        actions={rowActions}
                        searchable
                        searchPlaceholder="Search staff..."
                        searchKeys={['full_name', 'email', 'phone']}
                        paginated
                        defaultPageSize={10}
                    />
                </div>
            </div>

            {
                editingUser && (
                    <EditRoleModal
                        userId={editingUser.id}
                        userEmail={editingUser.email}
                        onClose={() => setEditingUser(null)}
                        onUpdate={() => {
                            refetch?.();
                            setEditingUser(null);
                        }}
                    />
                )
            }
        </DashboardLayout >
    );
}

