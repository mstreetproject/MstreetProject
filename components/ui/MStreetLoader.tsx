'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from './MStreetLoader.module.css';

interface MStreetLoaderProps {
    size?: number;
    color?: string;
    text?: string;
}

export default function MStreetLoader({
    size = 100,
    color = 'var(--accent-primary)',
    text = 'MSTREETS FINANCE • MSTREETS FINANCE • '
}: MStreetLoaderProps) {
    const center = size / 2;
    const radius = size * 0.35;
    const innerSize = size * 0.3;

    return (
        <div className={styles.container} style={{ width: size, height: size }}>
            {/* Shimmering Rings - Enterprise Level */}
            <div className={styles.shimmerRing} style={{ width: size * 0.8, height: size * 0.8 }} />
            <div className={styles.shimmerRing} style={{ width: size * 0.8, height: size * 0.8, animationDelay: '1s' }} />

            {/* Rotating Text Circle */}
            <svg className={styles.textCircle} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                    <path
                        id="textPath"
                        d={`M ${center - radius}, ${center}
                            a ${radius},${radius} 0 1,1 ${radius * 2},0
                            a ${radius},${radius} 0 1,1 -${radius * 2},0`}
                    />
                </defs>
                <text className={styles.text}>
                    <textPath href="#textPath" startOffset="0%">
                        {text}
                    </textPath>
                </text>
            </svg>

            {/* Central Spinner / Logo placeholder */}
            <div className={styles.spinner} style={{ width: innerSize, height: innerSize }}>
                <Loader2
                    style={{ width: '100%', height: '100%', color }}
                />
            </div>
        </div>
    );
}
