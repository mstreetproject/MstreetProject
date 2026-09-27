import React from 'react';
import { Search, Calculator, CheckCircle, AlertCircle, Info } from 'lucide-react';
import styles from '../CreateCreditForm.module.css';

interface ActiveLoanSelectorProps {
    loans: any[];
    filteredActiveLoans: any[];
    selectedLoanId: string;
    setSelectedLoanId: (id: string) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    loadingLoans: boolean;
    submitting: boolean;
    formatCurrency: (val: number) => string;
    loan: any;
    calculations: { principalDue: number; interestDue: number; totalDue: number };
    setViewingPdf: (pdf: { url: string; name: string } | null) => void;
}

export default function ActiveLoanSelector({
    filteredActiveLoans,
    selectedLoanId,
    setSelectedLoanId,
    searchTerm,
    setSearchTerm,
    loadingLoans,
    submitting,
    formatCurrency,
    loan,
    calculations,
    setViewingPdf
}: ActiveLoanSelectorProps) {
    return (
        <>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                    <label className={styles.label} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Search Debtor / Ref No.
                    </label>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Type to filter..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px 12px 36px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-secondary)',
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>
                </div>

                <div style={{ flex: '2', minWidth: '300px' }}>
                    <label htmlFor="loan_id" className={styles.label} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Select Active Loan *
                    </label>
                    <select
                        id="loan_id"
                        value={selectedLoanId}
                        onChange={(e) => setSelectedLoanId(e.target.value)}
                        className={styles.select}
                        required
                        disabled={loadingLoans || submitting}
                    >
                        <option value="">
                            {loadingLoans ? 'Loading loans...' : filteredActiveLoans.length === 0 ? 'No active loans found' : 'Select an active loan...'}
                        </option>
                        {filteredActiveLoans.map(l => (
                            <option key={l.id} value={l.id}>
                                {l.debtor?.full_name} - {formatCurrency(l.principal)} (#{l.reference_no || l.id.slice(0, 8)})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loan && (
                <>
                    {/* Concrete Info for Paid Loans */}
                    {(loan.status === 'preliquidated' || loan.status === 'repaid') && (
                        <div style={{
                            gridColumn: '1 / -1',
                            padding: '12px 16px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 600,
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            marginBottom: '10px'
                        }}>
                            <CheckCircle size={20} />
                            This loan has been fully repaid.
                        </div>
                    )}
                    
                    {/* Amount Due Summary */}
                    <div style={{
                        gridColumn: '1 / -1',
                        background: loan?.id === selectedLoanId
                            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08))'
                            : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05))',
                        borderRadius: '12px',
                        padding: '24px',
                        marginBottom: '10px',
                        border: loan?.id === selectedLoanId
                            ? '2px solid var(--accent-primary)'
                            : '1px solid var(--border-secondary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        boxShadow: loan?.id === selectedLoanId ? '0 4px 20px rgba(99, 102, 241, 0.1)' : 'none',
                        transition: 'all 0.2s ease'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calculator size={18} style={{ color: 'var(--accent-primary)' }} />
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>Selection Details</span>
                                {loan.loan_documents?.some((d: any) => d.is_signed) ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const signedDoc = loan.loan_documents?.find((d: any) => d.is_signed);
                                            if (signedDoc) {
                                                setViewingPdf({
                                                    url: signedDoc.signed_file_url || signedDoc.file_url,
                                                    name: signedDoc.file_name
                                                });
                                            }
                                        }}
                                        style={{
                                            marginLeft: '8px',
                                            fontSize: '0.65rem',
                                            background: '#10b981',
                                            color: 'white',
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        title="Click to view signed document"
                                    >
                                        <CheckCircle size={10} />
                                        Signed Agreement
                                    </button>
                                ) : (
                                    <span style={{
                                        marginLeft: '8px',
                                        fontSize: '0.65rem',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        color: '#ef4444',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontWeight: 700,
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        textTransform: 'uppercase'
                                    }}>
                                        <AlertCircle size={10} />
                                        Awaiting Signature
                                    </span>
                                )}
                                {loan.repayment_method && loan.repayment_method !== 'both' && (
                                    <span style={{
                                        marginLeft: '8px',
                                        fontSize: '0.65rem',
                                        background: loan.repayment_method === 'interest_only' ? 'rgba(245, 158, 11, 0.1)' : loan.repayment_method === 'capital_only' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                                        color: loan.repayment_method === 'interest_only' ? '#d97706' : loan.repayment_method === 'capital_only' ? '#2563eb' : '#9333ea',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontWeight: 700,
                                        border: `1px solid ${loan.repayment_method === 'interest_only' ? 'rgba(245, 158, 11, 0.2)' : loan.repayment_method === 'capital_only' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(168, 85, 247, 0.2)'}`,
                                        textTransform: 'uppercase'
                                    }}>
                                        <Info size={10} />
                                        {loan.repayment_method === 'interest_only' ? 'Interest Only Plan' : loan.repayment_method === 'capital_only' ? 'Capital Only Plan' : 'Custom Plan'}
                                    </span>
                                )}
                            </div>
                            {(loan.status === 'preliquidated' || loan.status === 'repaid') && (
                                <span style={{
                                    fontSize: '0.7rem',
                                    background: '#10b981',
                                    color: 'white',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    textTransform: 'uppercase'
                                }}>Fully Paid</span>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px' }}>
                            <div>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Principal Due</p>
                                <p style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    {formatCurrency(calculations.principalDue)}
                                </p>
                            </div>
                            <div>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Interest Accrued</p>
                                <p style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                    {formatCurrency(calculations.interestDue)}
                                </p>
                            </div>
                            <div style={{ borderLeft: '1px solid var(--border-secondary)', paddingLeft: '20px' }}>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Payable</p>
                                <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 900, color: 'var(--success)' }}>
                                    {formatCurrency(calculations.totalDue)}
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
