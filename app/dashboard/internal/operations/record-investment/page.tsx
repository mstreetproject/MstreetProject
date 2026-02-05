'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import RecordInvestmentForm from '@/components/dashboard/RecordInvestmentForm';
import ManageInvestments from '@/components/dashboard/ManageInvestments';
import CreateInvesteeModal from '@/components/dashboard/CreateInvesteeModal';
import { useUser } from '@/hooks/dashboard/useUser';
import { Building2, Plus, Wallet, History, Search, CheckCircle, AlertCircle } from 'lucide-react';
import styles from '../../creditors/page.module.css';
import MStreetLoader from '@/components/ui/MStreetLoader';

export default function RecordInvestmentPage() {
    const { user, loading: userLoading } = useUser();
    const [activeTab, setActiveTab] = useState<'record' | 'manage'>('record');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Auto-clear notification after 5 seconds
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // RBAC Guard
    const hasAccess = user?.roles?.some(
        role => ['super_admin', 'finance_manager', 'ops_officer'].includes(role.name)
    );

    if (userLoading) {
        return (
            <div className={styles.loading}>
                <MStreetLoader size={120} />
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Loading...
                </p>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className={styles.error}>
                <h1>Access Denied</h1>
                <p>You do not have permission to access this page.</p>
            </div>
        );
    }

    return (
        <DashboardLayout currentUser={user || undefined}>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.pageHeader}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>Operations</h1>
                        <p className={styles.pageSubtitle}>
                            {activeTab === 'record'
                                ? 'Record outward investments and manage ROI growth'
                                : 'Track and manage existing company investments'}
                        </p>
                    </div>
                    {activeTab === 'record' && (
                        <div className={styles.headerRight}>
                            <button
                                className={styles.createBtn}
                                onClick={() => setShowCreateModal(true)}
                            >
                                <Building2 size={20} />
                                <span>Add Investment</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '12px',
                    padding: '6px',
                    marginBottom: '32px',
                    marginTop: '12px',
                    border: '1px solid var(--border-secondary)',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch'
                }} className="tab-navigation-container">
                    {[
                        { id: 'record', label: 'Record Investment', icon: <Wallet size={18} /> },
                        { id: 'manage', label: 'Manage Investments', icon: <History size={18} /> }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: activeTab === tab.id ? '0 4px 12px rgba(0, 0, 0, 0.1)' : 'none',
                                whiteSpace: 'nowrap',
                                minWidth: 'max-content',
                                flexShrink: 0
                            }}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <style jsx>{`
                    .tab-navigation-container::-webkit-scrollbar {
                        display: none;
                    }
                    @media (max-width: 640px) {
                        .tab-navigation-container {
                            padding: 4px;
                            gap: 4px;
                        }
                        .tab-navigation-container button {
                            padding: 10px 8px;
                            font-size: 0.85rem;
                            gap: 6px;
                            min-width: 120px;
                        }
                    }
                    @media (max-width: 400px) {
                        .tab-navigation-container {
                            padding: 3px;
                            gap: 2px;
                        }
                        .tab-navigation-container button {
                            padding: 8px 6px;
                            font-size: 0.75rem;
                            gap: 4px;
                            min-width: 100px;
                        }
                    }
                `}</style>

                {/* Notifications */}
                {notification && (
                    <div className={`${styles.statusBadge} ${notification.type === 'success' ? styles.statusSuccess : styles.statusDanger}`} style={{
                        width: '100%',
                        padding: '16px',
                        marginBottom: '24px',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        animation: 'fadeIn 0.3s ease-out',
                        border: '1px solid currentColor'
                    }}>
                        {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <span style={{ fontWeight: 600 }}>{notification.message}</span>
                    </div>
                )}

                {/* Content */}
                <div style={{ marginTop: '0' }}>
                    {activeTab === 'record' ? (
                        <RecordInvestmentForm
                            key={refreshKey}
                            onSuccess={() => {
                                setRefreshKey(prev => prev + 1);
                                setNotification({ type: 'success', message: 'Investment recorded successfully!' });
                                setActiveTab('manage');
                            }}
                        />
                    ) : (
                        <ManageInvestments key={refreshKey} hideHeader={true} />
                    )}
                </div>
            </div>

            {/* Create Investee Modal */}
            <CreateInvesteeModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    setRefreshKey(prev => prev + 1);
                    setShowCreateModal(false);
                }}
            />
        </DashboardLayout>
    );
}
