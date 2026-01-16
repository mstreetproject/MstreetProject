'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    DollarSign,
    TrendingUp,
    FileText,
    UserCircle,
    LogOut,
    X,
    UserPlus,
    Receipt,
    Settings
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    userRole?: string;
}

const menuItems = [
    {
        label: 'Dashboard',
        href: '/dashboard/internal',
        icon: LayoutDashboard,
        roles: ['super_admin', 'finance_manager', 'ops_officer', 'risk_officer']
    },
    {
        label: 'Creditors',
        href: '/dashboard/internal/creditors',
        icon: DollarSign,
        roles: ['super_admin', 'finance_manager', 'ops_officer']
    },
    {
        label: 'Debtors',
        href: '/dashboard/internal/debtors',
        icon: TrendingUp,
        roles: ['super_admin', 'finance_manager', 'ops_officer', 'risk_officer']
    },
    {
        label: 'Staff',
        href: '/dashboard/internal/staff',
        icon: Users,
        roles: ['super_admin']
    },
    {
        label: 'Operations',
        href: '/dashboard/internal/operations',
        icon: UserPlus,
        roles: ['super_admin', 'finance_manager', 'ops_officer']
    },
    {
        label: 'Loan Requests',
        href: '/dashboard/internal/loan-requests',
        icon: FileText,
        roles: ['super_admin', 'finance_manager', 'ops_officer']
    },
    {
        label: 'Payment Reviews',
        href: '/dashboard/internal/payment-reviews',
        icon: FileText,
        roles: ['super_admin', 'finance_manager', 'ops_officer']
    },
    {
        label: 'Expenses',
        href: '/dashboard/internal/expenses',
        icon: Receipt,
        roles: ['super_admin', 'finance_manager']
    },
    {
        label: 'Reports',
        href: '/dashboard/internal/reports',
        icon: FileText,
        roles: ['super_admin', 'finance_manager', 'risk_officer']
    },
    {
        label: 'User Management',
        href: '/dashboard/internal/users',
        icon: UserCircle, // Or Users
        roles: ['super_admin', 'finance_manager']
    },
    {
        label: 'Profile',
        href: '/dashboard/internal/profile',
        icon: UserCircle,
        roles: ['super_admin', 'finance_manager', 'ops_officer', 'risk_officer']
    },
    {
        label: 'Archive',
        href: '/dashboard/internal/archive',
        icon: Receipt,
        roles: ['super_admin', 'finance_manager', 'ops_officer']
    },
    {
        label: 'Settings',
        href: '/dashboard/internal/settings',
        icon: Settings,
        roles: ['super_admin']
    },
    {
        label: 'System Logs',
        href: '/dashboard/admin/audit-logs',
        icon: FileText,
        roles: ['super_admin']
    },

];

export default function Sidebar({ isOpen, onClose, userRole = '' }: SidebarProps) {
    const pathname = usePathname();

    // Filter menu items based on user role
    const filteredMenuItems = menuItems.filter(item =>
        item.roles.includes(userRole)
    );

    return (
        <>
            {isOpen && (
                <div className={styles.overlay} onClick={onClose}></div>
            )}

            <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
                <div className={styles.header}>
                    <Link href="/" className={styles.logo} onClick={onClose}>
                        <Image
                            src="/secondary logo2.png"
                            alt="MStreet Finance"
                            width={120}
                            height={40}
                            priority
                            className={styles.logoImage}
                        />
                    </Link>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Close sidebar"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className={styles.nav}>
                    {filteredMenuItems.length === 0 ? (
                        <div style={{
                            padding: '16px',
                            color: '#94A3B8',
                            fontSize: '0.875rem',
                            textAlign: 'center'
                        }}>
                            No menu items available
                        </div>
                    ) : (
                        filteredMenuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                                    onClick={onClose}
                                >
                                    <Icon className={styles.navIcon} size={20} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })
                    )}
                </nav>

                <div className={styles.footer}>
                    <form action="/api/auth/logout" method="POST" className={styles.logoutForm}>
                        <button type="submit" className={styles.logoutBtn}>
                            <LogOut size={20} />
                            <span>Logout</span>
                        </button>
                    </form>
                </div>
            </aside>
        </>
    );
}
