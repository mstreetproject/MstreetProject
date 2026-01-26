'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

// Available currencies
export const CURRENCIES = {
    USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
    NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', locale: 'en-NG' },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
    GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;
export type Currency = typeof CURRENCIES[CurrencyCode];

const STORAGE_KEY = 'mstreet_currency';
const DEFAULT_CURRENCY: CurrencyCode = 'USD';

interface CurrencyContextValue {
    currency: Currency;
    currencyCode: CurrencyCode;
    setCurrency: (code: CurrencyCode) => void;
    formatCurrency: (amount: number) => string;
    formatCompact: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

// Get initial currency from localStorage (client-side only)
function getInitialCurrency(): CurrencyCode {
    if (typeof window === 'undefined') return DEFAULT_CURRENCY;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && stored in CURRENCIES) {
            return stored as CurrencyCode;
        }
    } catch {
        // localStorage not available
    }
    return DEFAULT_CURRENCY;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(DEFAULT_CURRENCY);
    const [mounted, setMounted] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        setCurrencyCode(getInitialCurrency());
        setMounted(true);
    }, []);

    // Persist to localStorage when currency changes
    useEffect(() => {
        if (mounted && typeof window !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, currencyCode);
            } catch {
                // localStorage not available
            }
        }
    }, [currencyCode, mounted]);

    const currency = CURRENCIES[currencyCode];

    const setCurrency = useCallback((code: CurrencyCode) => {
        if (code in CURRENCIES) {
            setCurrencyCode(code);
        }
    }, []);

    const formatCurrency = useCallback((amount: number): string => {
        return new Intl.NumberFormat(currency.locale, {
            style: 'currency',
            currency: currency.code,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    }, [currency]);

    const formatCompact = useCallback((amount: number): string => {
        return new Intl.NumberFormat(currency.locale, {
            style: 'currency',
            currency: currency.code,
            notation: 'compact',
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
        }).format(amount);
    }, [currency]);

    const value: CurrencyContextValue = {
        currency,
        currencyCode,
        setCurrency,
        formatCurrency,
        formatCompact,
    };

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency(): CurrencyContextValue {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
}

// Get all available currencies as an array
export function getAvailableCurrencies(): Currency[] {
    return Object.values(CURRENCIES);
}
