'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import {
    User,
    Camera,
    Upload,
    Loader2,
    CheckCircle,
    AlertCircle
} from 'lucide-react';

interface GuarantorData {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    relationship: string | null;
    employer: string | null;
    occupation: string | null;
    status: string;
}

export default function GuarantorFormPage() {
    const params = useParams();
    const token = params.token as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [guarantorData, setGuarantorData] = useState<GuarantorData | null>(null);

    const selfieInputRef = useRef<HTMLInputElement>(null);
    const idInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        relationship: '',
        employer: '',
        occupation: '',
    });

    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [idFile, setIdFile] = useState<File | null>(null);
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
    const [idPreview, setIdPreview] = useState<string | null>(null);

    // Fetch guarantor submission data
    useEffect(() => {
        async function fetchData() {
            try {
                const supabase = createClient();
                const { data, error: fetchError } = await supabase
                    .from('guarantor_submissions')
                    .select('*')
                    .eq('access_token', token)
                    .single();

                if (fetchError) throw new Error('Invalid or expired link');
                if (data.status === 'submitted') {
                    setSuccess(true);
                }

                setGuarantorData(data);
                setFormData({
                    full_name: data.full_name || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    relationship: data.relationship || '',
                    employer: data.employer || '',
                    occupation: data.occupation || '',
                });
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        if (token) fetchData();
    }, [token]);

    // Handle file changes
    const handleSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelfieFile(file);
            setSelfiePreview(URL.createObjectURL(file));
        }
    };

    const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIdFile(file);
            setIdPreview(URL.createObjectURL(file));
        }
    };

    // Submit form
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selfieFile || !idFile) {
            setError('Please upload both selfie and ID document');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const supabase = createClient();

            console.log('[Guarantor Form] Starting submission...');
            console.log('[Guarantor Form] Token:', token);

            // Upload selfie
            const selfieExt = selfieFile.name.split('.').pop();
            const selfiePath = `guarantor-selfies/${token}.${selfieExt}`;
            console.log('[Guarantor Form] Uploading selfie to:', selfiePath);

            const { error: selfieError } = await supabase.storage
                .from('mstreetstorage')
                .upload(selfiePath, selfieFile, { upsert: true });
            if (selfieError) {
                console.error('[Guarantor Form] Selfie upload error:', selfieError);
                throw selfieError;
            }

            const { data: { publicUrl: selfieUrl } } = supabase.storage
                .from('mstreetstorage')
                .getPublicUrl(selfiePath);
            console.log('[Guarantor Form] Selfie URL:', selfieUrl);

            // Upload ID document
            const idExt = idFile.name.split('.').pop();
            const idPath = `guarantor-ids/${token}.${idExt}`;
            console.log('[Guarantor Form] Uploading ID to:', idPath);

            const { error: idError } = await supabase.storage
                .from('mstreetstorage')
                .upload(idPath, idFile, { upsert: true });
            if (idError) {
                console.error('[Guarantor Form] ID upload error:', idError);
                throw idError;
            }

            const { data: { publicUrl: idUrl } } = supabase.storage
                .from('mstreetstorage')
                .getPublicUrl(idPath);
            console.log('[Guarantor Form] ID URL:', idUrl);

            // Submit via API route (bypasses RLS using service role)
            console.log('[Guarantor Form] Calling API to save data...');
            const response = await fetch('/api/guarantor/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_token: token,
                    ...formData,
                    selfie_url: selfieUrl,
                    id_document_url: idUrl,
                }),
            });

            const result = await response.json();
            console.log('[Guarantor Form] API response:', result);

            if (!response.ok) {
                throw new Error(result.error || 'Failed to submit');
            }

            console.log('[Guarantor Form] Success!');
            setSuccess(true);
        } catch (err: any) {
            console.error('[Guarantor Form] Error:', err);
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #0a1929 0%, #1a365d 100%)',
            }}>
                <Loader2 size={40} style={{ color: '#02b3ff' }} className="animate-spin" />
            </div>
        );
    }

    if (error && !guarantorData) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #0a1929 0%, #1a365d 100%)',
                color: 'white',
                padding: '20px',
            }}>
                <AlertCircle size={60} style={{ color: '#f56565', marginBottom: '16px' }} />
                <h1>Invalid Link</h1>
                <p style={{ color: '#a0aec0' }}>{error}</p>
            </div>
        );
    }

    if (success) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #0a1929 0%, #1a365d 100%)',
                color: 'white',
                padding: '20px',
                textAlign: 'center',
            }}>
                <CheckCircle size={80} style={{ color: '#48bb78', marginBottom: '24px' }} />
                <h1 style={{ marginBottom: '12px' }}>Thank You!</h1>
                <p style={{ color: '#a0aec0', maxWidth: '400px' }}>
                    Your guarantor information has been submitted successfully.
                    The loan applicant will be notified of your submission.
                </p>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a1929 0%, #1a365d 100%)',
            padding: '40px 20px',
        }}>
            <div style={{
                maxWidth: '600px',
                margin: '0 auto',
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: '20px',
                padding: '32px',
                border: '1px solid rgba(255,255,255,0.1)',
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <img src="/secondary logo2.png" alt="MStreet" style={{ height: '50px', marginBottom: '16px' }} />
                    <h1 style={{ color: 'white', marginBottom: '8px' }}>Guarantor Verification</h1>
                    <p style={{ color: '#a0aec0' }}>
                        Please fill in your details to complete the loan guarantee process.
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(245, 101, 101, 0.1)',
                        border: '1px solid rgba(245, 101, 101, 0.3)',
                        color: '#f56565',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Personal Details */}
                    <h3 style={{ color: '#02b3ff', marginBottom: '16px', fontSize: '1rem' }}>Personal Details</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <input
                            type="text"
                            placeholder="Full Name *"
                            value={formData.full_name}
                            onChange={(e) => setFormData(f => ({ ...f, full_name: e.target.value }))}
                            required
                            style={inputStyle}
                        />
                        <input
                            type="email"
                            placeholder="Email *"
                            value={formData.email}
                            onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                            required
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <input
                            type="tel"
                            placeholder="Phone Number *"
                            value={formData.phone}
                            onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                            required
                            style={inputStyle}
                        />
                        <select
                            value={formData.relationship}
                            onChange={(e) => setFormData(f => ({ ...f, relationship: e.target.value }))}
                            required
                            style={inputStyle}
                        >
                            <option value="">Relationship *</option>
                            <option value="family">Family</option>
                            <option value="friend">Friend</option>
                            <option value="colleague">Colleague</option>
                            <option value="employer">Employer</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <textarea
                        placeholder="Address *"
                        value={formData.address}
                        onChange={(e) => setFormData(f => ({ ...f, address: e.target.value }))}
                        required
                        rows={2}
                        style={{ ...inputStyle, marginBottom: '16px', resize: 'vertical' }}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                        <input
                            type="text"
                            placeholder="Employer/Company"
                            value={formData.employer}
                            onChange={(e) => setFormData(f => ({ ...f, employer: e.target.value }))}
                            style={inputStyle}
                        />
                        <input
                            type="text"
                            placeholder="Occupation"
                            value={formData.occupation}
                            onChange={(e) => setFormData(f => ({ ...f, occupation: e.target.value }))}
                            style={inputStyle}
                        />
                    </div>

                    {/* Photo Uploads */}
                    <h3 style={{ color: '#02b3ff', marginBottom: '16px', fontSize: '1rem' }}>Verification Photos</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        {/* Selfie */}
                        <div
                            onClick={() => selfieInputRef.current?.click()}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '2px dashed rgba(255,255,255,0.2)',
                                borderRadius: '12px',
                                padding: '20px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                minHeight: '150px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {selfiePreview ? (
                                <img src={selfiePreview} alt="Selfie" style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '8px' }} />
                            ) : (
                                <>
                                    <Camera size={32} style={{ color: '#02b3ff', marginBottom: '8px' }} />
                                    <p style={{ color: '#a0aec0', fontSize: '0.85rem', margin: 0 }}>Take or upload selfie *</p>
                                </>
                            )}
                        </div>
                        <input ref={selfieInputRef} type="file" accept="image/*" capture="user" onChange={handleSelfieChange} style={{ display: 'none' }} />

                        {/* ID Document */}
                        <div
                            onClick={() => idInputRef.current?.click()}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '2px dashed rgba(255,255,255,0.2)',
                                borderRadius: '12px',
                                padding: '20px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                minHeight: '150px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {idPreview ? (
                                <img src={idPreview} alt="ID" style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '8px' }} />
                            ) : (
                                <>
                                    <Upload size={32} style={{ color: '#02b3ff', marginBottom: '8px' }} />
                                    <p style={{ color: '#a0aec0', fontSize: '0.85rem', margin: 0 }}>Upload ID document *</p>
                                </>
                            )}
                        </div>
                        <input ref={idInputRef} type="file" accept="image/*,.pdf" onChange={handleIdChange} style={{ display: 'none' }} />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            width: '100%',
                            padding: '16px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #02b3ff, #7c3aed)',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '1rem',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                        }}
                    >
                        {submitting && <Loader2 size={18} className="animate-spin" />}
                        {submitting ? 'Submitting...' : 'Submit Verification'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
    fontSize: '0.95rem',
};
