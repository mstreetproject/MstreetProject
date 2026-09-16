'use client';

import React, { useState, Suspense } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useUser } from '@/hooks/dashboard/useUser';
import { useSearchParams } from 'next/navigation';
import ProfitLossSection from '@/components/dashboard/ProfitLossSection';
import BalanceSheetSection from '@/components/dashboard/BalanceSheetSection';
import FundPoolSection from '@/components/dashboard/FundPoolSection';
import { FileText, TrendingUp, Building2, Scale } from 'lucide-react';
import styles from './page.module.css';
import MStreetLoader from '@/components/ui/MStreetLoader';

type ReportTab = 'pnl' | 'balance' | 'fundpool';

function ReportsContent() {
    const { user, loading: userLoading } = useUser();
    const searchParams = useSearchParams();
    const activeTab = (searchParams.get('tab') as ReportTab) || 'pnl';

    // RBAC Guard
    const hasAccess = user?.roles?.some(
        role => ['super_admin', 'finance_manager', 'risk_officer'].includes(role.name)
    );

    if (userLoading) {
        return (
            <div className={styles.loadingContainer}>
                <MStreetLoader size={120} />
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Loading reports...
                </p>
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
                            <div className={styles.headerIcon}>
                                {activeTab === 'pnl' && <TrendingUp size={28} />}
                                {activeTab === 'balance' && <Building2 size={28} />}
                                {activeTab === 'fundpool' && <Scale size={28} />}
                            </div>
                            <div>
                                <h1 className={styles.pageTitle}>
                                    {activeTab === 'pnl' && 'Profit & Loss Statement'}
                                    {activeTab === 'balance' && 'Balance Sheet'}
                                    {activeTab === 'fundpool' && 'Fund Pool Analysis'}
                                </h1>
                                <p className={styles.pageSubtitle}>
                                    {activeTab === 'pnl' && 'Track revenue, expenses, and net profit over time'}
                                    {activeTab === 'balance' && 'Overview of assets, liabilities, and equity'}
                                    {activeTab === 'fundpool' && 'Analyze cost of funds vs asset yields'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Report Content */}
                <div className={styles.reportContent}>
                    {activeTab === 'pnl' && <ProfitLossSection />}
                    {activeTab === 'balance' && <BalanceSheetSection />}
                    {activeTab === 'fundpool' && <FundPoolSection />}
                </div>
            </div>
        </DashboardLayout>
    );
}

export default function ReportsPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#121212' }}>
                <MStreetLoader size={80} />
            </div>
        }>
            <ReportsContent />
        </Suspense>
    );
}
