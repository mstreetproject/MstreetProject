'use client';

import React from 'react';
import styles from './StatsCard.module.css';

interface StatsCardProps {
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon?: React.ComponentType<{ className?: string }>;
    loading?: boolean;
}

export default function StatsCard({
    title,
    value,
    change,
    changeType = 'neutral',
    icon: Icon,
    loading = false,
}: StatsCardProps) {
    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h3 className={styles.title}>{title}</h3>
                {Icon && <Icon className={styles.icon} />}
            </div>

            {loading ? (
                <div className={styles.skeleton}>
                    <div className={styles.skeletonValue}></div>
                    <div className={styles.skeletonChange}></div>
                </div>
            ) : (
                <>
                    <p className={styles.value}>{value}</p>
                    {change && (
                        <p className={`${styles.change} ${styles[changeType]}`}>
                            {change}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
