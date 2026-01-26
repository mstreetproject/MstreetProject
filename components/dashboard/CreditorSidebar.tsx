'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileText,
    TrendingUp,
    User,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Menu,
    X
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface CreditorSidebarProps {
    userName?: string;
}

const menuItems = [
    {
        name: 'Overview',
        href: '/dashboard/creditor',
        icon: LayoutDashboard,
    },
    {
        name: 'My Investments',
        href: '/dashboard/creditor/investments',
        icon: TrendingUp,
    },
    {
        name: 'Documents',
        href: '/dashboard/creditor/documents',
        icon: FileText,
    },
    {
        name: 'Profile',
        href: '/dashboard/creditor/profile',
        icon: User,
    },
];

export default function CreditorSidebar({ userName }: CreditorSidebarProps) {
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
                    <Link
                        href="/login"
                        className={styles.logo}
                        onClick={() => setMobileOpen(false)}
                    >
                        {!collapsed && (
                            <>
                                <Image
                                    src="/secondary logo2.png"
                                    alt="MStreet"
                                    className={styles.logoImage}
                                    width={120}
                                    height={40}
                                    priority
                                />
                                <span className={styles.logoText}>Creditor Portal</span>
                            </>
                        )}
                        {collapsed && (
                            <Image
                                src="/secondary logo2.png"
                                alt="MStreet"
                                className={styles.logoImageSmall}
                                width={40}
                                height={40}
                                priority
                            />
                        )}
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
                            (item.href !== '/dashboard/creditor' && pathname.startsWith(item.href));

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
                            <div className={styles.userRole}>Creditor</div>
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
