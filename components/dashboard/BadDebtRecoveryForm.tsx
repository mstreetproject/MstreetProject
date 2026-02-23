'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/dashboard/useUser';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useCurrency } from '@/hooks/useCurrency';
import { useBadDebts, BadDebt } from '@/hooks/dashboard/useBadDebts';
import {
    AlertCircle,
    Banknote,
    CheckCircle,
    Clock,
    TrendingUp,
    Trash2,
    Edit3,
    X,
} from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import StatsCard from './StatsCard';
import DataTable, { Column } from './DataTable';
import formStyles from './CreateCreditForm.module.css';
import sharedStyles from '@/app/dashboard/internal/creditors/page.module.css';

// ─── StatusBadge ────────────────────────────────────────────────────────
const StatusBadge = ({ isRecovered, recoveryPercent }: { isRecovered: boolean; recoveryPercent: number }) => {
    if (isRecovered) {
        return (
            <span style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem',
                fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: 'rgba(16,185,129,0.15)', color: '#10b981'
            }}>
                <CheckCircle size={14} /> Recovered
            </span>
        );
    }
    if (recoveryPercent > 0) {
        return (
            <span style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem',
                fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: 'rgba(245,158,11,0.15)', color: '#f59e0b'
            }}>
                {recoveryPercent.toFixed(0)}% Partial
            </span>
        );
    }
    return (
        <span style={{
            padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem',
            fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: 'rgba(239,68,68,0.15)', color: '#ef4444'
        }}>
            Outstanding
        </span>
    );
};

// ─── Confirm Delete Modal ───────────────────────────────────────────────
function ConfirmDeleteModal({ isOpen, onClose, onConfirm, loading, debtorName, amount, formatCurrency }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    loading: boolean;
    debtorName: string;
    amount: number;
    formatCurrency: (n: number) => string;
}) {
    if (!isOpen) return null;
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: 'var(--bg-card)', borderRadius: '16px',
                padding: '32px', maxWidth: '420px', width: '90%',
                border: '1px solid var(--border-primary)',
                boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Delete Bad Debt Record</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                    Are you sure you want to delete the bad debt record for <strong>{debtorName}</strong>?
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 24px' }}>
                    Amount: <strong style={{ color: '#ef4444' }}>{formatCurrency(amount)}</strong>. This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} disabled={loading} style={{
                        padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border-primary)',
                        background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer',
                        fontWeight: 600, fontSize: '0.9rem'
                    }}>
                        Cancel
                    </button>
                    <button onClick={onConfirm} disabled={loading} style={{
                        padding: '10px 20px', borderRadius: '10px', border: 'none',
                        background: '#ef4444', color: 'white', cursor: 'pointer',
                        fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        {loading && <MStreetLoader size={16} color="#ffffff" />}
                        {loading ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Edit Recovery Modal ────────────────────────────────────────────────
function EditRecoveryModal({ isOpen, onClose, onSave, badDebt, loading, formatCurrency }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (recoveredAmount: number, isFullyRecovered: boolean) => void;
    badDebt: BadDebt | null;
    loading: boolean;
    formatCurrency: (n: number) => string;
}) {
    const [recoveredAmount, setRecoveredAmount] = useState('');
    const [isFullyRecovered, setIsFullyRecovered] = useState(false);

    useEffect(() => {
        if (badDebt) {
            setRecoveredAmount(String(badDebt.recovered_amount || 0));
            setIsFullyRecovered(badDebt.is_fully_recovered || false);
        }
    }, [badDebt]);

    if (!isOpen || !badDebt) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: 'var(--bg-card)', borderRadius: '16px',
                padding: '32px', maxWidth: '480px', width: '90%',
                border: '1px solid var(--border-primary)',
                boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Edit Recovery</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Info */}
                <div style={{
                    background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px',
                    marginBottom: '20px', border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {badDebt.loan?.debtor?.full_name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Original Amount: <strong style={{ color: '#ef4444' }}>{formatCurrency(badDebt.amount)}</strong>
                    </div>
                </div>

                {/* Fields */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px'
                    }}>
                        <Banknote size={16} /> Recovered Amount
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={badDebt.amount}
                        value={recoveredAmount}
                        onChange={(e) => setRecoveredAmount(e.target.value)}
                        className={formStyles.input}
                        placeholder="0.00"
                    />
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer'
                    }}>
                        <input
                            type="checkbox"
                            checked={isFullyRecovered}
                            onChange={(e) => setIsFullyRecovered(e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                        />
                        Mark as Fully Recovered
                    </label>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} disabled={loading} style={{
                        padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border-primary)',
                        background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer',
                        fontWeight: 600, fontSize: '0.9rem'
                    }}>
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(parseFloat(recoveredAmount) || 0, isFullyRecovered)}
                        disabled={loading}
                        style={{
                            padding: '10px 20px', borderRadius: '10px', border: 'none',
                            background: 'var(--accent-primary)', color: 'white', cursor: 'pointer',
                            fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        {loading && <MStreetLoader size={16} color="#ffffff" />}
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Format Date ────────────────────────────────────────────────────────
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
};

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function BadDebtRecoveryForm() {
    const { user } = useUser();
    const { logActivity } = useActivityLog();
    const { formatCurrency } = useCurrency();
    const { badDebts, stats, loading: badDebtsLoading, refetch } = useBadDebts();

    // ─── Record Recovery Form State ──────────────────────────────────
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState(false);
    const [formData, setFormData] = useState({
        loan_id: '',
        recovery_amount: '',
        full_recovery: false,
    });

    // ─── Edit Modal State ────────────────────────────────────────────
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<BadDebt | null>(null);
    const [editLoading, setEditLoading] = useState(false);

    // ─── Delete Modal State ──────────────────────────────────────────
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<BadDebt | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // ─── Submit Recovery ─────────────────────────────────────────────
    const handleRecordRecovery = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setFormSuccess(false);
        setFormLoading(true);

        try {
            if (!formData.loan_id || !formData.recovery_amount) {
                throw new Error('Please select a bad debt and enter a recovery amount');
            }

            const supabase = createClient();
            const recoveryAmount = parseFloat(formData.recovery_amount);

            if (recoveryAmount <= 0) throw new Error('Recovery amount must be greater than 0');

            // Find the selected bad debt for validation
            const selectedBadDebt = badDebts.find(bd => bd.loan_id === formData.loan_id);
            if (!selectedBadDebt) throw new Error('Selected bad debt not found');

            const remaining = Number(selectedBadDebt.amount) - Number(selectedBadDebt.recovered_amount || 0);
            if (recoveryAmount > remaining && !formData.full_recovery) {
                throw new Error(`Recovery amount exceeds outstanding balance of ${formatCurrency(remaining)}`);
            }

            // If this is a virtual entry (full_provision loan without bad_debts record), ensure one exists
            const isVirtual = selectedBadDebt.id.startsWith('virtual_');
            if (isVirtual) {
                const { error: upsertError } = await supabase
                    .from('bad_debts')
                    .upsert({
                        loan_id: formData.loan_id,
                        amount: selectedBadDebt.amount,
                        declared_date: selectedBadDebt.declared_date || new Date().toISOString().split('T')[0],
                        reason: 'Full provision — auto-detected from loan status',
                        recovered_amount: 0,
                        is_fully_recovered: false,
                    }, { onConflict: 'loan_id' });

                if (upsertError) throw new Error('Failed to ensure bad debt record: ' + upsertError.message);
            }

            // Call the RPC function
            const { data: result, error: rpcError } = await supabase
                .rpc('record_bad_debt_recovery', {
                    p_loan_id: formData.loan_id,
                    p_recovery_amount: recoveryAmount,
                    p_full_recovery: formData.full_recovery
                });

            if (rpcError) throw rpcError;

            const rpcResult = typeof result === 'string' ? JSON.parse(result) : result;
            if (!rpcResult?.success) {
                throw new Error(rpcResult?.error || 'Recovery failed');
            }

            // Log activity
            await logActivity('RECORD_BAD_DEBT_RECOVERY', 'bad_debt', selectedBadDebt.id, {
                loan_id: formData.loan_id,
                debtor_name: selectedBadDebt.loan?.debtor?.full_name,
                recovery_amount: recoveryAmount,
                full_recovery: formData.full_recovery
            });

            setFormSuccess(true);
            setFormData({ loan_id: '', recovery_amount: '', full_recovery: false });
            refetch();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to record recovery');
        } finally {
            setFormLoading(false);
        }
    };

    // ─── Edit Handler ────────────────────────────────────────────────
    const handleEditSave = async (recoveredAmount: number, isFullyRecovered: boolean) => {
        if (!editTarget) return;
        setEditLoading(true);

        try {
            const supabase = createClient();
            const isVirtual = editTarget.id.startsWith('virtual_');

            if (isVirtual) {
                // Virtual entry — upsert a real bad_debts record with recovery data
                const { error } = await supabase
                    .from('bad_debts')
                    .upsert({
                        loan_id: editTarget.loan_id,
                        amount: editTarget.amount,
                        declared_date: editTarget.declared_date || new Date().toISOString().split('T')[0],
                        reason: 'Full provision — auto-detected from loan status',
                        recovered_amount: recoveredAmount,
                        is_fully_recovered: isFullyRecovered,
                        recovery_date: recoveredAmount > 0 ? new Date().toISOString().split('T')[0] : null
                    }, { onConflict: 'loan_id' });
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('bad_debts')
                    .update({
                        recovered_amount: recoveredAmount,
                        is_fully_recovered: isFullyRecovered,
                        recovery_date: recoveredAmount > 0 ? new Date().toISOString().split('T')[0] : null
                    })
                    .eq('id', editTarget.id);
                if (error) throw error;
            }

            await logActivity('UPDATE_BAD_DEBT', 'bad_debt', editTarget.id, {
                recovered_amount: recoveredAmount,
                is_fully_recovered: isFullyRecovered,
                debtor_name: editTarget.loan?.debtor?.full_name,
            });

            setEditModalOpen(false);
            setEditTarget(null);
            refetch();
        } catch (err) {
            console.error('Edit bad debt error:', err);
        } finally {
            setEditLoading(false);
        }
    };

    // ─── Delete Handler ──────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);

        try {
            const supabase = createClient();
            const isVirtual = deleteTarget.id.startsWith('virtual_');

            if (!isVirtual) {
                // Only delete from DB if it's a real record
                const { error } = await supabase
                    .from('bad_debts')
                    .delete()
                    .eq('id', deleteTarget.id);
                if (error) throw error;
            }

            await logActivity('DELETE_BAD_DEBT', 'bad_debt', deleteTarget.id, {
                amount: deleteTarget.amount,
                debtor_name: deleteTarget.loan?.debtor?.full_name,
            });

            setDeleteModalOpen(false);
            setDeleteTarget(null);
            refetch();
        } catch (err) {
            console.error('Delete bad debt error:', err);
        } finally {
            setDeleteLoading(false);
        }
    };

    // ─── Outstanding bad debts for dropdown ──────────────────────────
    const outstandingDebts = badDebts.filter(bd => !bd.is_fully_recovered);

    // ─── Table Columns ───────────────────────────────────────────────
    const columns: Column[] = [
        {
            key: 'debtor',
            label: 'Debtor',
            width: '22%',
            render: (_, row: BadDebt) => (
                <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {row.loan?.debtor?.full_name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {row.loan?.debtor?.email || '—'}
                    </div>
                </div>
            )
        },
        {
            key: 'amount',
            label: 'Original Amount',
            width: '16%',
            align: 'right',
            render: (val) => (
                <div style={{ fontWeight: 600, color: '#ef4444' }}>
                    {formatCurrency(val)}
                </div>
            )
        },
        {
            key: 'recovered_amount',
            label: 'Recovered',
            width: '14%',
            align: 'right',
            render: (val) => (
                <div style={{ fontWeight: 600, color: '#10b981' }}>
                    {formatCurrency(val || 0)}
                </div>
            )
        },
        {
            key: 'remaining',
            label: 'Remaining',
            width: '14%',
            align: 'right',
            render: (_, row: BadDebt) => {
                const remaining = Number(row.amount || 0) - Number(row.recovered_amount || 0);
                return (
                    <div style={{ fontWeight: 600, color: remaining > 0 ? '#f59e0b' : '#10b981' }}>
                        {formatCurrency(remaining)}
                    </div>
                );
            }
        },
        {
            key: 'status',
            label: 'Status',
            width: '14%',
            align: 'center',
            render: (_, row: BadDebt) => {
                const recoveryPercent = Number(row.amount) > 0 ? ((Number(row.recovered_amount) || 0) / Number(row.amount) * 100) : 0;
                return (
                    <StatusBadge isRecovered={row.is_fully_recovered} recoveryPercent={recoveryPercent} />
                );
            }
        },
        {
            key: 'declared_date',
            label: 'Declared',
            width: '12%',
            render: (val) => formatDate(val)
        },
    ];

    // ─── Table Actions ───────────────────────────────────────────────
    const tableActions = [
        {
            label: 'Edit Recovery',
            icon: <Edit3 size={14} />,
            onClick: (row: BadDebt) => {
                setEditTarget(row);
                setEditModalOpen(true);
            },
        },
        {
            label: 'Delete',
            icon: <Trash2 size={14} />,
            variant: 'danger' as const,
            onClick: (row: BadDebt) => {
                setDeleteTarget(row);
                setDeleteModalOpen(true);
            },
        },
    ];

    return (
        <div>
            {/* ─── Record Recovery Form ─────────────────────────────── */}
            <form onSubmit={handleRecordRecovery} className={formStyles.form}>
                <h3 className={formStyles.formTitle}>Record Bad Debt Recovery</h3>
                <p className={formStyles.formSubtitle}>Record a recovery payment on a written-off debt</p>

                {formError && <div className={formStyles.errorMessage}>{formError}</div>}
                {formSuccess && <div className={formStyles.successMessage}>Recovery recorded successfully!</div>}

                <div className={formStyles.formGrid}>
                    <div className={formStyles.formGroup}>
                        <label htmlFor="loan_id" className={formStyles.label}>
                            <AlertCircle size={16} />
                            Bad Debt *
                        </label>
                        <select
                            id="loan_id"
                            value={formData.loan_id}
                            onChange={(e) => setFormData(d => ({ ...d, loan_id: e.target.value }))}
                            className={formStyles.select}
                            required
                            disabled={badDebtsLoading}
                        >
                            <option value="">
                                {badDebtsLoading ? 'Loading...' : 'Select a bad debt'}
                            </option>
                            {outstandingDebts.map(bd => (
                                <option key={bd.id} value={bd.loan_id}>
                                    {bd.loan?.debtor?.full_name || 'Unknown'} — {formatCurrency(Number(bd.amount) - Number(bd.recovered_amount || 0))} remaining
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={formStyles.formGroup}>
                        <label htmlFor="recovery_amount" className={formStyles.label}>
                            <Banknote size={16} />
                            Recovery Amount *
                        </label>
                        <input
                            id="recovery_amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.recovery_amount}
                            onChange={(e) => setFormData(d => ({ ...d, recovery_amount: e.target.value }))}
                            placeholder="0.00"
                            className={formStyles.input}
                            required
                        />
                    </div>
                </div>

                <div style={{ marginTop: '16px', marginBottom: '8px' }}>
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer'
                    }}>
                        <input
                            type="checkbox"
                            checked={formData.full_recovery}
                            onChange={(e) => setFormData(d => ({ ...d, full_recovery: e.target.checked }))}
                            style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                        />
                        Mark as Full Recovery (closes the bad debt)
                    </label>
                </div>

                <div className={formStyles.formFooter}>
                    <button
                        type="submit"
                        className={formStyles.submitBtn}
                        disabled={formLoading || badDebtsLoading}
                    >
                        {formLoading && <MStreetLoader size={18} color="#ffffff" />}
                        {formLoading ? 'Recording...' : 'Record Recovery'}
                    </button>
                </div>
            </form>

            {/* ─── Stats Cards ──────────────────────────────────────── */}
            <div className={sharedStyles.statsGrid} style={{ marginTop: '32px' }}>
                <StatsCard
                    title="Total Written Off"
                    value={formatCurrency(stats.totalAmount)}
                    change={`${stats.totalCount} debts`}
                    changeType="negative"
                    icon={AlertCircle}
                    loading={badDebtsLoading}
                />
                <StatsCard
                    title="Recovered"
                    value={formatCurrency(stats.recoveredAmount)}
                    change={`${stats.recoveredCount} recovered`}
                    changeType="positive"
                    icon={CheckCircle}
                    loading={badDebtsLoading}
                />
                <StatsCard
                    title="Outstanding"
                    value={formatCurrency(stats.outstandingAmount)}
                    change={`${stats.outstandingCount} pending`}
                    changeType="negative"
                    icon={Clock}
                    loading={badDebtsLoading}
                />
                <StatsCard
                    title="Recovery Rate"
                    value={stats.totalAmount > 0 ? `${((stats.recoveredAmount / stats.totalAmount) * 100).toFixed(1)}%` : '0%'}
                    change="of written off"
                    changeType={stats.recoveredAmount > 0 ? 'positive' : 'neutral'}
                    icon={TrendingUp}
                    loading={badDebtsLoading}
                />
            </div>

            {/* ─── Bad Debts Table ──────────────────────────────────── */}
            <div className={sharedStyles.section} style={{ marginTop: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 className={sharedStyles.sectionTitle}>All Bad Debts</h2>
                </div>

                {badDebts.length === 0 && !badDebtsLoading ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        background: 'var(--bg-card)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-primary)',
                    }}>
                        <AlertCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                        <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>No Bad Debts</h3>
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                            There are no loans marked as non-performing. Good job!
                        </p>
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={badDebts}
                        loading={badDebtsLoading}
                        emptyMessage="No bad debts found"
                        searchable
                        searchKeys={['loan.debtor.full_name', 'loan.debtor.email']}
                        paginated
                        defaultPageSize={10}
                        actions={tableActions}
                    />
                )}
            </div>

            {/* ─── Modals ───────────────────────────────────────────── */}
            <EditRecoveryModal
                isOpen={editModalOpen}
                onClose={() => { setEditModalOpen(false); setEditTarget(null); }}
                onSave={handleEditSave}
                badDebt={editTarget}
                loading={editLoading}
                formatCurrency={formatCurrency}
            />

            <ConfirmDeleteModal
                isOpen={deleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setDeleteTarget(null); }}
                onConfirm={handleDelete}
                loading={deleteLoading}
                debtorName={deleteTarget?.loan?.debtor?.full_name || 'Unknown'}
                amount={deleteTarget?.amount || 0}
                formatCurrency={formatCurrency}
            />
        </div>
    );
}
