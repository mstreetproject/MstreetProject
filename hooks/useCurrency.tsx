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
const RATES_STORAGE_KEY = 'mstreet_currency_rates_v1';
const DEFAULT_CURRENCY: CurrencyCode = 'NGN';

export const DEFAULT_RATES: Record<CurrencyCode, number> = {
    USD: 1,
    NGN: 1550,
    EUR: 0.92,
    GBP: 0.79,
};

export interface FormatCurrencyOptions {
    fromCurrency?: CurrencyCode;
    bypassConversion?: boolean;
}

interface CurrencyContextValue {
    currency: Currency;
    currencyCode: CurrencyCode;
    rates: Record<CurrencyCode, number>;
    isLoadingRates: boolean;
    rateSource: 'live' | 'fallback';
    lastUpdated: string | null;
    setCurrency: (code: CurrencyCode) => void;
    convertAmount: (amount: number, fromCurrency?: CurrencyCode, toCurrency?: CurrencyCode) => number;
    formatCurrency: (amount: number, options?: FormatCurrencyOptions) => string;
    formatCompact: (amount: number, options?: FormatCurrencyOptions) => string;
    refreshRates: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

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

function getInitialRates(): Record<CurrencyCode, number> {
    if (typeof window === 'undefined') return DEFAULT_RATES;

    try {
        const stored = localStorage.getItem(RATES_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.rates) {
                return { ...DEFAULT_RATES, ...parsed.rates };
            }
        }
    } catch {
        // localStorage error
    }
    return DEFAULT_RATES;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(DEFAULT_CURRENCY);
    const [rates, setRates] = useState<Record<CurrencyCode, number>>(DEFAULT_RATES);
    const [isLoadingRates, setIsLoadingRates] = useState<boolean>(true);
    const [rateSource, setRateSource] = useState<'live' | 'fallback'>('fallback');
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    // Load initial settings from localStorage on mount
    useEffect(() => {
        setCurrencyCode(getInitialCurrency());
        setRates(getInitialRates());
        setMounted(true);
    }, []);

    // Fetch live rates function
    const refreshRates = useCallback(async () => {
        setIsLoadingRates(true);
        try {
            const res = await fetch('/api/currency/rates');
            const data = await res.json();

            if (data && data.rates) {
                const newRates: Record<CurrencyCode, number> = {
                    USD: 1,
                    NGN: Number(data.rates.NGN) || DEFAULT_RATES.NGN,
                    EUR: Number(data.rates.EUR) || DEFAULT_RATES.EUR,
                    GBP: Number(data.rates.GBP) || DEFAULT_RATES.GBP,
                };

                setRates(newRates);
                setRateSource(data.source === 'live' ? 'live' : 'fallback');
                setLastUpdated(data.time_last_update_utc || new Date().toISOString());

                if (typeof window !== 'undefined') {
                    try {
                        localStorage.setItem(
                            RATES_STORAGE_KEY,
                            JSON.stringify({
                                rates: newRates,
                                source: data.source,
                                time_last_update_utc: data.time_last_update_utc,
                            })
                        );
                    } catch {
                        // ignore storage errors
                    }
                }
            }
        } catch (err) {
            console.warn('[useCurrency] Error fetching live exchange rates:', err);
            setRateSource('fallback');
        } finally {
            setIsLoadingRates(false);
        }
    }, []);

    // Fetch live rates on mount
    useEffect(() => {
        refreshRates();
    }, [refreshRates]);

    // Persist active currency code to localStorage
    useEffect(() => {
        if (mounted && typeof window !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, currencyCode);
            } catch {
                // ignore
            }
        }
    }, [currencyCode, mounted]);

    const currency = CURRENCIES[currencyCode];

    const setCurrency = useCallback((code: CurrencyCode) => {
        if (code in CURRENCIES) {
            setCurrencyCode(code);
        }
    }, []);

    // Real-time conversion helper
    const convertAmount = useCallback(
        (
            amount: number,
            fromCurrency: CurrencyCode = 'NGN',
            toCurrency: CurrencyCode = currencyCode
        ): number => {
            if (amount === undefined || amount === null || isNaN(amount)) return 0;
            const fromRate = rates[fromCurrency] || 1;
            const toRate = rates[toCurrency] || 1;

            // Convert to base (USD) first, then to target currency
            const amountInBase = amount / fromRate;
            return amountInBase * toRate;
        },
        [currencyCode, rates]
    );

    const formatCurrency = useCallback(
        (amount: number, options?: FormatCurrencyOptions): string => {
            if (amount === undefined || amount === null || isNaN(amount)) amount = 0;

            let targetAmount = amount;
            if (!options?.bypassConversion) {
                const fromCurrency = options?.fromCurrency || 'NGN';
                targetAmount = convertAmount(amount, fromCurrency, currencyCode);
            }

            const isNegative = targetAmount < 0;
            const absVal = Math.abs(targetAmount);
            const formattedNum = new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(absVal);

            return `${isNegative ? '-' : ''}${currency.symbol}${formattedNum}`;
        },
        [currency, currencyCode, convertAmount]
    );

    const formatCompact = useCallback(
        (amount: number, options?: FormatCurrencyOptions): string => {
            if (amount === undefined || amount === null || isNaN(amount)) amount = 0;

            let targetAmount = amount;
            if (!options?.bypassConversion) {
                const fromCurrency = options?.fromCurrency || 'NGN';
                targetAmount = convertAmount(amount, fromCurrency, currencyCode);
            }

            const isNegative = targetAmount < 0;
            const absVal = Math.abs(targetAmount);

            if (absVal < 1000) {
                const formattedNum = new Intl.NumberFormat('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }).format(absVal);
                return `${isNegative ? '-' : ''}${currency.symbol}${formattedNum}`;
            }

            const suffixes = [
                { value: 1e12, symbol: 'T' },
                { value: 1e9, symbol: 'B' },
                { value: 1e6, symbol: 'M' },
                { value: 1e3, symbol: 'K' },
            ];

            for (const { value, symbol: suffix } of suffixes) {
                if (absVal >= value) {
                    const rawRatio = absVal / value;
                    const formatted = rawRatio >= 100 ? rawRatio.toFixed(1) : rawRatio.toFixed(2);
                    const cleaned = formatted.replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1');
                    return `${isNegative ? '-' : ''}${currency.symbol}${cleaned}${suffix}`;
                }
            }

            return `${isNegative ? '-' : ''}${currency.symbol}${absVal.toFixed(2)}`;
        },
        [currency, currencyCode, convertAmount]
    );

    const value: CurrencyContextValue = {
        currency,
        currencyCode,
        rates,
        isLoadingRates,
        rateSource,
        lastUpdated,
        setCurrency,
        convertAmount,
        formatCurrency,
        formatCompact,
        refreshRates,
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

export function getAvailableCurrencies(): Currency[] {
    return Object.values(CURRENCIES);
}
