import React from 'react';

interface StatusBadgeProps {
    status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    let color = 'var(--text-secondary)';
    let bg = 'var(--surface-hover)';
    // Define explicit style object to avoid TS errors
    const style: React.CSSProperties = {
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '0.85rem',
        fontWeight: 600,
        display: 'inline-block',
        textTransform: 'capitalize'
    };

    switch (status?.toLowerCase()) {
        case 'active':
        case 'approved':
        case 'paid':
        case 'processed':
            color = 'var(--success)';
            bg = 'rgba(16, 185, 129, 0.1)';
            break;
        case 'pending':
        case 'under_review':
            color = 'var(--warning)';
            bg = 'rgba(245, 158, 11, 0.1)';
            break;
        case 'rejected':
        case 'overdue':
        case 'defaulted':
            color = 'var(--danger)';
            bg = 'rgba(239, 68, 68, 0.1)';
            break;
        case 'closed':
        case 'repaid':
        case 'completed':
            color = 'var(--text-muted)';
            bg = 'var(--surface-hover)';
            break;
        case 'archived':
            color = 'var(--text-muted)';
            bg = 'var(--surface-card)';
            style.border = '1px solid var(--border-color)';
            break;
    }

    style.color = color;
    style.backgroundColor = bg;

    return (
        <span style={style}>
            {status?.replace('_', ' ') || 'Unknown'}
        </span>
    );
};

export default StatusBadge;
