'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useUser } from '@/hooks/dashboard/useUser';
import { useSystemSettings, GuarantorTier } from '@/hooks/dashboard/useSystemSettings';
import { useCurrency } from '@/hooks/useCurrency';
import {
    Settings,
    Save,
    Plus,
    Trash2,
    CheckCircle,
    AlertCircle,
    DollarSign,
    Users,
    Percent,
    Clock
} from 'lucide-react';
import styles from '../creditors/page.module.css';
import MStreetLoader from '@/components/ui/MStreetLoader';

export default function SettingsPage() {
    const { user, loading: userLoading } = useUser();
    const { settings, loading, updateSetting, refetch } = useSystemSettings();
    const { formatCurrency } = useCurrency();

    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Local state for editing
    const [loanLimits, setLoanLimits] = useState({ min: 0, max: 0 });
    const [guarantorEnabled, setGuarantorEnabled] = useState(true);
    const [guarantorTiers, setGuarantorTiers] = useState<GuarantorTier[]>([]);
    const [interestRate, setInterestRate] = useState({ default: 5, min: 2, max: 15 });
    const [tenureOptions, setTenureOptions] = useState<number[]>([]);

    // Load settings into local state
    useEffect(() => {
        if (!loading && settings) {
            setLoanLimits(settings.loan_limits);
            setGuarantorEnabled(settings.guarantor_enabled);
            setGuarantorTiers(settings.guarantor_tiers);
            setInterestRate(settings.interest_rate);
            setTenureOptions(settings.tenure_options);
        }
    }, [loading, settings]);

    // Check access
    const isSuperAdmin = user?.roles?.some(r => r.name === 'super_admin');

    if (userLoading || loading) {
        return (
            <div className={styles.loading}>
                <MStreetLoader size={120} />
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Loading settings...
                </p>
            </div>
        );
    }

    if (!isSuperAdmin) {
        return (
            <div className={styles.error}>
                <AlertCircle size={48} style={{ color: 'var(--danger)' }} />
                <h1>Access Denied</h1>
                <p>Only Super Admins can access settings.</p>
            </div>
        );
    }

    // Save all settings
    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            await updateSetting('loan_limits', loanLimits);
            await updateSetting('guarantor_enabled', guarantorEnabled);
            await updateSetting('guarantor_tiers', guarantorTiers);
            await updateSetting('interest_rate', interestRate);
            await updateSetting('tenure_options', tenureOptions);

            setSuccess('Settings saved successfully!');
            await refetch();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // Add guarantor tier
    const addTier = () => {
        const lastTier = guarantorTiers[guarantorTiers.length - 1];
        setGuarantorTiers([
            ...guarantorTiers,
            { min: (lastTier?.max || 0) + 1, max: (lastTier?.max || 0) + 500000, required: (lastTier?.required || 0) + 1 }
        ]);
    };

    // Remove guarantor tier
    const removeTier = (index: number) => {
        setGuarantorTiers(guarantorTiers.filter((_, i) => i !== index));
    };

    // Update guarantor tier
    const updateTier = (index: number, field: keyof GuarantorTier, value: number) => {
        const updated = [...guarantorTiers];
        updated[index] = { ...updated[index], [field]: value };
        setGuarantorTiers(updated);
    };

    const inputStyle: React.CSSProperties = {
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid var(--border-secondary)',
        background: 'var(--bg-input)',
        color: 'var(--text-primary)',
        fontSize: '1rem',
        width: '100%',
    };

    const cardStyle: React.CSSProperties = {
        background: 'var(--bg-secondary)',
        borderRadius: '12px',
        border: '1px solid var(--border-primary)',
        padding: '24px',
        marginBottom: '20px',
    };

    return (
        <DashboardLayout currentUser={user || undefined}>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.pageHeader}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>
                            <Settings size={28} style={{ marginRight: '12px' }} />
                            System Settings
                        </h1>
                        <p className={styles.pageSubtitle}>Configure loan policies and requirements</p>
                    </div>
                    <div className={styles.headerRight}>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={styles.createBtn}
                        >
                            {saving ? <MStreetLoader size={20} color="#ffffff" /> : <Save size={20} />}
                            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                    </div>
                </div>

                {/* Messages */}
                {success && (
                    <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={18} /> {success}
                    </div>
                )}
                {error && (
                    <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
                        {error}
                    </div>
                )}

                {/* Loan Limits */}
                <div style={cardStyle}>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DollarSign size={20} style={{ color: 'var(--accent-primary)' }} />
                        Loan Limits
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Minimum Amount</label>
                            <input
                                type="number"
                                value={loanLimits.min}
                                onChange={(e) => setLoanLimits({ ...loanLimits, min: parseInt(e.target.value) || 0 })}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Maximum Amount</label>
                            <input
                                type="number"
                                value={loanLimits.max}
                                onChange={(e) => setLoanLimits({ ...loanLimits, max: parseInt(e.target.value) || 0 })}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                </div>

                {/* Guarantor Settings */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <Users size={20} style={{ color: 'var(--accent-primary)' }} />
                            Guarantor Requirements
                        </h3>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={guarantorEnabled}
                                onChange={(e) => setGuarantorEnabled(e.target.checked)}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <span style={{ color: 'var(--text-secondary)' }}>Enable Guarantors</span>
                        </label>
                    </div>

                    {guarantorEnabled && (
                        <>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>
                                Define how many guarantors are required based on loan amount.
                            </p>

                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                        <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>Min Amount</th>
                                        <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>Max Amount</th>
                                        <th style={{ textAlign: 'left', padding: '8px', color: 'var(--text-secondary)' }}>Guarantors Required</th>
                                        <th style={{ width: '50px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {guarantorTiers.map((tier, index) => (
                                        <tr key={index} style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                                            <td style={{ padding: '8px' }}>
                                                <input
                                                    type="number"
                                                    value={tier.min}
                                                    onChange={(e) => updateTier(index, 'min', parseInt(e.target.value) || 0)}
                                                    style={{ ...inputStyle, padding: '8px' }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <input
                                                    type="number"
                                                    value={tier.max}
                                                    onChange={(e) => updateTier(index, 'max', parseInt(e.target.value) || 0)}
                                                    style={{ ...inputStyle, padding: '8px' }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <input
                                                    type="number"
                                                    value={tier.required}
                                                    min={0}
                                                    onChange={(e) => updateTier(index, 'required', parseInt(e.target.value) || 0)}
                                                    style={{ ...inputStyle, padding: '8px', width: '100px' }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <button
                                                    onClick={() => removeTier(index)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <button
                                onClick={addTier}
                                style={{
                                    marginTop: '12px',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: '1px dashed var(--border-secondary)',
                                    background: 'transparent',
                                    color: 'var(--accent-primary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}
                            >
                                <Plus size={16} /> Add Tier
                            </button>
                        </>
                    )}
                </div>

                {/* Interest Rate */}
                <div style={cardStyle}>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Percent size={20} style={{ color: 'var(--accent-primary)' }} />
                        Interest Rate (%)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Default Rate</label>
                            <input
                                type="number"
                                step="0.1"
                                value={interestRate.default}
                                onChange={(e) => setInterestRate({ ...interestRate, default: parseFloat(e.target.value) || 0 })}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Minimum Rate</label>
                            <input
                                type="number"
                                step="0.1"
                                value={interestRate.min}
                                onChange={(e) => setInterestRate({ ...interestRate, min: parseFloat(e.target.value) || 0 })}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Maximum Rate</label>
                            <input
                                type="number"
                                step="0.1"
                                value={interestRate.max}
                                onChange={(e) => setInterestRate({ ...interestRate, max: parseFloat(e.target.value) || 0 })}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                </div>

                {/* Tenure Options */}
                <div style={cardStyle}>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={20} style={{ color: 'var(--accent-primary)' }} />
                        Tenure Options (months)
                    </h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>
                        Comma-separated list of available loan durations.
                    </p>
                    <input
                        type="text"
                        value={tenureOptions.join(', ')}
                        onChange={(e) => {
                            const values = e.target.value.split(',').map(v => parseInt(v.trim())).filter(n => !isNaN(n));
                            setTenureOptions(values);
                        }}
                        placeholder="3, 6, 12, 18, 24, 36"
                        style={inputStyle}
                    />
                </div>
            </div>
        </DashboardLayout>
    );
}
