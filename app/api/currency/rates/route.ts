import { NextResponse } from 'next/server';

const FALLBACK_RATES: Record<string, number> = {
    USD: 1,
    NGN: 1550,
    EUR: 0.92,
    GBP: 0.79,
};

export async function GET() {
    try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD', {
            next: { revalidate: 1800 }, // Cache for 30 minutes
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Exchange rate API returned HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data && data.result === 'success' && data.rates) {
            return NextResponse.json({
                success: true,
                base: 'USD',
                rates: {
                    USD: 1,
                    NGN: data.rates.NGN || FALLBACK_RATES.NGN,
                    EUR: data.rates.EUR || FALLBACK_RATES.EUR,
                    GBP: data.rates.GBP || FALLBACK_RATES.GBP,
                },
                time_last_update_utc: data.time_last_update_utc || new Date().toUTCString(),
                source: 'live',
            });
        }

        throw new Error('Invalid rate payload structure');
    } catch (error) {
        console.warn('[Currency Rates API] Failed to fetch live exchange rates, using fallback rates:', error);

        return NextResponse.json({
            success: false,
            base: 'USD',
            rates: FALLBACK_RATES,
            time_last_update_utc: new Date().toUTCString(),
            source: 'fallback',
        });
    }
}
