import React from 'react';
import { Banknote, Percent, User, Calculator, Info, List, Calendar } from 'lucide-react';
import DataTable from '../DataTable';
import styles from '../CreateCreditForm.module.css';

interface PaymentInputsProps {
    paymentMode: 'both' | 'interest_only' | 'capital_only' | 'custom';
    setPaymentMode: (mode: 'both' | 'interest_only' | 'capital_only' | 'custom') => void;
    principalAmount: string;
    setPrincipalAmount: (val: string) => void;
    interestAmount: string;
    setInterestAmount: (val: string) => void;
    setIsPartialPayment: (val: boolean) => void;
    submitting: boolean;
    notes: string;
    setNotes: (val: string) => void;
    schedule: any[];
    selectedScheduleIndex: number | null;
    applyPaymentPreset: (mode: 'both' | 'interest_only' | 'capital_only' | 'custom', pDue: number, iDue: number) => void;
    handleSelectScheduleItem: (row: any, index: number, mode: 'both' | 'interest_only' | 'capital_only' | 'custom') => void;
    calculations: any;
    expectedPrincipal: number;
    expectedInterest: number;
    actualTotal: number;
    expectedTotal: number;
    totalPayment: number;
    totalRemainingPayoff: number;
    isFinalPhaseShortfall: boolean;
    actualPrincipal: number;
    actualInterest: number;
    formatCurrency: (val: number) => string;
}

export default function PaymentInputs({
    paymentMode,
    setPaymentMode,
    principalAmount,
    setPrincipalAmount,
    interestAmount,
    setInterestAmount,
    setIsPartialPayment,
    submitting,
    notes,
    setNotes,
    schedule,
    selectedScheduleIndex,
    applyPaymentPreset,
    handleSelectScheduleItem,
    expectedPrincipal,
    expectedInterest,
    actualTotal,
    expectedTotal,
    totalPayment,
    totalRemainingPayoff,
    isFinalPhaseShortfall,
    actualPrincipal,
    actualInterest,
    formatCurrency
}: PaymentInputsProps) {
    const variance = actualTotal - expectedTotal;

    return (
        <>
            {/* Flexible Payment Mode Preset Buttons */}
            <div style={{ gridColumn: '1 / -1', marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Select Payment Mode / Structure:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={() => applyPaymentPreset('both', expectedPrincipal, expectedInterest)}
                        style={{
                            padding: '10px 6px',
                            borderRadius: '8px',
                            border: paymentMode === 'both' ? '2px solid var(--accent-primary)' : '1px solid var(--border-secondary)',
                            background: paymentMode === 'both' ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                            color: paymentMode === 'both' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontWeight: paymentMode === 'both' ? 700 : 500,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <Banknote size={16} />
                        <span>Full Both</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => applyPaymentPreset('interest_only', expectedPrincipal, expectedInterest)}
                        style={{
                            padding: '10px 6px',
                            borderRadius: '8px',
                            border: paymentMode === 'interest_only' ? '2px solid #f59e0b' : '1px solid var(--border-secondary)',
                            background: paymentMode === 'interest_only' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-tertiary)',
                            color: paymentMode === 'interest_only' ? '#d97706' : 'var(--text-secondary)',
                            fontWeight: paymentMode === 'interest_only' ? 700 : 500,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <Percent size={16} />
                        <span>Interest Only</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => applyPaymentPreset('capital_only', expectedPrincipal, expectedInterest)}
                        style={{
                            padding: '10px 6px',
                            borderRadius: '8px',
                            border: paymentMode === 'capital_only' ? '2px solid #3b82f6' : '1px solid var(--border-secondary)',
                            background: paymentMode === 'capital_only' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                            color: paymentMode === 'capital_only' ? '#2563eb' : 'var(--text-secondary)',
                            fontWeight: paymentMode === 'capital_only' ? 700 : 500,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <User size={16} />
                        <span>Capital Only</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => applyPaymentPreset('custom', expectedPrincipal, expectedInterest)}
                        style={{
                            padding: '10px 6px',
                            borderRadius: '8px',
                            border: paymentMode === 'custom' ? '2px solid #a855f7' : '1px solid var(--border-secondary)',
                            background: paymentMode === 'custom' ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-tertiary)',
                            color: paymentMode === 'custom' ? '#9333ea' : 'var(--text-secondary)',
                            fontWeight: paymentMode === 'custom' ? 700 : 500,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <Calculator size={16} />
                        <span>Custom Amount</span>
                    </button>
                </div>
            </div>

            {/* Payment Inputs */}
            <div className={styles.formGroup}>
                <label className={styles.label}>
                    <Banknote size={16} />
                    Principal Component *
                </label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={principalAmount}
                    onChange={(e) => {
                        setPrincipalAmount(e.target.value);
                        setPaymentMode('custom');
                        setIsPartialPayment(true);
                    }}
                    placeholder="0.00"
                    className={styles.input}
                    disabled={submitting}
                    required
                />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>
                    <Percent size={16} />
                    Interest Component *
                </label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={interestAmount}
                    onChange={(e) => {
                        setInterestAmount(e.target.value);
                        setPaymentMode('custom');
                        setIsPartialPayment(true);
                    }}
                    placeholder="0.00"
                    className={styles.input}
                    disabled={submitting}
                    required
                />
            </div>

            {/* Real-Time Variance Calculation Banner */}
            <div style={{
                gridColumn: '1 / -1',
                padding: '12px 14px',
                borderRadius: '10px',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: isFinalPhaseShortfall
                    ? 'rgba(239, 68, 68, 0.15)'
                    : actualPrincipal === 0 && actualInterest > 0
                        ? 'rgba(245, 158, 11, 0.12)'
                        : actualInterest === 0 && actualPrincipal > 0
                            ? 'rgba(59, 130, 246, 0.12)'
                            : variance < -0.01
                                ? 'rgba(239, 68, 68, 0.12)'
                                : variance > 0.01
                                    ? 'rgba(16, 185, 129, 0.12)'
                                    : 'rgba(99, 102, 241, 0.1)',
                border: '1px solid ' + (
                    isFinalPhaseShortfall ? 'rgba(239, 68, 68, 0.4)' :
                        actualPrincipal === 0 && actualInterest > 0 ? 'rgba(245, 158, 11, 0.3)' :
                            actualInterest === 0 && actualPrincipal > 0 ? 'rgba(59, 130, 246, 0.3)' :
                                variance < -0.01 ? 'rgba(239, 68, 68, 0.3)' :
                                    variance > 0.01 ? 'rgba(16, 185, 129, 0.3)' :
                                        'rgba(99, 102, 241, 0.3)'
                ),
                color: isFinalPhaseShortfall ? '#ef4444' :
                    actualPrincipal === 0 && actualInterest > 0 ? '#d97706' :
                        actualInterest === 0 && actualPrincipal > 0 ? '#2563eb' :
                            variance < -0.01 ? '#ef4444' :
                                variance > 0.01 ? '#10b981' :
                                    'var(--text-primary)'
            }}>
                <Info size={18} style={{ flexShrink: 0 }} />
                <div>
                    {isFinalPhaseShortfall ? (
                        <span><strong>Final Payment Required:</strong> You must pay the full remaining balance of {formatCurrency(totalRemainingPayoff)} to close this loan.</span>
                    ) : actualPrincipal === 0 && actualInterest > 0 ? (
                        <span><strong>Interest-Only Payment:</strong> {formatCurrency(expectedPrincipal)} capital/principal deferred to remaining loan balance.</span>
                    ) : actualInterest === 0 && actualPrincipal > 0 ? (
                        <span><strong>Capital-Only Payment:</strong> {formatCurrency(expectedInterest)} interest deferred for this period.</span>
                    ) : variance < -0.01 ? (
                        <span><strong>Underpayment Shortfall:</strong> {formatCurrency(Math.abs(variance))} remaining shortfall on installment.</span>
                    ) : variance > 0.01 ? (
                        <span><strong>Overpayment:</strong> {formatCurrency(variance)} excess credited towards principal.</span>
                    ) : (
                        <span><strong>Full Scheduled Payment:</strong> Exact match for {selectedScheduleIndex !== null ? `Installment #${schedule[selectedScheduleIndex].installment_no}` : 'calculated amount due'}.</span>
                    )}
                </div>
            </div>

            <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="notes" className={styles.label}>
                    Notes (Optional)
                </label>
                <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g. Bank transfer ref, late fee notes..."
                    className={styles.input}
                    rows={2}
                    style={{ resize: 'vertical', minHeight: '60px' }}
                />
            </div>

            {/* Total Summary */}
            <div style={{
                gridColumn: '1 / -1',
                padding: '16px',
                background: 'var(--bg-tertiary)',
                borderRadius: '10px',
                textAlign: 'center',
                border: '1px solid var(--border-secondary)'
            }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Final Payment Amount</p>
                <p style={{ margin: '4px 0 0', fontSize: '1.8rem', fontWeight: 800, color: isFinalPhaseShortfall ? '#ef4444' : 'var(--accent-primary)' }}>
                    {formatCurrency(totalPayment)}
                </p>
            </div>

            {/* Repayment Plan / Schedule Section */}
            {schedule.length > 0 && (
                <div style={{
                    gridColumn: '1 / -1',
                    marginTop: '10px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-secondary)',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '12px 16px',
                        background: 'var(--bg-tertiary)',
                        borderBottom: '1px solid var(--border-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <List size={16} style={{ color: 'var(--accent-primary)' }} />
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Planned Repayment Schedule</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click or use action buttons to configure</span>
                    </div>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        <DataTable
                            columns={[
                                { key: 'installment_no', label: 'Inst.' },
                                {
                                    key: 'due_date',
                                    label: 'Due Date',
                                    render: (val: any) => (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                                            <span>{val}</span>
                                        </div>
                                    )
                                },
                                {
                                    key: 'total_amount',
                                    label: 'Amount',
                                    render: (val: any) => <div style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(val)}</div>
                                },
                                {
                                    key: 'status',
                                    label: 'Status',
                                    render: (val: any) => (
                                        <div style={{ textAlign: 'center' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                textTransform: 'uppercase',
                                                background:
                                                    val === 'paid' ? 'rgba(16, 185, 129, 0.15)' :
                                                        val === 'overdue' ? 'rgba(239, 68, 68, 0.15)' :
                                                            val === 'partial' ? 'rgba(245, 158, 11, 0.15)' :
                                                                'rgba(107, 114, 128, 0.1)',
                                                color:
                                                    val === 'paid' ? '#10b981' :
                                                        val === 'overdue' ? '#ef4444' :
                                                            val === 'partial' ? '#f59e0b' :
                                                                'var(--text-muted)'
                                            }}>
                                                {val}
                                            </span>
                                        </div>
                                    )
                                },
                                {
                                    key: 'actions',
                                    label: 'Edit / Mode',
                                    render: (_: any, row: any) => {
                                        const index = schedule.indexOf(row) !== -1
                                            ? schedule.indexOf(row)
                                            : schedule.findIndex((s: any) => (s.id && row.id && s.id === row.id) || (s.installment_no && row.installment_no && s.installment_no === row.installment_no));
                                        if (row.status === 'paid') {
                                            return <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Paid</div>;
                                        }
                                        const isSelected = selectedScheduleIndex === index;
                                        return (
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelectScheduleItem(row, index, 'both');
                                                    }}
                                                    style={{
                                                        padding: '3px 7px',
                                                        fontSize: '0.7rem',
                                                        borderRadius: '5px',
                                                        border: isSelected && paymentMode === 'both' ? '1px solid var(--accent-primary)' : '1px solid var(--border-secondary)',
                                                        background: isSelected && paymentMode === 'both' ? 'var(--accent-bg)' : 'var(--bg-secondary)',
                                                        color: isSelected && paymentMode === 'both' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                        cursor: 'pointer',
                                                        fontWeight: 600
                                                    }}
                                                    title="Pay both principal & interest"
                                                >
                                                    Full
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelectScheduleItem(row, index, 'interest_only');
                                                    }}
                                                    style={{
                                                        padding: '3px 7px',
                                                        fontSize: '0.7rem',
                                                        borderRadius: '5px',
                                                        border: isSelected && paymentMode === 'interest_only' ? '1px solid #f59e0b' : '1px solid var(--border-secondary)',
                                                        background: isSelected && paymentMode === 'interest_only' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-secondary)',
                                                        color: isSelected && paymentMode === 'interest_only' ? '#d97706' : 'var(--text-secondary)',
                                                        cursor: 'pointer',
                                                        fontWeight: 600
                                                    }}
                                                    title="Pay interest only"
                                                >
                                                    Interest
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelectScheduleItem(row, index, 'capital_only');
                                                    }}
                                                    style={{
                                                        padding: '3px 7px',
                                                        fontSize: '0.7rem',
                                                        borderRadius: '5px',
                                                        border: isSelected && paymentMode === 'capital_only' ? '1px solid #3b82f6' : '1px solid var(--border-secondary)',
                                                        background: isSelected && paymentMode === 'capital_only' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-secondary)',
                                                        color: isSelected && paymentMode === 'capital_only' ? '#2563eb' : 'var(--text-secondary)',
                                                        cursor: 'pointer',
                                                        fontWeight: 600
                                                    }}
                                                    title="Pay capital/principal only"
                                                >
                                                    Capital
                                                </button>
                                            </div>
                                        );
                                    }
                                }
                            ]}
                            data={schedule}
                            onRowClick={(row: any, index: number) => handleSelectScheduleItem(row, index, 'both')}
                            selectedRowIndex={selectedScheduleIndex}
                            emptyMessage="No schedule available"
                        />
                    </div>
                </div>
            )}
        </>
    );
}
