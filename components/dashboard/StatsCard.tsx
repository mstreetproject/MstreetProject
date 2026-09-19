'use client';

import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import styles from './StatsCard.module.css';

interface StatsCardProps {
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon?: React.ComponentType<{ className?: string }>;
    loading?: boolean;
    tooltip?: string;  // Tooltip explanation
    numericValue?: number;
    numericChange?: number;
    isCurrencyValue?: boolean;
    isCurrencyChange?: boolean;
    onClick?: () => void;
}

// Currency symbol identifiers
const CURRENCY_IDENTIFIERS = ['$', '₦', '€', '£', 'NGN', 'USD', 'EUR', 'GBP'];

export default function StatsCard({
    title,
    value,
    change,
    changeType = 'neutral',
    icon: Icon,
    loading = false,
    tooltip,
    numericValue,
    numericChange,
    isCurrencyValue,
    isCurrencyChange,
    onClick,
}: StatsCardProps) {
    const { formatCurrency, formatCompact } = useCurrency();
    const [isExpanded, setIsExpanded] = useState(false);

    const handleCardClick = (e: React.MouseEvent) => {
        // Don't toggle if clicking on info icon tooltip
        if ((e.target as HTMLElement).closest(`.${styles.tooltipWrapper}`)) {
            return;
        }
        setIsExpanded(prev => !prev);
        if (onClick) onClick();
    };

    /**
     * Helper to render compact or full format for a value
     */
    const getFormattedDisplay = (
        rawValue: string | number,
        explicitNum?: number,
        explicitIsCurrency?: boolean
    ): { display: string; isMonetary: boolean } => {
        // 1. Explicit numeric value passed
        if (explicitNum !== undefined) {
            return {
                display: isExpanded ? formatCurrency(explicitNum) : formatCompact(explicitNum),
                isMonetary: true,
            };
        }

        // 2. Explicit currency flag with numeric rawValue
        if (explicitIsCurrency && typeof rawValue === 'number') {
            return {
                display: isExpanded ? formatCurrency(rawValue) : formatCompact(rawValue),
                isMonetary: true,
            };
        }

        // 3. String auto-detection: check if rawValue is a formatted currency string
        if (typeof rawValue === 'string') {
            const trimmed = rawValue.trim();
            const isCurrencyString = CURRENCY_IDENTIFIERS.some(sym => trimmed.startsWith(sym));

            if (isCurrencyString) {
                const numericString = trimmed.replace(/[^0-9.-]/g, '');
                const parsedNum = parseFloat(numericString);

                if (!isNaN(parsedNum)) {
                    return {
                        display: isExpanded
                            ? formatCurrency(parsedNum, { bypassConversion: true })
                            : formatCompact(parsedNum, { bypassConversion: true }),
                        isMonetary: true,
                    };
                }
            }
        }

        // 4. Raw numeric value passed directly as rawValue
        if (typeof rawValue === 'number') {
            return {
                display: isExpanded ? formatCurrency(rawValue) : formatCompact(rawValue),
                isMonetary: true,
            };
        }

        // 5. Fallback to raw value as string
        return { display: String(rawValue), isMonetary: false };
    };

    const valueFormatted = getFormattedDisplay(value, numericValue, isCurrencyValue);
    const changeFormatted = change ? getFormattedDisplay(change, numericChange, isCurrencyChange) : null;

    const hasMonetaryData = valueFormatted.isMonetary || (changeFormatted && changeFormatted.isMonetary);

    return (
        <div
            className={`${styles.card} ${hasMonetaryData ? styles.clickableCard : ''} ${isExpanded ? styles.expandedCard : ''}`}
            onClick={handleCardClick}
            title={hasMonetaryData ? (isExpanded ? "Click to collapse to compact amount" : "Click to view full amount") : undefined}
        >
            <div className={styles.header}>
                <div className={styles.titleRow}>
                    <h3 className={styles.title}>{title}</h3>
                    {tooltip && (
                        <div className={styles.tooltipWrapper}>
                            <Info size={14} className={styles.infoIcon} />
                            <div className={styles.tooltip}>{tooltip}</div>
                        </div>
                    )}
                </div>
                {Icon && <Icon className={styles.icon} />}
            </div>

            {loading ? (
                <div className={styles.skeleton}>
                    <div className={styles.skeletonValue}></div>
                    <div className={styles.skeletonChange}></div>
                </div>
            ) : (
                <>
                    <p className={styles.value}>
                        {valueFormatted.display}
                    </p>
                    {change && (
                        <p className={`${styles.change} ${styles[changeType]}`}>
                            {changeFormatted ? changeFormatted.display : change}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
