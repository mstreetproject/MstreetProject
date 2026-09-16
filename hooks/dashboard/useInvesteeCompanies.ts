'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface InvesteeCompany {
    id: string;
    name: string;
    industry: string | null;
    contact_person: string | null;
    email: string | null;
    phone: string | null;
    created_at: string;
}

export function useInvesteeCompanies() {
    const [companies, setCompanies] = useState<InvesteeCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCompanies = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();
            const { data, error } = await supabase
                .from('investee_companies')
                .select('*')
                .order('name');

            if (error) throw error;
            setCompanies(data || []);
        } catch (err: any) {
            console.error('Error fetching investee companies:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);

    return { companies, loading, error, refresh: fetchCompanies };
}
