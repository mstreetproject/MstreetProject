'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Download } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';

export default function CreditorDocumentsPage() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate loading delay
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return (
            <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: 'var(--text-muted)' }}>
                    <MStreetLoader size={120} />
                    <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Loading documents...
                    </p>
                </div>
            </div>
        );
    }
    return (
        <div style={{ padding: '24px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Documents
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                Access your investment contracts and reports.
            </p>

            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '16px',
                padding: '40px',
                border: '1px solid var(--border-primary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px',
                textAlign: 'center'
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--bg-hover)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    color: 'var(--text-muted)'
                }}>
                    <FileText size={32} />
                </div>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '600', marginBottom: '8px' }}>
                    No documents yet
                </h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>
                    Documents related to your investments will appear here once they are available.
                </p>
            </div>
        </div>
    );
}
