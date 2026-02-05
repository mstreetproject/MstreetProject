'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/dashboard/useUser';
import { useActivityLog } from '@/hooks/useActivityLog';
import { User, Banknote, Percent, Calendar, Clock, Upload, FileText } from 'lucide-react';
import MStreetLoader from '@/components/ui/MStreetLoader';
import styles from './CreateCreditForm.module.css';

interface Creditor {
    id: string;
    full_name: string;
    email: string;
}

interface CreateCreditFormProps {
    onSuccess?: () => void;
}

export default function CreateCreditForm({ onSuccess }: CreateCreditFormProps) {
    const { user } = useUser();
    const { logActivity } = useActivityLog();
    const [creditors, setCreditors] = useState<Creditor[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingCreditors, setLoadingCreditors] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        creditor_id: '',
        principal: '',
        interest_rate: '',
        tenure_months: '',
        start_date: new Date().toISOString().split('T')[0],
    });

    const [placementDocs, setPlacementDocs] = useState<File[]>([]);
    const [, setUploadingDocs] = useState(false);

    // Fetch creditors on mount
    useEffect(() => {
        async function fetchCreditors() {
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('users')
                    .select('id, full_name, email')
                    .eq('is_creditor', true)
                    .order('full_name');

                if (error) throw error;
                setCreditors(data || []);
            } catch (err) {
                console.error('Error fetching creditors:', err);
            } finally {
                setLoadingCreditors(false);
            }
        }
        fetchCreditors();
    }, []);

    const calculateEndDate = (startDate: string, tenureMonths: number): string => {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + tenureMonths);
        return date.toISOString().split('T')[0];
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setPlacementDocs(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setLoading(true);

        try {
            if (!formData.creditor_id || !formData.principal || !formData.interest_rate || !formData.tenure_months) {
                throw new Error('Please fill in all required fields');
            }

            const supabase = createClient();
            const tenure = parseInt(formData.tenure_months);
            const endDate = calculateEndDate(formData.start_date, tenure);

            const { data: insertedData, error: insertError } = await supabase
                .from('credits')
                .insert({
                    creditor_id: formData.creditor_id,
                    principal: parseFloat(formData.principal),
                    interest_rate: parseFloat(formData.interest_rate),
                    tenure_months: tenure,
                    start_date: formData.start_date,
                    end_date: endDate,
                    status: 'active',
                })
                .select()
                .single();

            if (insertError) throw insertError;

            const creditId = insertedData.id;

            // Upload Placement Documents if any
            if (placementDocs.length > 0) {
                setUploadingDocs(true);
                for (const file of placementDocs) {
                    const fileName = `${formData.creditor_id}/${creditId}/${Date.now()}_${file.name}`;

                    const { error: uploadError } = await supabase.storage
                        .from('mstreetstorage')
                        .upload(`placement-documents/${fileName}`, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('mstreetstorage')
                        .getPublicUrl(`placement-documents/${fileName}`);

                    await supabase.from('placement_documents').insert({
                        credit_id: creditId,
                        creditor_id: formData.creditor_id,
                        file_url: publicUrl,
                        file_name: file.name
                    });
                }
            }

            // Log the credit creation
            const selectedCreditor = creditors.find(c => c.id === formData.creditor_id);
            await logActivity('CREATE_CREDIT', 'credit', creditId, {
                creditor_name: selectedCreditor?.full_name,
                principal: parseFloat(formData.principal),
                interest_rate: parseFloat(formData.interest_rate),
                tenure_months: tenure,
                docs_count: placementDocs.length
            });

            setSuccess(true);
            setFormData({
                creditor_id: '',
                principal: '',
                interest_rate: '',
                tenure_months: '',
                start_date: new Date().toISOString().split('T')[0],
            });
            setPlacementDocs([]);
            onSuccess?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to record credit');
        } finally {
            setLoading(false);
            setUploadingDocs(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <h3 className={styles.formTitle}>Record Placement</h3>
            <p className={styles.formSubtitle}>Record funds received from a creditor</p>

            {error && <div className={styles.errorMessage}>{error}</div>}
            {success && <div className={styles.successMessage}>Placement recorded successfully!</div>}

            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label htmlFor="creditor_id" className={styles.label}>
                        <User size={16} />
                        Creditor *
                    </label>
                    <select
                        id="creditor_id"
                        value={formData.creditor_id}
                        onChange={(e) => setFormData(d => ({ ...d, creditor_id: e.target.value }))}
                        className={styles.select}
                        required
                        disabled={loadingCreditors}
                    >
                        <option value="">
                            {loadingCreditors ? 'Loading...' : 'Select a creditor'}
                        </option>
                        {creditors.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.full_name} ({c.email})
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="principal" className={styles.label}>
                        <Banknote size={16} />
                        Principal Amount *
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
                    <label htmlFor="interest_rate" className={styles.label}>
                        <Percent size={16} />
                        Interest Rate (%) *
                    </label>
                    <input
                        id="interest_rate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.interest_rate}
                        onChange={(e) => setFormData(d => ({ ...d, interest_rate: e.target.value }))}
                        placeholder="8.5"
                        className={styles.input}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="tenure_months" className={styles.label}>
                        <Clock size={16} />
                        Tenure (Months) *
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
                        Start Date *
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

            {/* Placement Letter Upload */}
            <div style={{ gridColumn: '1 / -1', marginTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-primary)' }}>
                    <Upload size={18} />
                    <span style={{ fontWeight: 600 }}>Placement Letter</span>
                </div>
                <div style={{
                    border: '2px dashed var(--border-secondary)',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                    background: 'var(--bg-tertiary)',
                    cursor: 'pointer'
                }} onClick={() => document.getElementById('placement-doc-upload')?.click()}>
                    <input
                        id="placement-doc-upload"
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                    {placementDocs.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                            {placementDocs.map((file, i) => (
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
                            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Click or drag files to upload the placement letter</p>
                            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>PDF, PNG, JPG accepted</p>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.formFooter}>
                <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={loading || loadingCreditors}
                >
                    {loading && <MStreetLoader size={18} color="#ffffff" />}
                    {loading ? 'Recording...' : 'Record Placement'}
                </button>
            </div>
        </form>
    );
}
