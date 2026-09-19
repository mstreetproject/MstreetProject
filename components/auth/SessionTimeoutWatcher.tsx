"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// 30 Minutes Inactivity Timeout
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
// 60 Seconds Warning Modal prior to logout
const WARNING_DURATION = 60 * 1000;

export default function SessionTimeoutWatcher() {
    const router = useRouter();
    const pathname = usePathname();

    const [showWarning, setShowWarning] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(60);

    const lastActivityRef = useRef<number>(Date.now());
    const lastThrottleRef = useRef<number>(0);
    const isLoggingOutRef = useRef<boolean>(false);

    const handleUserActivity = useCallback(() => {
        const now = Date.now();
        // Throttle updates to at most once per second
        if (now - lastThrottleRef.current > 1000) {
            lastThrottleRef.current = now;
            lastActivityRef.current = now;

            // User activity automatically dismisses warning
            setShowWarning(false);
        }
    }, []);

    useEffect(() => {
        // Only monitor inactivity on protected dashboard routes
        if (!pathname || !pathname.startsWith('/dashboard')) {
            setShowWarning(false);
            return;
        }

        const activityEvents = [
            'mousedown', 'mousemove', 'keydown', 'keyup',
            'touchstart', 'touchend', 'click', 'scroll',
            'input', 'change', 'wheel', 'focus', 'pointermove'
        ];

        // Register event listeners with capture phase to intercept events inside modals, portals, forms
        activityEvents.forEach(event => {
            window.addEventListener(event, handleUserActivity, { capture: true, passive: true });
        });

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                lastActivityRef.current = Date.now();
                setShowWarning(false);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Check inactivity every 2 seconds
        const interval = setInterval(async () => {
            if (isLoggingOutRef.current) return;

            const now = Date.now();
            const elapsedInactive = now - lastActivityRef.current;

            if (elapsedInactive >= INACTIVITY_TIMEOUT) {
                isLoggingOutRef.current = true;
                setShowWarning(false);

                try {
                    const supabase = createClient();
                    await supabase.auth.signOut();
                } catch (e) {
                    console.error('Error signing out during session timeout:', e);
                }

                router.push('/login?message=session_expired');
                router.refresh();
            } else if (elapsedInactive >= (INACTIVITY_TIMEOUT - WARNING_DURATION)) {
                const secsLeft = Math.max(1, Math.ceil((INACTIVITY_TIMEOUT - elapsedInactive) / 1000));
                setRemainingSeconds(secsLeft);
                setShowWarning(true);
            } else {
                setShowWarning(false);
            }
        }, 2000);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            activityEvents.forEach(event => {
                window.removeEventListener(event, handleUserActivity, { capture: true });
            });
        };
    }, [pathname, router, handleUserActivity]);

    const handleStayLoggedIn = () => {
        lastActivityRef.current = Date.now();
        lastThrottleRef.current = Date.now();
        setShowWarning(false);
    };

    if (!showWarning || !pathname?.startsWith('/dashboard')) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(7, 7, 30, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            backdropFilter: 'blur(8px)',
            color: 'white',
            fontFamily: 'Inter, system-ui, sans-serif',
            textAlign: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: 'var(--bg-secondary, #1e293b)',
                padding: '36px 48px',
                borderRadius: '20px',
                border: '1px solid var(--border-secondary, rgba(2, 179, 255, 0.3))',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                maxWidth: '450px',
                width: '100%'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏳</div>
                <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    marginBottom: '12px',
                    color: 'var(--text-primary, #ffffff)'
                }}>
                    Session Expiry Warning
                </h3>
                <p style={{ fontSize: '1rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '24px', lineHeight: 1.5 }}>
                    You have been inactive for 29 minutes. For your security, you will be logged out in <strong style={{ color: '#f59e0b', fontSize: '1.1rem' }}>{remainingSeconds} seconds</strong>.
                </p>
                <button
                    type="button"
                    onClick={handleStayLoggedIn}
                    style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, var(--accent-primary, #02B3FF), var(--accent-secondary, #0077ff))',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(2, 179, 255, 0.4)',
                        transition: 'transform 0.15s ease'
                    }}
                >
                    Keep Me Logged In
                </button>
            </div>
        </div>
    );
}
