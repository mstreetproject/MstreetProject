'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CreditorInfo } from '@/hooks/dashboard/useCreditorStats';
import { ChevronDown, Check, User, X } from 'lucide-react';
import styles from './CreditorFilter.module.css';

interface CreditorFilterProps {
    creditors: CreditorInfo[];
    value: string | null;
    onChange: (creditorId: string | null) => void;
}

export default function CreditorFilter({ creditors, value, onChange }: CreditorFilterProps) {
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

    // Filter creditors by search term
    const filteredCreditors = useMemo(() => {
        if (!searchTerm) return creditors;
        const term = searchTerm.toLowerCase();
        return creditors.filter(
            c => c.full_name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term)
        );
    }, [creditors, searchTerm]);

    const handleSelect = (creditorId: string | null) => {
        onChange(creditorId);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
    };

    const selectedCreditor = value ? creditors.find(c => c.id === value) : null;

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
                    {selectedCreditor ? selectedCreditor.full_name : 'All Creditors'}
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
                            placeholder="Search creditors..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className={styles.optionsList}>
                        {/* All Creditors option */}
                        <button
                            className={`${styles.option} ${styles.allOption} ${!value ? styles.optionActive : ''}`}
                            onClick={() => handleSelect(null)}
                        >
                            <div className={styles.optionContent}>
                                <div className={styles.optionName}>All Creditors</div>
                                <div className={styles.optionEmail}>Show all creditor data</div>
                            </div>
                            {!value && <Check size={16} className={styles.checkmark} />}
                        </button>

                        {filteredCreditors.length === 0 ? (
                            <div className={styles.noResults}>No creditors found</div>
                        ) : (
                            filteredCreditors.map((creditor) => (
                                <button
                                    key={creditor.id}
                                    className={`${styles.option} ${value === creditor.id ? styles.optionActive : ''}`}
                                    onClick={() => handleSelect(creditor.id)}
                                >
                                    <div className={styles.optionContent}>
                                        <div className={styles.optionName}>{creditor.full_name}</div>
                                        <div className={styles.optionEmail}>{creditor.email}</div>
                                    </div>
                                    {value === creditor.id && (
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
