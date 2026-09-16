/**
 * Unified Interest Calculation Utilities
 * 
 * IMPORTANT: All interest calculations across the application should use these functions
 * to ensure consistent values across dashboards, reports, and tables.
 */

// Average days per month (365 / 12) for consistent daily accrual from a monthly rate
export const AVG_DAYS_PER_MONTH = 30.4167;

/**
 * Calculate simple interest accrued based on principal, rate, and time elapsed.
 * 
 * @param principal - The principal amount
 * @param interestRate - Interest rate as percentage (e.g., 4 for 4%)
 * @param startDate - Start date of the loan/credit
 * @param endDate - End date for calculation (defaults to today)
 * @param rateType - 'monthly' (default for debtor loans) or 'annual' (for creditor placements)
 * @returns The accrued interest amount
 */
export function calculateSimpleInterest(
    principal: number,
    interestRate: number,
    startDate: string | Date,
    endDate?: string | Date | null,
    rateType: 'monthly' | 'annual' = 'monthly'
): number {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const daysElapsed = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    if (rateType === 'monthly') {
        // Daily accrual based on monthly rate: Principal * (Rate/100) * (Days / 30.4167)
        return principal * (interestRate / 100) * (daysElapsed / AVG_DAYS_PER_MONTH);
    }

    // Annual Simple Interest: P × (R/100) × (Days / 365)
    return principal * (interestRate / 100) * (daysElapsed / 365);
}

/**
 * Calculate the total interest at maturity for a given tenure.
 * 
 * @param principal - The principal amount
 * @param interestRate - Interest rate as percentage
 * @param tenureMonths - Total tenure in months
 * @param rateType - 'monthly' (default for debtor loans) or 'annual' (for creditor placements)
 * @returns The total interest at maturity
 */
export function calculateMaturityInterest(
    principal: number,
    interestRate: number,
    tenureMonths: number,
    rateType: 'monthly' | 'annual' = 'monthly'
): number {
    if (rateType === 'monthly') {
        // Monthly flat interest: Principal * (Rate/100) * TenureMonths
        return principal * (interestRate / 100) * tenureMonths;
    }
    // Annualized interest: Principal * (Rate/100) * (TenureMonths / 12)
    return principal * (interestRate / 100) * (tenureMonths / 12);
}

/**
 * Calculate the current value of a credit/loan (principal + accrued interest)
 * 
 * @param remainingPrincipal - The remaining principal after any repayments
 * @param interestRate - Interest rate as percentage
 * @param startDate - Start date of the loan/credit
 * @param rateType - 'monthly' or 'annual'
 * @returns The current value (principal + accrued interest)
 */
export function calculateCurrentValue(
    remainingPrincipal: number,
    interestRate: number,
    startDate: string | Date,
    rateType: 'monthly' | 'annual' = 'monthly'
): number {
    const interest = calculateSimpleInterest(remainingPrincipal, interestRate, startDate, null, rateType);
    return remainingPrincipal + interest;
}
