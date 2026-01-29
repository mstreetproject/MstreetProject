'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    Menu,
    User,
    LogOut,
    LayoutDashboard,
    FileText,
    TrendingUp,
    X,
    UserCircle
} from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import CurrencySelector from './CurrencySelector';
import NotificationCenter from './NotificationCenter';
import styles from './Sidebar.module.css';
import layoutStyles from './DashboardLayout.module.css';

interface CreditorDashboardLayoutProps {
    children: React.ReactNode;
    currentUser?: {
        full_name: string;
        email: string;
        profile_picture_url?: string;
    };
}

const menuItems = [
    { name: 'Overview', href: '/dashboard/creditor', icon: LayoutDashboard },
    { name: 'My Investments', href: '/dashboard/creditor/investments', icon: TrendingUp },
    { name: 'Documents', href: '/dashboard/creditor/documents', icon: FileText },
    { name: 'Profile', href: '/dashboard/creditor/profile', icon: UserCircle },
];

export default function CreditorDashboardLayout({ children, currentUser }: CreditorDashboardLayoutProps) {
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

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
                <div className={styles.header}>
                    <Link
                        href="/login"
                        className={styles.logo}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <Image
                            src="/secondary logo2.png"
                            alt="MStreet"
                            className={styles.logoImage}
                            width={120}
                            height={40}
                            priority
                        />
                        <span className={styles.logoText}>Creditor Portal</span>
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
                            (item.href !== '/dashboard/creditor' && pathname.startsWith(item.href));

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
                {/* Top Bar */}
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
                                <p className={layoutStyles.userRole}>Creditor</p>
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
