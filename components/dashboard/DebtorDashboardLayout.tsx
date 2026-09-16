'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Menu,
    User,
    LogOut,
    LayoutDashboard,
    FileText,
    Upload,
    UserCircle,
    X,
    Send
} from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import CurrencySelector from './CurrencySelector';
import NotificationCenter from './NotificationCenter';
import styles from './Sidebar.module.css';
import layoutStyles from './DashboardLayout.module.css';

interface DebtorDashboardLayoutProps {
    children: React.ReactNode;
    currentUser?: {
        full_name: string;
        email: string;
        profile_picture_url?: string;
    };
}

const menuItems = [
    { name: 'Overview', href: '/dashboard/debtor', icon: LayoutDashboard },
    { name: 'Request Loan', href: '/dashboard/debtor/request-loan', icon: Send },
    { name: 'My Loans', href: '/dashboard/debtor/loans', icon: FileText },
    { name: 'Payments', href: '/dashboard/debtor/payments', icon: Upload },
    { name: 'Documents', href: '/dashboard/debtor/documents', icon: FileText },
    { name: 'Profile', href: '/dashboard/debtor/profile', icon: UserCircle },
];

export default function DebtorDashboardLayout({ children, currentUser }: DebtorDashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <div className={layoutStyles.container}>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className={styles.overlay}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Using existing Sidebar styling */}
            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
                <div className={styles.header}>
                    <Link href="/login" className={styles.logo}>
                        <img src="/secondary logo2.png" alt="MStreet" className={styles.logoImage} />
                    </Link>
                    <button
                        className={styles.closeBtn}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className={styles.nav}>
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== '/dashboard/debtor' && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <item.icon size={20} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.footer}>
                    <button className={styles.logoutBtn} onClick={handleLogout}>
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className={layoutStyles.mainContent}>
                {/* Top Bar - Same as internal dashboard */}
                <header className={layoutStyles.topBar}>
                    <button
                        className={layoutStyles.menuBtn}
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu size={24} />
                    </button>

                    <div className={layoutStyles.topBarRight}>
                        <CurrencySelector />
                        <ThemeToggle />
                        <NotificationCenter />

                        <div className={layoutStyles.userInfo}>
                            <div className={layoutStyles.userAvatar}>
                                {currentUser?.profile_picture_url ? (
                                    <img
                                        src={currentUser.profile_picture_url}
                                        alt={currentUser.full_name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                    />
                                ) : (
                                    <User size={20} />
                                )}
                            </div>
                            <div className={layoutStyles.userDetails}>
                                <p className={layoutStyles.userName}>{currentUser?.full_name || 'User'}</p>
                                <p className={layoutStyles.userRole}>Debtor</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className={layoutStyles.content}>
                    {children}
                </main>
            </div>
        </div>
    );
}
