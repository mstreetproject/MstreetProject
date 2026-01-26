'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DebtorInfo } from '@/hooks/dashboard/useDebtorStats';
import { ChevronDown, Check, User, X } from 'lucide-react';
import styles from './CreditorFilter.module.css';

interface DebtorFilterProps {
    debtors: DebtorInfo[];
    value: string | null;
    onChange: (debtorId: string | null) => void;
}

export default function DebtorFilter({ debtors, value, onChange }: DebtorFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    // Filter debtors by search term
    const filteredDebtors = useMemo(() => {
        if (!searchTerm) return debtors;
        const term = searchTerm.toLowerCase();
        return debtors.filter(
            d => d.full_name.toLowerCase().includes(term) || d.email.toLowerCase().includes(term)
        );
    }, [debtors, searchTerm]);

    const handleSelect = (debtorId: string | null) => {
        onChange(debtorId);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
    };

    const selectedDebtor = value ? debtors.find(d => d.id === value) : null;

    return (
        <div className={styles.container} ref={containerRef}>
            <button
                className={`${styles.selector} ${value ? styles.selectorActive : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <User size={16} className={styles.icon} />
                <span className={`${styles.label} ${!value ? styles.placeholder : ''}`}>
                    {selectedDebtor ? selectedDebtor.full_name : 'All Debtors'}
                </span>
                {value && (
                    <button className={styles.clearBtn} onClick={handleClear} title="Clear">
                        <X size={14} />
                    </button>
                )}
                <ChevronDown
                    size={16}
                    className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                />
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.searchContainer}>
                        <input
                            ref={searchInputRef}
                            type="text"
                            className={styles.searchInput}
                            placeholder="Search debtors..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className={styles.optionsList}>
                        {/* All Debtors option */}
                        <button
                            className={`${styles.option} ${styles.allOption} ${!value ? styles.optionActive : ''}`}
                            onClick={() => handleSelect(null)}
                        >
                            <div className={styles.optionContent}>
                                <div className={styles.optionName}>All Debtors</div>
                                <div className={styles.optionEmail}>Show all debtor data</div>
                            </div>
                            {!value && <Check size={16} className={styles.checkmark} />}
                        </button>

                        {filteredDebtors.length === 0 ? (
                            <div className={styles.noResults}>No debtors found</div>
                        ) : (
                            filteredDebtors.map((debtor) => (
                                <button
                                    key={debtor.id}
                                    className={`${styles.option} ${value === debtor.id ? styles.optionActive : ''}`}
                                    onClick={() => handleSelect(debtor.id)}
                                >
                                    <div className={styles.optionContent}>
                                        <div className={styles.optionName}>{debtor.full_name}</div>
                                        <div className={styles.optionEmail}>{debtor.email}</div>
                                    </div>
                                    {value === debtor.id && (
                                        <Check size={16} className={styles.checkmark} />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
