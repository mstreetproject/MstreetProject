'use client';

import React from 'react';
import DataTable, { Column } from '@/components/dashboard/DataTable';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { useCurrency } from '@/hooks/useCurrency';

interface PayoutRequest {
    id: string;
    amount: number;
    status: string;
    created_at: string;
    notes?: string;
    [key: string]: any;
}

export default function PayoutHistoryTable({ requests }: { requests: PayoutRequest[] }) {
    const { formatCurrency } = useCurrency();

    const columns: Column[] = [
        {
            key: 'amount',
            label: 'Amount',
            render: (value) => formatCurrency(value)
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => <StatusBadge status={value} />
        },
        {
            key: 'created_at',
            label: 'Requested Date',
            render: (value) => new Date(value).toLocaleDateString()
        },
        {
            key: 'notes',
            label: 'Notes',
            render: (value) => value || '-'
        }
    ];

    return (
        <DataTable
            columns={columns}
            data={requests}
            loading={false}
            emptyMessage="No payout requests found."
            searchable
            paginated
            defaultPageSize={10}
        />
    );
}
