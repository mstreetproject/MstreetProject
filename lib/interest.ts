/**
 * Unified Interest Calculation Utilities
 * 
 * IMPORTANT: All interest calculations across the application should use these functions
 * to ensure consistent values across dashboards, reports, and tables.
 */

/**
 * Calculate simple interest accrued based on principal, rate, and time elapsed.
 * Uses daily calculation for accuracy: Principal × (Rate/100) × (Days/365)
 * 
 * @param principal - The principal amount
 * @param interestRate - Annual interest rate as percentage (e.g., 12 for 12%)
 * @param startDate - Start date of the loan/credit
 * @param endDate - End date for calculation (defaults to today)
 * @returns The accrued interest amount
 */
export function calculateSimpleInterest(
    principal: number,
    interestRate: number,
    startDate: string | Date,
    endDate?: string | Date | null
): number {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const daysElapsed = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    // Simple Interest: P × R × T (where T is in years)
    return principal * (interestRate / 100) * (daysElapsed / 365);
}

/**
 * Calculate the total interest at maturity for a given tenure.
 * Uses monthly calculation: Principal × (Rate/100) × (Months/12)
 * 
 * @param principal - The principal amount
 * @param interestRate - Annual interest rate as percentage
 * @param tenureMonths - Total tenure in months
 * @returns The total interest at maturity
 */
export function calculateMaturityInterest(
    principal: number,
    interestRate: number,
    tenureMonths: number
): number {
    return principal * (interestRate / 100) * (tenureMonths / 12);
}

/**
 * Calculate the current value of a credit/loan (principal + accrued interest)
 * 
 * @param remainingPrincipal - The remaining principal after any repayments
 * @param interestRate - Annual interest rate as percentage
 * @param startDate - Start date of the loan/credit
 * @returns The current value (principal + accrued interest)
 */
export function calculateCurrentValue(
    remainingPrincipal: number,
    interestRate: number,
    startDate: string | Date
): number {
    const interest = calculateSimpleInterest(remainingPrincipal, interestRate, startDate);
    return remainingPrincipal + interest;
}
