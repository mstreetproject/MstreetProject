'use client';

import React, { useState } from 'react';
import DataTable, { Column, RowAction } from '@/components/dashboard/DataTable';
import { useDebtorStats } from '@/hooks/dashboard/useDebtorStats';
import { useCurrency } from '@/hooks/useCurrency';
import { DollarSign, FileText, Edit, Trash2 } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import styles from '@/app/dashboard/internal/creditors/page.module.css';
import EditLoanModal from '@/components/dashboard/EditLoanModal';
import RecordRepaymentModal from '@/components/dashboard/RecordRepaymentModal';
import LoanHistoryModal from '@/components/dashboard/LoanHistoryModal';
import LoanDetailsModal from '@/components/dashboard/LoanDetailsModal';
import { createClient } from '@/lib/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';

interface RepaymentTableProps {
    initialLoans?: any[];
    isLoading?: boolean;
    onRefresh?: () => void;
    initialDebtorId?: string | null;
}

export default function RepaymentTable({
    initialLoans,
    isLoading,
    onRefresh,
    initialDebtorId = null
}: RepaymentTableProps) {
    const {
        loans: hookedLoans,
        loading: hookedLoading,
        refetch: hookedRefetch
    } = useDebtorStats('all');

    // Use props if provided, otherwise use hook data
    const loans = initialLoans !== undefined ? initialLoans : hookedLoans;
    const loansLoading = isLoading !== undefined ? isLoading : hookedLoading;
    const refetch = onRefresh !== undefined ? onRefresh : hookedRefetch;

    const { formatCurrency } = useCurrency();
    const { logActivity } = useActivityLog();

    // Modal State
    const [editingLoan, setEditingLoan] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [repaymentLoan, setRepaymentLoan] = useState<any>(null);
    const [showRepaymentModal, setShowRepaymentModal] = useState(false);
    const [historyLoanId, setHistoryLoanId] = useState<string | null>(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [archivingId, setArchivingId] = useState<string | null>(null);
    const [selectedLoan, setSelectedLoan] = useState<any>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // Handlers
    const handleRowClick = (row: any) => {
        setSelectedLoan(row);
        setShowDetailsModal(true);
    };

    const handleEdit = (row: any) => {
        setEditingLoan(row);
        setShowEditModal(true);
    };

    const handleRepayment = (row: any) => {
        setRepaymentLoan(row);
        setShowRepaymentModal(true);
    };

    const handleViewHistory = (row: any) => {
        setHistoryLoanId(row.id);
        setShowHistoryModal(true);
    };

    const handleArchive = async (row: any) => {
        const reason = prompt(`Archive this loan for ${row.debtor?.full_name}?\n\nEnter reason (optional):`);
        if (reason !== null) {
            setArchivingId(row.id);
            try {
                const supabase = createClient();
                const { error } = await supabase
                    .from('loans')
                    .update({ status: 'archived' })
                    .eq('id', row.id);

                if (error) throw error;

                await logActivity('UPDATE_LOAN', 'loan', row.id, {
                    status: 'archived',
                    reason: reason || 'Archived by admin'
                });

                alert('Loan archived!');
                refetch();
            } catch (err: any) {
                alert(`Error archiving loan: ${err.message}`);
            } finally {
                setArchivingId(null);
            }
        }
    };

    // Table columns
    const columns: Column[] = [
        {
            key: 'reference_no',
            label: 'REF. NO',
            render: (value) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{value || '---'}</span>
        },
        {
            key: 'debtor_name',
            label: 'Debtor',
            render: (_, row) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{row.debtor?.full_name || 'N/A'}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.debtor?.email}</span>
                </div>
            )
        },
        {
            key: 'principal',
            label: 'Amount',
            render: (value) => formatCurrency(value)
        },
        {
            key: 'interest_rate',
            label: 'Rate',
            render: (value) => `${value}%`
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => {
                const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
                    performing: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Performing' },
                    non_performing: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', label: 'Non-performing' },
                    full_provision: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'Full provision required' },
                    preliquidated: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', label: 'Preliquidated' },
                    archived: { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280', label: 'Archived' },
                    active: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Performing' },
                    repaid: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', label: 'Preliquidated' },
                    overdue: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', label: 'Non-performing' },
                    defaulted: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'Full provision required' },
                };
                const style = statusStyles[value] || statusStyles.active;
                return (
                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: style.bg,
                        color: style.color,
                        textTransform: 'capitalize',
                    }}>
                        {style?.label || value}
                    </span>
                );
            }
        },
    ];

    // Row Actions
    const rowActions: RowAction[] = [
        {
            label: '💰 Record Repayment',
            icon: <DollarSign size={16} />,
            onClick: handleRepayment,
            hidden: (row) => row.status === 'preliquidated' || row.status === 'archived',
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
            hidden: (row) => row.status === 'archived',
        },
        {
            label: archivingId ? 'Archiving...' : '📦 Archive',
            icon: archivingId ? <MStreetLoader size={16} color="var(--danger)" /> : <Trash2 size={16} />,
            onClick: handleArchive,
            variant: 'danger',
            hidden: (row) => row.status === 'archived',
        },
    ];

    return (
        <>
            <DataTable
                columns={columns}
                data={loans}
                loading={loansLoading}
                emptyMessage="No loans found"
                searchable
                searchPlaceholder="Search loans..."
                searchKeys={['debtor.full_name', 'debtor.email', 'status', 'reference_no']}
                paginated
                defaultPageSize={10}
                actions={rowActions}
                onRowClick={handleRowClick}
            />

            {/* Modals */}
            <LoanDetailsModal
                isOpen={showDetailsModal}
                loan={selectedLoan}
                onClose={() => {
                    setShowDetailsModal(false);
                    setSelectedLoan(null);
                }}
            />

            <EditLoanModal
                isOpen={showEditModal}
                loan={editingLoan}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingLoan(null);
                }}
                onSuccess={refetch}
            />

            <RecordRepaymentModal
                isOpen={showRepaymentModal}
                loan={repaymentLoan}
                onClose={() => {
                    setShowRepaymentModal(false);
                    setRepaymentLoan(null);
                }}
                onSuccess={refetch}
            />

            <LoanHistoryModal
                isOpen={showHistoryModal}
                loanId={historyLoanId}
                onClose={() => {
                    setShowHistoryModal(false);
                    setHistoryLoanId(null);
                }}
            />
        </>
    );
}
