'use client';

import React, { useState } from 'react';
import { Menu, Bell, User } from 'lucide-react';
import Sidebar from './Sidebar';
import ThemeToggle from '../ui/ThemeToggle';
import CurrencySelector from './CurrencySelector';
import NotificationCenter from './NotificationCenter';
import styles from './DashboardLayout.module.css';

interface DashboardLayoutProps {
    children: React.ReactNode;
    currentUser?: {
        full_name: string;
        email: string;
        roles?: { name: string }[];
    };
}

export default function DashboardLayout({ children, currentUser }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    console.log('=== DASHBOARD LAYOUT ===');
    console.log('currentUser:', currentUser);
    console.log('currentUser.roles:', currentUser?.roles);

    const userRole = currentUser?.roles?.[0]?.name || '';

    console.log('Extracted userRole:', userRole);
    console.log('=======================');

    return (
        <div className={styles.container}>
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                userRole={userRole}
            />

            <div className={styles.mainContent}>
                <header className={styles.topBar}>
                    <button
                        className={styles.menuBtn}
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu size={24} />
                    </button>

                    <div className={styles.topBarRight}>
                        <CurrencySelector />
                        <ThemeToggle />

                        <NotificationCenter />

                        <div className={styles.userInfo}>
                            <div className={styles.userAvatar}>
                                <User size={20} />
                            </div>
                            <div className={styles.userDetails}>
                                <p className={styles.userName}>{currentUser?.full_name || 'User'}</p>
                                <p className={styles.userRole}>{userRole.replace('_', ' ')}</p>
                            </div>
                        </div>
                    </div>
                </header>

                <main className={styles.content}>
                    {children}
                </main>
            </div>
        </div>
    );
}

