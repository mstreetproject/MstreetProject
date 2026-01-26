'use client';

import React from 'react';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import { useCurrency } from '@/hooks/useCurrency';
import styles from '@/app/dashboard/creditor/investments/page.module.css'; // Reuse status styles

interface Investment {
    id: string;
    borrower: string;
    principal: number;
    interest_rate: number;
    tenure_months: number;
    current_value: number;
    maturity_value: number;
    matures_at: string;
    status: string;
    start_date: string;
    [key: string]: any;
}

export default function InvestmentsTable({ investments }: { investments: Investment[] }) {
    const { formatCurrency } = useCurrency();

    const getStatusClass = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'active' || s === 'current') return styles.statusActive;
        if (s === 'repaid' || s === 'matured') return styles.statusSuccess;
        if (s === 'withdrawn') return styles.statusNeutral;
        return styles.statusNeutral;
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const columns: Column[] = [
        {
            key: 'borrower',
            label: 'Borrower',
            render: (value) => <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
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
            key: 'current_value',
            label: 'Current Value',
            render: (value) => <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(value)}</span>
        },
        {
            key: 'maturity_value',
            label: 'Maturity Value',
            render: (value) => <span style={{ color: 'var(--text-secondary)' }}>{formatCurrency(value)}</span>
        },
        {
            key: 'matures_at',
            label: 'Matures',
            render: (value, row) => {
                const date = new Date(value);
                const isOverdue = date < new Date() && row.status === 'active';
                return (
                    <span style={{ color: isOverdue ? 'var(--danger)' : 'inherit' }}>
                        {formatDate(value)}
                        {isOverdue && ' ⚠️'}
                    </span>
                );
            }
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => (
                <span className={`${styles.statusBadge} ${getStatusClass(value)}`}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                </span>
            )
        },
        {
            key: 'start_date',
            label: 'Date',
            render: (value) => formatDate(value)
        }
    ];

    return (
        <DataTable
            columns={columns}
            data={investments}
            loading={false}
            emptyMessage="No investments found"
            searchable
            searchPlaceholder="Search investments..."
            searchKeys={['status', 'principal']}
            paginated
            defaultPageSize={10}
        />
    );
}
