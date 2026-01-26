'use client';

import { useState, useEffect } from 'react';

/**
 * A hook that ensures a loading state persists for at least a minimum duration.
 * This prevents "flickering" and ensures branded animations are seen.
 * 
 * @param isLoading The actual loading state from a hook or prop
 * @param minDuration Minimum time in ms to show the loader (default: 1000ms)
 * @returns boolean The effective loading state
 */
export function useDelayedLoading(isLoading: boolean, minDuration: number = 1000): boolean {
    const [shouldShow, setShouldShow] = useState(isLoading);
    const [startTime, setStartTime] = useState<number | null>(null);

    useEffect(() => {
        if (isLoading) {
            setShouldShow(true);
            setStartTime(Date.now());
        } else if (startTime) {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, minDuration - elapsed);

            const timer = setTimeout(() => {
                setShouldShow(false);
                setStartTime(null);
            }, remaining);

            return () => clearTimeout(timer);
        }
    }, [isLoading, minDuration, startTime]);

    return shouldShow;
}
