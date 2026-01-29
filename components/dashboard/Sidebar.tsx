'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    TrendingUp,
    FileText,
    UserCircle,
    LogOut,
    X,
    UserPlus,
    Receipt,
    Settings,
    Banknote,
    ChevronDown,
    ChevronRight,
    Coins,
    CreditCard
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
        icon: Banknote,
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
        icon: UserPlus,
        roles: ['super_admin', 'finance_manager', 'ops_officer'],
        subItems: [
            { label: 'Record Placement', href: '/dashboard/internal/operations/record-placement', icon: Coins },
            { label: 'Disburse Loan', href: '/dashboard/internal/operations/disburse-loan', icon: CreditCard },
            { label: 'Repayments', href: '/dashboard/internal/operations/repayments', icon: Banknote },
            { label: 'Record Investment', href: '/dashboard/internal/operations/record-investment', icon: TrendingUp }
        ]
    },
    {
        label: 'Money Request',
        href: '/dashboard/internal/money-requests',
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
    const [manuallyExpandedMenus, setManuallyExpandedMenus] = useState<string[]>([]);
    const [manuallyCollapsedMenus, setManuallyCollapsedMenus] = useState<string[]>([]);

    // Filter menu items based on user role
    const filteredMenuItems = menuItems.filter(item =>
        item.roles.includes(userRole)
    );

    // Check if a menu should be expanded
    const isMenuExpanded = (label: string, subItems?: typeof menuItems[0]['subItems']) => {
        // If manually collapsed, keep it closed
        if (manuallyCollapsedMenus.includes(label)) return false;
        // If manually expanded, keep it open
        if (manuallyExpandedMenus.includes(label)) return true;
        // Auto-expand if on an active sub-item
        if (subItems) {
            return subItems.some(sub => pathname === sub.href);
        }
        return false;
    };

    const toggleMenu = (label: string) => {
        const isCurrentlyExpanded = isMenuExpanded(label, menuItems.find(m => m.label === label)?.subItems);

        if (isCurrentlyExpanded) {
            // Collapse it
            setManuallyCollapsedMenus(prev => [...prev, label]);
            setManuallyExpandedMenus(prev => prev.filter(l => l !== label));
        } else {
            // Expand it
            setManuallyExpandedMenus(prev => [...prev, label]);
            setManuallyCollapsedMenus(prev => prev.filter(l => l !== label));
        }
    };

    return (
        <>
            {isOpen && (
                <div className={styles.overlay} onClick={onClose}></div>
            )}

            <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
                <div className={styles.header}>
                    <Link href="/login" className={styles.logo} onClick={onClose}>
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
                            const hasSubItems = item.subItems && item.subItems.length > 0;
                            const isExpanded = hasSubItems && isMenuExpanded(item.label, item.subItems);
                            const isActive = item.href ? pathname === item.href : false;
                            const hasActiveChild = item.subItems?.some(sub => pathname === sub.href);

                            // If has sub-items, render collapsible menu
                            if (hasSubItems) {
                                return (
                                    <div key={item.label} className={styles.menuGroup}>
                                        <button
                                            className={`${styles.navItem} ${styles.navButton} ${hasActiveChild ? styles.active : ''}`}
                                            onClick={() => toggleMenu(item.label)}
                                            aria-expanded={isExpanded}
                                        >
                                            <Icon className={styles.navIcon} size={20} />
                                            <span>{item.label}</span>
                                            {isExpanded ? (
                                                <ChevronDown className={styles.chevron} size={16} />
                                            ) : (
                                                <ChevronRight className={styles.chevron} size={16} />
                                            )}
                                        </button>
                                        {isExpanded && (
                                            <div className={styles.subMenu}>
                                                {item.subItems!.map((subItem) => {
                                                    const SubIcon = subItem.icon;
                                                    const isSubActive = pathname === subItem.href;
                                                    return (
                                                        <Link
                                                            key={subItem.href}
                                                            href={subItem.href}
                                                            className={`${styles.subItem} ${isSubActive ? styles.active : ''}`}
                                                            onClick={onClose}
                                                        >
                                                            <SubIcon className={styles.navIcon} size={16} />
                                                            <span>{subItem.label}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // Regular menu item without sub-items
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href!}
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
