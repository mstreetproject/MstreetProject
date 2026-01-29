'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useUser } from '@/hooks/dashboard/useUser';
import { createClient } from '@/lib/supabase/client';
import { Trash2, Filter, Calendar, Eye } from 'lucide-react';
import LogDetailsModal from '@/components/dashboard/LogDetailsModal';
import styles from './page.module.css';
import MStreetLoader from '@/components/ui/MStreetLoader';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';

interface AuditLog {
    id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: any;
    created_at: string;
    user?: {
        full_name: string;
        email: string;
    };
}

export default function AuditLogsPage() {
    const { user, loading: initialUserLoading } = useUser();
    const userLoading = useDelayedLoading(initialUserLoading, 1500);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [initialFetchLoading, setInitialFetchLoading] = useState(true);
    const loading = useDelayedLoading(initialFetchLoading, 1500);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [actionFilter, setActionFilter] = useState('');
    const [entityFilter, setEntityFilter] = useState('');

    const fetchLogs = useCallback(async () => {
        try {
            setInitialFetchLoading(true);
            const supabase = createClient();

            let query = supabase
                .from('audit_logs')
                .select(`
                    *,
                    user:users(full_name, email)
                `)
                .order('created_at', { ascending: false });

            if (actionFilter) {
                query = query.eq('action', actionFilter);
            }
            if (entityFilter) {
                query = query.eq('entity_type', entityFilter);
            }

            const { data, error } = await query;

            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            console.error('Error fetching logs:', err);
        } finally {
            setInitialFetchLoading(false);
        }
    }, [actionFilter, entityFilter]);

    useEffect(() => {
        if (user) {
            fetchLogs();
        }
    }, [user, fetchLogs]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this log entry?')) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('audit_logs')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setLogs(logs.filter(log => log.id !== id));
        } catch (err) {
            alert('Failed to delete log');
        }
    };

    const isSuperAdmin = user?.roles?.some(r => r.name === 'super_admin');

    if (userLoading) {
        return (
            <div className={styles.loading}>
                <MStreetLoader size={120} />
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Loading audit logs...
                </p>
            </div>
        );
    }

    if (!isSuperAdmin) {
        return (
            <DashboardLayout currentUser={user || undefined}>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <h1>Access Denied</h1>
                    <p>Only Super Admins can view audit logs.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout currentUser={user || undefined}>
            <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-primary)' }}>System Activities</h1>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                            Audit log of all user actions
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-secondary)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                        <option value="">All Actions</option>
                        <optgroup label="Authentication">
                            <option value="LOGIN">Login</option>
                            <option value="LOGOUT">Logout</option>
                        </optgroup>
                        <optgroup label="Users">
                            <option value="CREATE_USER">Create User</option>
                            <option value="UPDATE_USER">Update User</option>
                            <option value="DELETE_USER">Delete User</option>
                        </optgroup>
                        <optgroup label="Loans">
                            <option value="CREATE_LOAN">Create Loan</option>
                            <option value="UPDATE_LOAN">Update Loan</option>
                            <option value="APPROVE_LOAN">Approve Loan</option>
                            <option value="REJECT_LOAN">Reject Loan</option>
                            <option value="RESTORE_LOAN">Restore Loan</option>
                            <option value="DELETE_LOAN">Delete Loan</option>
                        </optgroup>
                        <optgroup label="Credits">
                            <option value="CREATE_CREDIT">Create Credit</option>
                            <option value="UPDATE_CREDIT">Update Credit</option>
                            <option value="ARCHIVE_CREDIT">Archive Credit</option>
                            <option value="RESTORE_CREDIT">Restore Credit</option>
                            <option value="DELETE_CREDIT">Delete Credit</option>
                        </optgroup>
                        <optgroup label="Loan Requests">
                            <option value="APPROVE_LOAN_REQUEST">Approve Request</option>
                            <option value="REJECT_LOAN_REQUEST">Reject Request</option>
                            <option value="UPDATE_LOAN_REQUEST">Update Request</option>
                            <option value="ARCHIVE_LOAN_REQUEST">Archive Request</option>
                            <option value="RESTORE_LOAN_REQUEST">Restore Request</option>
                            <option value="DELETE_LOAN_REQUEST">Delete Request</option>
                        </optgroup>
                        <optgroup label="Payment Uploads">
                            <option value="CREATE_PAYMENT_UPLOAD">Submit Payment</option>
                            <option value="APPROVE_PAYMENT_UPLOAD">Approve Payment</option>
                            <option value="REJECT_PAYMENT_UPLOAD">Reject Payment</option>
                            <option value="ARCHIVE_PAYMENT_UPLOAD">Archive Payment</option>
                            <option value="RESTORE_PAYMENT_UPLOAD">Restore Payment</option>
                            <option value="DELETE_PAYMENT_UPLOAD">Delete Payment</option>
                        </optgroup>
                        <optgroup label="Expenses">
                            <option value="CREATE_EXPENSE">Create Expense</option>
                            <option value="UPDATE_EXPENSE">Update Expense</option>
                            <option value="DELETE_EXPENSE">Delete Expense</option>
                        </optgroup>
                        <optgroup label="Payouts">
                            <option value="RECORD_PAYOUT">Record Payout</option>
                            <option value="RECORD_REPAYMENT">Record Repayment</option>
                        </optgroup>
                    </select>

                    <select
                        value={entityFilter}
                        onChange={(e) => setEntityFilter(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-secondary)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                        <option value="">All Entities</option>
                        <option value="user">User</option>
                        <option value="loan">Loan</option>
                        <option value="credit">Credit</option>
                        <option value="loan_request">Loan Request</option>
                        <option value="payment_upload">Payment Upload</option>
                        <option value="expense">Expense</option>
                        <option value="payout">Payout</option>
                        <option value="system">System</option>
                    </select>
                </div>

                {/* Table */}
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-tertiary)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-tertiary)' }}>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>User</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Action</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Entity</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Details</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Date</th>
                                <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center' }}>
                                        <MStreetLoader size={60} />
                                        <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            Fetching activity logs...
                                        </p>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No logs found matching filters.
                                    </td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-tertiary)' }}>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ fontWeight: 500 }}>{log.user?.full_name || 'Unknown'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.user?.email}</div>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                background: 'var(--accent-bg)',
                                                color: 'var(--accent-primary)',
                                                fontSize: '0.85rem',
                                                fontWeight: 500
                                            }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{log.entity_type}</td>
                                        <td style={{ padding: '16px' }}>
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--border-primary)',
                                                    background: 'var(--bg-tertiary)',
                                                    color: 'var(--accent-primary)',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                <Eye size={14} />
                                                View Details
                                            </button>
                                        </td>
                                        <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleDelete(log.id)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: 'var(--danger)',
                                                    padding: '4px'
                                                }}
                                                title="Delete Log"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <LogDetailsModal
                isOpen={!!selectedLog}
                log={selectedLog}
                onClose={() => setSelectedLog(null)}
            />
        </DashboardLayout>
    );
}
