'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={styles.toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            <div className={styles.iconWrapper}>
                <Sun className={`${styles.icon} ${styles.sunIcon} ${theme === 'light' ? styles.active : ''}`} />
                <Moon className={`${styles.icon} ${styles.moonIcon} ${theme === 'dark' ? styles.active : ''}`} />
            </div>
        </button>
    );
}
