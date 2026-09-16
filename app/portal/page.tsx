'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, DollarSign, LogOut } from 'lucide-react';

export default function PortalPage() {
    const router = useRouter();
    const [roles, setRoles] = useState<{
        is_internal: boolean;
        is_creditor: boolean;
        is_debtor: boolean;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserRoles = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }

            const { data: userData } = await supabase
                .from('users')
                .select('is_internal, is_creditor, is_debtor')
                .eq('id', user.id)
                .single();

            if (userData) {
                setRoles(userData);
            }
            setLoading(false);
        };

        fetchUserRoles();
    }, [router]);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>Loading access permissions...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                <div style={styles.header}>
                    <img src="/secondary logo2.png" alt="MStreet Financial" style={styles.logo} />
                    <h1 style={styles.title}>Welcome Back</h1>
                    <p style={styles.subtitle}>Select a dashboard to continue</p>
                </div>

                <div style={styles.grid}>
                    {roles?.is_internal && (
                        <Link href="/dashboard/internal" style={styles.card}>
                            <div style={styles.iconWrapper}>
                                <LayoutDashboard size={32} />
                            </div>
                            <h2 style={styles.cardTitle}>Internal Dashboard</h2>
                            <p style={styles.cardText}>Manage users, loans, and system settings</p>
                        </Link>
                    )}

                    {roles?.is_creditor && (
                        <Link href="/dashboard/creditor" style={styles.card}>
                            <div style={styles.iconWrapper}>
                                <DollarSign size={32} />
                            </div>
                            <h2 style={styles.cardTitle}>Creditor Portal</h2>
                            <p style={styles.cardText}>View investments and track returns</p>
                        </Link>
                    )}

                    {roles?.is_debtor && (
                        <Link href="/dashboard/debtor" style={styles.card}>
                            <div style={styles.iconWrapper}>
                                <Users size={32} />
                            </div>
                            <h2 style={styles.cardTitle}>Debtor Portal</h2>
                            <p style={styles.cardText}>Manage loans and view payment history</p>
                        </Link>
                    )}
                </div>

                <button onClick={handleLogout} style={styles.logoutBtn}>
                    <LogOut size={16} />
                    Sign Out
                </button>
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#070757',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '20px',
    },
    loading: {
        color: '#fff',
        fontSize: '1.1rem',
    },
    content: {
        width: '100%',
        maxWidth: '900px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    header: {
        textAlign: 'center',
        marginBottom: '48px',
    },
    logo: {
        height: '60px',
        width: 'auto',
        marginBottom: '24px',
        filter: 'brightness(1.1)',
    },
    title: {
        fontSize: '2.5rem',
        fontWeight: '800',
        color: '#fff',
        margin: '0 0 8px 0',
    },
    subtitle: {
        color: '#94a3b8',
        fontSize: '1.1rem',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        width: '100%',
        marginBottom: '48px',
    },
    card: {
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
        borderRadius: '24px',
        padding: '32px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        textDecoration: 'none',
        transition: 'transform 0.2s, background 0.2s, border-color 0.2s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        cursor: 'pointer',
    },
    iconWrapper: {
        width: '64px',
        height: '64px',
        borderRadius: '16px',
        background: 'rgba(2, 179, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#02B3FF',
        marginBottom: '16px',
    },
    cardTitle: {
        fontSize: '1.25rem',
        fontWeight: '700',
        color: '#fff',
        margin: '0 0 8px 0',
    },
    cardText: {
        color: '#94a3b8',
        fontSize: '0.95rem',
        margin: 0,
        lineHeight: '1.5',
    },
    logoutBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'none',
        border: 'none',
        color: '#ef4444',
        fontSize: '1rem',
        fontWeight: '500',
        cursor: 'pointer',
        padding: '12px 24px',
        borderRadius: '8px',
        transition: 'background 0.2s',
    },
};
