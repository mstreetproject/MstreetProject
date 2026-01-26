'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileText,
    Upload,
    User,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Menu,
    X
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface DebtorSidebarProps {
    userName?: string;
}

const menuItems = [
    {
        name: 'Overview',
        href: '/dashboard/debtor',
        icon: LayoutDashboard,
    },
    {
        name: 'My Loans',
        href: '/dashboard/debtor/loans',
        icon: FileText,
    },
    {
        name: 'Payments',
        href: '/dashboard/debtor/payments',
        icon: Upload,
    },
    {
        name: 'Profile',
        href: '/dashboard/debtor/profile',
        icon: User,
    },
];

export default function DebtorSidebar({ userName }: DebtorSidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                className={styles.mobileToggle}
                onClick={() => setMobileOpen(!mobileOpen)}
            >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className={styles.mobileOverlay}
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}>
                {/* Header */}
                <div className={styles.header}>
                    <Link href="/login" className={styles.logo}>
                        {!collapsed && (
                            <>
                                <img src="/secondary logo2.png" alt="MStreet" className={styles.logoImage} />
                                <span className={styles.logoText}>Debtor Portal</span>
                            </>
                        )}
                        {collapsed && <img src="/secondary logo2.png" alt="MStreet" className={styles.logoImageSmall} />}
                    </Link>
                    <button
                        className={styles.collapseBtn}
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                </div>

                {/* Navigation */}
                <nav className={styles.nav}>
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== '/dashboard/debtor' && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                                onClick={() => setMobileOpen(false)}
                            >
                                <item.icon size={20} />
                                {!collapsed && <span>{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className={styles.footer}>
                    {!collapsed && userName && (
                        <div className={styles.userInfo}>
                            <div className={styles.userName}>{userName}</div>
                            <div className={styles.userRole}>Debtor</div>
                        </div>
                    )}
                    <button className={styles.logoutBtn} onClick={handleLogout}>
                        <LogOut size={20} />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}
