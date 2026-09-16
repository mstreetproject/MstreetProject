'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCurrency, getAvailableCurrencies, CurrencyCode } from '@/hooks/useCurrency';
import { ChevronDown, Check } from 'lucide-react';
import styles from './CurrencySelector.module.css';

export default function CurrencySelector() {
    const { currency, currencyCode, setCurrency } = useCurrency();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const currencies = getAvailableCurrencies();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (code: CurrencyCode) => {
        setCurrency(code);
        setIsOpen(false);
    };

    return (
        <div className={styles.container} ref={containerRef}>
            <button
                className={styles.selector}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <span className={styles.symbol}>{currency.symbol}</span>
                <span className={styles.code}>{currency.code}</span>
                <ChevronDown
                    size={16}
                    className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                />
            </button>

            {isOpen && (
                <div className={styles.dropdown} role="listbox">
                    {currencies.map((curr) => (
                        <button
                            key={curr.code}
                            className={`${styles.option} ${currencyCode === curr.code ? styles.optionActive : ''}`}
                            onClick={() => handleSelect(curr.code as CurrencyCode)}
                            role="option"
                            aria-selected={currencyCode === curr.code}
                        >
                            <span className={styles.optionSymbol}>{curr.symbol}</span>
                            <div className={styles.optionContent}>
                                <div className={styles.optionCode}>{curr.code}</div>
                                <div className={styles.optionName}>{curr.name}</div>
                            </div>
                            {currencyCode === curr.code && (
                                <Check size={16} className={styles.checkmark} />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
