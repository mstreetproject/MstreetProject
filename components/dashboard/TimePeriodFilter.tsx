'use client';

import React, { useState, useRef, useEffect } from 'react';
import { getTimePeriodOptions, TimePeriod, TIME_PERIODS } from '@/hooks/dashboard/useCreditorStats';
import { ChevronDown, Check, Calendar } from 'lucide-react';
import styles from './TimePeriodFilter.module.css';

interface TimePeriodFilterProps {
    value: TimePeriod;
    onChange: (period: TimePeriod) => void;
}

export default function TimePeriodFilter({ value, onChange }: TimePeriodFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const options = getTimePeriodOptions();

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

    const handleSelect = (period: TimePeriod) => {
        onChange(period);
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
                <Calendar size={16} />
                <span className={styles.label}>{TIME_PERIODS[value].label}</span>
                <ChevronDown
                    size={16}
                    className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                />
            </button>

            {isOpen && (
                <div className={styles.dropdown} role="listbox">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            className={`${styles.option} ${value === option.value ? styles.optionActive : ''}`}
                            onClick={() => handleSelect(option.value)}
                            role="option"
                            aria-selected={value === option.value}
                        >
                            {option.label}
                            {value === option.value && (
                                <Check size={16} className={styles.checkmark} />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
