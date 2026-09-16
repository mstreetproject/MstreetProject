'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/dashboard/useUser';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useCurrency } from '@/hooks/useCurrency';
import { User, Banknote, Percent, Calendar, Clock, TrendingUp, Upload, FileText } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import { useInvesteeCompanies } from '@/hooks/dashboard/useInvesteeCompanies';
import styles from './RecordInvestmentForm.module.css';


interface Props {
    onSuccess?: () => void;
}

export default function RecordInvestmentForm({ onSuccess }: Props) {
    useUser();
    useCurrency();
    const { logActivity } = useActivityLog();
    const { companies, loading: loadingCompanies } = useInvesteeCompanies();
    const [loading, setLoading] = useState(false);
    const [, setRefreshCount] = useState(0);
    const [, setLoadingCreditors] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        investee_id: '',
        principal: '',
        roi_rate: '',
        tenure_months: '',
        start_date: new Date().toISOString().split('T')[0],
    });

    const [investmentDocs, setInvestmentDocs] = useState<File[]>([]);
    const [, setUploadingDocs] = useState(false);

    // No need to fetch creditors for outward investments
    useEffect(() => {
        setLoadingCreditors(false);
    }, []);

    const calculateEndDate = (startDate: string, tenureMonths: number): string => {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + tenureMonths);
        return date.toISOString().split('T')[0];
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setInvestmentDocs(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setLoading(true);

        try {
            if (!formData.investee_id || !formData.principal || !formData.roi_rate || !formData.tenure_months) {
                throw new Error('Please fill in all required fields');
            }

            const supabase = createClient();
            const tenure = parseInt(formData.tenure_months);
            const endDate = calculateEndDate(formData.start_date, tenure);

            const { data: insertedData, error: insertError } = await supabase
                .from('investments')
                .insert({
                    investee_id: formData.investee_id,
                    principal: parseFloat(formData.principal),
                    roi_rate: parseFloat(formData.roi_rate),
                    tenure_months: tenure,
                    start_date: formData.start_date,
                    end_date: endDate,
                    status: 'active',
                })
                .select()
                .single();

            if (insertError) throw insertError;

            const investmentId = insertedData.id;

            // Upload Investment Documents if any
            if (investmentDocs.length > 0) {
                setUploadingDocs(true);
                for (const file of investmentDocs) {
                    const fileName = `${investmentId}/${Date.now()}_${file.name}`;

                    const { error: uploadError } = await supabase.storage
                        .from('mstreetstorage')
                        .upload(`investment-documents/${fileName}`, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('mstreetstorage')
                        .getPublicUrl(`investment-documents/${fileName}`);

                    await supabase.from('investment_documents').insert({
                        investment_id: investmentId,
                        file_url: publicUrl,
                        file_name: file.name
                    });
                }
            }

            // Log as Investment
            const selectedCompany = companies.find(c => c.id === formData.investee_id);
            await logActivity('RECORD_INVESTMENT', 'investment', investmentId, {
                company_name: selectedCompany?.name,
                amount: parseFloat(formData.principal),
                rate: parseFloat(formData.roi_rate),
                tenure: tenure,
                docs_count: investmentDocs.length
            });

            setSuccess(true);
            setFormData({
                investee_id: '',
                principal: '',
                roi_rate: '',
                tenure_months: '',
                start_date: new Date().toISOString().split('T')[0],
            });
            setInvestmentDocs([]);
            setRefreshCount(prev => prev + 1);
            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to record investment');
        } finally {
            setLoading(false);
            setUploadingDocs(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <TrendingUp size={24} style={{ color: 'var(--accent-primary)' }} />
                <h3 className={styles.formTitle} style={{ margin: 0 }}>Record New Investment</h3>
            </div>
            <p className={styles.formSubtitle}>Enter investment details for a company investment</p>

            {error && <div className={styles.errorMessage}>{error}</div>}
            {success && <div className={styles.successMessage}>Investment recorded successfully!</div>}

            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label htmlFor="investee_id" className={styles.label}>
                        <User size={16} />
                        Investment Company *
                    </label>
                    <select
                        id="investee_id"
                        value={formData.investee_id}
                        onChange={(e) => setFormData(d => ({ ...d, investee_id: e.target.value }))}
                        className={styles.select}
                        required
                        disabled={loadingCompanies}
                    >
                        <option value="">
                            {loadingCompanies ? 'Loading companies...' : 'Select a company'}
                        </option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="principal" className={styles.label}>
                        <Banknote size={16} />
                        Investment Principal *
                    </label>
                    <input
                        id="principal"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.principal}
                        onChange={(e) => setFormData(d => ({ ...d, principal: e.target.value }))}
                        placeholder="0.00"
                        className={styles.input}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="roi_rate" className={styles.label}>
                        <Percent size={16} />
                        ROI Rate (%) *
                    </label>
                    <input
                        id="roi_rate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.roi_rate}
                        onChange={(e) => setFormData(d => ({ ...d, roi_rate: e.target.value }))}
                        placeholder="10.0"
                        className={styles.input}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="tenure_months" className={styles.label}>
                        <Clock size={16} />
                        Lock-in Period (Months) *
                    </label>
                    <input
                        id="tenure_months"
                        type="number"
                        min="1"
                        value={formData.tenure_months}
                        onChange={(e) => setFormData(d => ({ ...d, tenure_months: e.target.value }))}
                        placeholder="12"
                        className={styles.input}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="start_date" className={styles.label}>
                        <Calendar size={16} />
                        Investment Date *
                    </label>
                    <input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData(d => ({ ...d, start_date: e.target.value }))}
                        className={styles.input}
                        required
                    />
                </div>
            </div>

            {/* Investment Letter Upload */}
            <div style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-primary)' }}>
                    <Upload size={18} />
                    <span style={{ fontWeight: 600 }}>Investment Letter</span>
                </div>
                <div style={{
                    border: '2px dashed var(--border-secondary)',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                    background: 'var(--bg-tertiary)',
                    cursor: 'pointer'
                }} onClick={() => document.getElementById('investment-doc-upload')?.click()}>
                    <input
                        id="investment-doc-upload"
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                    {investmentDocs.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                            {investmentDocs.map((file, i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'var(--bg-card)',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem'
                                }}>
                                    <FileText size={14} />
                                    <span>{file.name}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Click or drag files to upload the investment letter</p>
                            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>PDF, PNG, JPG accepted</p>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.formFooter}>
                <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={loading || loadingCompanies}
                >
                    {loading && <MStreetLoader size={18} color="#ffffff" />}
                    {loading ? 'Processing...' : 'Record Investment'}
                </button>
            </div>
        </form>
    );
}
