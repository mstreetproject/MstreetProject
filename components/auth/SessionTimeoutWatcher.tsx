"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const TIMEOUT_DURATION = 10 * 60 * 1000; // 1 minute for testing

export default function SessionTimeoutWatcher() {
    const router = useRouter();
    const [isTimingOut, setIsTimingOut] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const supabase = createClient();

        const resetTimeout = () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(async () => {
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    setIsTimingOut(true);

                    // Show message on UI for 3 seconds before redirecting
                    setTimeout(async () => {
                        await supabase.auth.signOut();
                        router.push('/login?message=session_expired');
                        router.refresh();
                        setIsTimingOut(false);
                    }, 4000);
                }
            }, TIMEOUT_DURATION);
        };

        const activityEvents = [
            'mousedown', 'mousemove', 'keypress',
            'scroll', 'touchstart', 'click'
        ];

        // Initialize timeout
        resetTimeout();

        // Add event listeners
        activityEvents.forEach(event => {
            window.addEventListener(event, resetTimeout);
        });

        // Periodic check in case the tab is inactive but Supabase session expires
        const interval = setInterval(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session && window.location.pathname.startsWith('/dashboard')) {
                router.push('/login?message=session_expired');
                router.refresh();
            }
        }, 60000); // every minute

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            clearInterval(interval);
            activityEvents.forEach(event => {
                window.removeEventListener(event, resetTimeout);
            });
        };
    }, [router]);

    if (!isTimingOut) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(7, 7, 87, 0.95)', // brand deep navy with slight transparency
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(8px)',
            color: 'white',
            fontFamily: 'Inter, system-ui, sans-serif',
            textAlign: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '40px 60px',
                borderRadius: '24px',
                border: '1px solid rgba(2, 179, 255, 0.3)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⏳</div>
                <h2 style={{
                    fontSize: '2.5rem',
                    fontWeight: 800,
                    marginBottom: '16px',
                    background: 'linear-gradient(135deg, #02B3FF, #B8DB0F)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Session Timed Out
                </h2>
                <p style={{ fontSize: '1.25rem', color: '#cbd5e1', maxWidth: '400px', margin: '0 auto' }}>
                    You have been inactive for too long. Redirecting you to login...
                </p>
                <div style={{ marginTop: '32px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid #02B3FF',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto'
                    }} />
                    <style>{`
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            </div>
        </div>
    );
}
