'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCurrency, getAvailableCurrencies, CurrencyCode } from '@/hooks/useCurrency';
import { ChevronDown, Check, RefreshCw, Radio } from 'lucide-react';
import styles from './CurrencySelector.module.css';

export default function CurrencySelector() {
    const {
        currency,
        currencyCode,
        rates,
        rateSource,
        isLoadingRates,
        setCurrency,
        refreshRates
    } = useCurrency();
    const [isOpen, setIsOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
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

    const handleManualRefresh = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsRefreshing(true);
        await refreshRates();
        setTimeout(() => setIsRefreshing(false), 600);
    };

    // Calculate rate display relative to NGN base currency
    const ngnRate = rates['NGN'] || 1550;
    const rateDisplay = currencyCode === 'NGN'
        ? 'Base: NGN (₦)'
        : currencyCode === 'USD'
            ? `1 USD = ₦${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(ngnRate)}`
            : `1 ${currencyCode} = ₦${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(ngnRate / (rates[currencyCode] || 1))}`;

    return (
        <div className={styles.container} ref={containerRef}>
            <button
                className={styles.selector}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                title={`Active Currency: ${currency.name} (${rateDisplay})`}
            >
                <span className={styles.liveIndicator} title={rateSource === 'live' ? 'Live Exchange Rates' : 'Fallback Rates'}>
                    <Radio size={12} className={rateSource === 'live' ? styles.liveIcon : styles.fallbackIcon} />
                </span>
                <span className={styles.symbol}>{currency.symbol}</span>
                <span className={styles.code}>{currency.code}</span>
                <ChevronDown
                    size={16}
                    className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                />
            </button>

            {isOpen && (
                <div className={styles.dropdown} role="listbox">
                    <div className={styles.dropdownHeader}>
                        <span>Select Currency</span>
                        <button
                            className={styles.refreshBtn}
                            onClick={handleManualRefresh}
                            disabled={isRefreshing || isLoadingRates}
                            title="Refresh exchange rates"
                        >
                            <RefreshCw size={12} className={isRefreshing || isLoadingRates ? styles.spin : ''} />
                        </button>
                    </div>

                    <div className={styles.optionsList}>
                        {currencies.map((curr) => {
                            const rate = rates[curr.code as CurrencyCode];
                            return (
                                <button
                                    key={curr.code}
                                    className={`${styles.option} ${currencyCode === curr.code ? styles.optionActive : ''}`}
                                    onClick={() => handleSelect(curr.code as CurrencyCode)}
                                    role="option"
                                    aria-selected={currencyCode === curr.code}
                                >
                                    <span className={styles.optionSymbol}>{curr.symbol}</span>
                                    <div className={styles.optionContent}>
                                        <div className={styles.optionCodeRow}>
                                            <span className={styles.optionCode}>{curr.code}</span>
                                            {rate && curr.code !== 'NGN' && (
                                                <span className={styles.rateBadge}>
                                                    1 {curr.code} = ₦{new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(ngnRate / rate)}
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.optionName}>{curr.name}</div>
                                    </div>
                                    {currencyCode === curr.code && (
                                        <Check size={16} className={styles.checkmark} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className={styles.dropdownFooter}>
                        <div className={styles.footerRate}>
                            <span className={styles.footerDot} style={{ background: rateSource === 'live' ? '#10B981' : '#F59E0B' }} />
                            <span>{rateDisplay}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
