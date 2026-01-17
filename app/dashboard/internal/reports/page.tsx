'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useUser } from '@/hooks/dashboard/useUser';
import ProfitLossSection from '@/components/dashboard/ProfitLossSection';
import BalanceSheetSection from '@/components/dashboard/BalanceSheetSection';
import { FileText, TrendingUp, Building2 } from 'lucide-react';
import styles from './page.module.css';

type ReportTab = 'pnl' | 'balance';

export default function ReportsPage() {
    const { user, loading: userLoading } = useUser();
    const [activeTab, setActiveTab] = useState<ReportTab>('pnl');

    // RBAC Guard
    const hasAccess = user?.roles?.some(
        role => ['super_admin', 'finance_manager', 'risk_officer'].includes(role.name)
    );

    if (userLoading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className={styles.errorContainer}>
                <h1>Access Denied</h1>
                <p>You do not have permission to view reports.</p>
            </div>
        );
    }

    return (
        <DashboardLayout currentUser={user || undefined}>
            <div className={styles.container}>
                {/* Page Header */}
                <div className={styles.pageHeader}>
                    <div className={styles.headerContent}>
                        <div className={styles.titleSection}>
                            <FileText size={28} className={styles.headerIcon} />
                            <div>
                                <h1 className={styles.pageTitle}>Financial Reports</h1>
                                <p className={styles.pageSubtitle}>
                                    View and export financial statements
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Report Tabs */}
                <div className={styles.tabsContainer}>
                    <button
                        className={`${styles.tab} ${activeTab === 'pnl' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('pnl')}
                    >
                        <TrendingUp size={18} />
                        <span>Profit & Loss</span>
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'balance' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('balance')}
                    >
                        <Building2 size={18} />
                        <span>Balance Sheet</span>
                    </button>
                </div>

                {/* Report Content */}
                <div className={styles.reportContent}>
                    {activeTab === 'pnl' && <ProfitLossSection />}
                    {activeTab === 'balance' && <BalanceSheetSection />}
                </div>
            </div>
        </DashboardLayout>
    );
}
