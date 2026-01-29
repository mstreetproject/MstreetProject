'use client';

import React from 'react';
import { X } from 'lucide-react';
import { DateRange } from '@/hooks/dashboard/useCreditorStats';
import styles from './DateRangeFilter.module.css';

interface DateRangeFilterProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
}

export default function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value ? new Date(e.target.value) : null;
        onChange({ ...value, startDate: newDate });
    };

    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value ? new Date(e.target.value) : null;
        onChange({ ...value, endDate: newDate });
    };

    const handleClear = () => {
        onChange({ startDate: null, endDate: null });
    };

    const formatDateForInput = (date: Date | null): string => {
        if (!date) return '';
        return date.toISOString().split('T')[0];
    };

    const hasValue = value.startDate || value.endDate;

    return (
        <div className={styles.container}>
            <div className={styles.inputGroup}>
                <input
                    type="date"
                    className={styles.dateInput}
                    value={formatDateForInput(value.startDate)}
                    onChange={handleStartDateChange}
                    placeholder="Start date"
                />
                <span className={styles.separator}>to</span>
                <input
                    type="date"
                    className={styles.dateInput}
                    value={formatDateForInput(value.endDate)}
                    onChange={handleEndDateChange}
                    placeholder="End date"
                />
            </div>
            {hasValue && (
                <button
                    className={styles.clearBtn}
                    onClick={handleClear}
                    title="Clear dates"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
}
