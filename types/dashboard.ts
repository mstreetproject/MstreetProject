// Type definitions for dashboard data structures

export interface Role {
    id: number;
    name: string;
    description: string | null;
}

export interface User {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    address: string | null;
    profile_picture_url?: string | null;
    is_creditor: boolean;
    is_debtor: boolean;
    is_internal: boolean;
    email_activated: boolean;
    created_at: string;
    updated_at: string;
    roles?: Role[];
}

export interface Credit {
    id: string;
    creditor_id: string;
    principal: number;
    interest_rate: number;
    tenure_months: number;
    start_date: string;
    end_date: string;
    status: 'active' | 'matured' | 'withdrawn';
    created_at: string;
    updated_at: string;
    creditor?: {
        full_name: string;
        email: string;
    };
}

export interface Loan {
    id: string;
    debtor_id: string;
    principal: number;
    interest_rate: number;
    tenure_months: number;
    start_date: string;
    end_date: string;
    status: 'active' | 'partial_repaid' | 'repaid' | 'overdue' | 'defaulted' | 'archived';
    amount_repaid?: number;  // Track principal repaid so far
    interest_repaid?: number; // Track interest repaid so far
    created_at: string;
    updated_at: string;
    debtor?: {
        full_name: string;
        email: string;
    };
}

export interface DashboardStats {
    totalUsers: number;
    totalActiveCredits: {
        count: number;
        sum: number;
    };
    totalActiveLoans: {
        count: number;
        sum: number;
    };
    totalInterestEarned: number;
    totalRevenueEarned: number; // Gross collections (Principal + Interest Repaid)
    totalCreditCost: number;    // Total payouts to creditors
    totalOperatingExpenses: number;
    totalBadDebt: {
        count: number;
        sum: number;
    };
}

export interface AuditLog {
    id: string;
    user_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    old_value: any;
    new_value: any;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    user?: {
        full_name: string;
        email: string;
    };
}

export interface OperatingExpense {
    id: string;
    expense_name: string;
    amount: number;
    expense_month: string;
    created_by: string | null;
    created_at: string;
}
