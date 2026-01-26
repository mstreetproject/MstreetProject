'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Coins } from 'lucide-react';
import { MyInvestment } from '@/hooks/dashboard/useMyInvestments';
import { useCurrency } from '@/hooks/useCurrency';
import styles from './TimePeriodFilter.module.css'; // Reusing styles

interface InvestmentFilterProps {
    investments: MyInvestment[];
    selectedId: string | null;
    onChange: (id: string | null) => void;
}

export default function InvestmentFilter({ investments, selectedId, onChange }: InvestmentFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { formatCurrency } = useCurrency();

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (id: string | null) => {
        onChange(id);
        setIsOpen(false);
    };

    const selectedInvestment = investments.find(i => i.id === selectedId);
    const label = selectedInvestment
        ? `${formatCurrency(selectedInvestment.principal)} (${new Date(selectedInvestment.start_date).toLocaleDateString()})`
        : 'All Investments';

    return (
        <div className={styles.container} ref={containerRef}>
            <button
                className={styles.selector}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                style={{ minWidth: '200px', justifyContent: 'space-between' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Coins size={16} />
                    <span className={styles.label} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                        {label}
                    </span>
                </div>
                <ChevronDown
                    size={16}
                    className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                />
            </button>

            {isOpen && (
                <div className={styles.dropdown} role="listbox" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <button
                        className={`${styles.option} ${selectedId === null ? styles.optionActive : ''}`}
                        onClick={() => handleSelect(null)}
                        role="option"
                        aria-selected={selectedId === null}
                    >
                        All Investments
                        {selectedId === null && <Check size={16} className={styles.checkmark} />}
                    </button>

                    {investments.map((inv) => (
                        <button
                            key={inv.id}
                            className={`${styles.option} ${selectedId === inv.id ? styles.optionActive : ''}`}
                            onClick={() => handleSelect(inv.id)}
                            role="option"
                            aria-selected={selectedId === inv.id}
                        >
                            {formatCurrency(inv.principal)} - {new Date(inv.start_date).toLocaleDateString()}
                            {selectedId === inv.id && <Check size={16} className={styles.checkmark} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
