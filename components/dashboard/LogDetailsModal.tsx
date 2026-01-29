'use client';

import React from 'react';
import { X, FileText, Activity, Clock, User, Fingerprint } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

interface LogDetailsModalProps {
    isOpen: boolean;
    log: any;
    onClose: () => void;
}

export default function LogDetailsModal({ isOpen, log, onClose }: LogDetailsModalProps) {
    const { formatCurrency } = useCurrency();

    // Parse details if it's a string (fix for the issue user reported)
    const details = React.useMemo(() => {
        if (!log?.details) return {};
        if (typeof log.details === 'string') {
            try {
                return JSON.parse(log.details);
            } catch (e) {
                console.error('Failed to parse log details:', e);
                return {};
            }
        }
        return log.details;
    }, [log?.details]);

    if (!isOpen || !log) return null;

    // Helper to format values
    const formatValue = (key: string, value: any): React.ReactNode => {
        if (value === null || value === undefined) return <span style={{ color: 'var(--text-muted)' }}>null</span>;

        // Handle currency fields
        if (['amount', 'principal', 'interest', 'total'].some(k => key.toLowerCase().includes(k)) && typeof value === 'number') {
            return formatCurrency(value);
        }

        // Handle dates
        const isDateKey = ['_at', '_date'].some(suffix => key.toLowerCase().endsWith(suffix)) ||
            ['date', 'time'].includes(key.toLowerCase());

        if (isDateKey && (typeof value === 'string' || typeof value === 'number')) {
            try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleString();
                }
            } catch (e) {
                return value;
            }
        }

        // Handle booleans
        if (typeof value === 'boolean') {
            return value ?
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>Yes</span> :
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>No</span>;
        }

        if (typeof value === 'object') {
            return JSON.stringify(value, null, 2);
        }

        return String(value);
    };

    // Helper to render field changes specifically
    const renderFieldChanges = (changes: any) => {
        return (
            <div style={{ display: 'grid', gap: '12px' }}>
                {Object.entries(changes).map(([key, value]) => (
                    <div key={key} style={{
                        padding: '12px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-tertiary)'
                    }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize', fontWeight: 600, marginBottom: '8px' }}>
                            {key.replace(/_/g, ' ')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                            <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                                {formatValue(key, (value as any).from)}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                {formatValue(key, (value as any).to)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
        }} onClick={onClose}>
            <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '90vh',
                border: '1px solid var(--border-primary)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid var(--border-tertiary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    background: 'var(--bg-tertiary)'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Activity size={20} style={{ color: 'var(--accent-primary)' }} />
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Log Details</h2>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            ID: <span style={{ fontFamily: 'monospace' }}>{log.id}</span>
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(0,0,0,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-primary)'
                    }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px', overflowY: 'auto' }}>

                    {/* Meta Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: '#38BDF8' }}>
                                <User size={16} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>User</span>
                            </div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.user?.full_name || 'System'}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.user?.email}</div>
                        </div>

                        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: '#A855F7' }}>
                                <Fingerprint size={16} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Action</span>
                            </div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.action}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                on <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{log.entity_type}</span>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} />
                        Captured Data
                    </h3>

                    {details?.field_changes ? (
                        <div>
                            <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                The following properties were modified:
                            </p>
                            {renderFieldChanges(details.field_changes)}
                        </div>
                    ) : Object.keys(details || {}).length > 0 ? (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {Object.entries(details as Record<string, any>).map(([key, value]) => (
                                <div key={key} style={{
                                    padding: '16px',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-tertiary)'
                                }}>
                                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.05em' }}>
                                        {key.replace(/_/g, ' ')}
                                    </div>
                                    <div style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>
                                        {formatValue(key, value)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                            No additional details captured for this event.
                        </div>
                    )}

                    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-tertiary)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <Clock size={14} />
                        Logged on {new Date(log.created_at).toLocaleString(undefined, {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
