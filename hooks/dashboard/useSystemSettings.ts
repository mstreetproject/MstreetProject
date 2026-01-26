'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface LoanLimits {
    min: number;
    max: number;
}

interface GuarantorTier {
    min: number;
    max: number;
    required: number;
}

interface InterestRate {
    default: number;
    min: number;
    max: number;
}

interface SystemSettings {
    loan_limits: LoanLimits;
    guarantor_enabled: boolean;
    guarantor_tiers: GuarantorTier[];
    interest_rate: InterestRate;
    tenure_options: number[];
}

const DEFAULT_SETTINGS: SystemSettings = {
    loan_limits: { min: 0, max: 5000000 },
    guarantor_enabled: true,
    guarantor_tiers: [
        { min: 0, max: 500000, required: 1 },
        { min: 500001, max: 2000000, required: 2 },
        { min: 2000001, max: 999999999, required: 3 },
    ],
    interest_rate: { default: 5, min: 2, max: 15 },
    tenure_options: [3, 6, 12, 18, 24, 36],
};

export function useSystemSettings() {
    const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchSettings = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            const { data, error: fetchError } = await supabase
                .from('system_settings')
                .select('setting_key, setting_value');

            if (fetchError) throw fetchError;

            if (data && data.length > 0) {
                const parsed: any = {};
                data.forEach((row) => {
                    let value = row.setting_value;
                    // Handle string values that need parsing
                    if (typeof value === 'string') {
                        if (value === 'true') value = true;
                        else if (value === 'false') value = false;
                        else {
                            try { value = JSON.parse(value); } catch { }
                        }
                    }
                    parsed[row.setting_key] = value;
                });

                setSettings({
                    loan_limits: parsed.loan_limits || DEFAULT_SETTINGS.loan_limits,
                    guarantor_enabled: parsed.guarantor_enabled ?? DEFAULT_SETTINGS.guarantor_enabled,
                    guarantor_tiers: parsed.guarantor_tiers || DEFAULT_SETTINGS.guarantor_tiers,
                    interest_rate: parsed.interest_rate || DEFAULT_SETTINGS.interest_rate,
                    tenure_options: parsed.tenure_options || DEFAULT_SETTINGS.tenure_options,
                });
            }
        } catch (err) {
            console.error('[useSystemSettings] Error:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch settings'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // Update a single setting
    const updateSetting = useCallback(async (key: string, value: any) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error: updateError } = await supabase
            .from('system_settings')
            .update({
                setting_value: value,
                updated_by: user.id,
            })
            .eq('setting_key', key);

        if (updateError) throw updateError;
        await fetchSettings();
    }, [fetchSettings]);

    // Helper: Get required guarantors for an amount
    const getRequiredGuarantors = useCallback((amount: number): number => {
        if (!settings.guarantor_enabled) return 0;

        for (const tier of settings.guarantor_tiers) {
            if (amount >= tier.min && amount <= tier.max) {
                return tier.required;
            }
        }
        return settings.guarantor_tiers[settings.guarantor_tiers.length - 1]?.required || 0;
    }, [settings]);

    // Helper: Validate loan amount
    const validateAmount = useCallback((amount: number): { valid: boolean; message?: string } => {
        if (amount < settings.loan_limits.min) {
            return { valid: false, message: `Minimum loan amount is ${settings.loan_limits.min}` };
        }
        if (amount > settings.loan_limits.max) {
            return { valid: false, message: `Maximum loan amount is ${settings.loan_limits.max}` };
        }
        return { valid: true };
    }, [settings]);

    return {
        settings,
        loading,
        error,
        updateSetting,
        getRequiredGuarantors,
        validateAmount,
        refetch: fetchSettings,
    };
}

export type { SystemSettings, LoanLimits, GuarantorTier, InterestRate };
