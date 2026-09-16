'use client';

import React, { useEffect, useState } from 'react';
import { Radio, RefreshCw } from 'lucide-react';

export default function OfflineWatcher() {
    const [isOffline, setIsOffline] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);

    useEffect(() => {
        // Initial check
        if (typeof window !== 'undefined') {
            setIsOffline(!navigator.onLine);
        }

        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => {
            setIsOffline(false);
            setIsRetrying(false);
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    const handleRetry = () => {
        setIsRetrying(true);
        if (navigator.onLine) {
            setIsOffline(false);
            setIsRetrying(false);
        } else {
            setTimeout(() => {
                setIsRetrying(false);
            }, 1200);
        }
    };

    if (!isOffline) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: '#070913',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            color: '#f0f6fc',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            padding: '24px',
            boxSizing: 'border-box'
        }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                maxWidth: '440px',
                width: '100%'
            }}>
                {/* Satellite / Signal Icon */}
                <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, rgba(2, 179, 255, 0.15), rgba(7, 7, 87, 0.4))',
                    border: '1px solid rgba(2, 179, 255, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '28px',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)'
                }}>
                    <Radio size={36} color="#02B3FF" />
                </div>

                {/* Heading */}
                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    margin: '0 0 16px 0',
                    color: '#ffffff',
                    letterSpacing: '-0.02em'
                }}>
                    You're Offline
                </h1>

                {/* Description */}
                <p style={{
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    color: '#94a3b8',
                    margin: '0 0 32px 0',
                    fontWeight: 400
                }}>
                    MStreet ERP can't connect to the server right now. Check your internet connection and try again.
                </p>

                {/* Try Again Button */}
                <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    style={{
                        width: '100%',
                        padding: '14px 28px',
                        background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontSize: '1rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                >
                    {isRetrying ? (
                        <>
                            <RefreshCw size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                            Checking Connection...
                        </>
                    ) : (
                        'Try Again'
                    )}
                </button>

                {/* Sub-text */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '28px',
                    fontSize: '0.875rem',
                    color: '#64748b'
                }}>
                    <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#ef4444',
                        display: 'inline-block',
                        boxShadow: '0 0 8px #ef4444'
                    }}></span>
                    <span>Waiting for connection...</span>
                </div>
            </div>

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
