import { useMemo } from 'react';

export function calculateInterestDue(
    principal: number,
    interestRate: number,
    startDate: string,
    interestAlreadyPaid: number = 0,
    tenureMonths?: number
): number {
    const start = new Date(startDate);
    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysElapsed = Math.max(0, (now.getTime() - start.getTime()) / msPerDay);
    const avgDaysPerMonth = 30.4167;
    const monthsElapsed = daysElapsed / avgDaysPerMonth;

    // Monthly flat interest: P * (R_monthly / 100) * monthsElapsed
    const rawInterest = principal * (interestRate / 100) * monthsElapsed;

    // If tenureMonths is available, cap accrued interest at maturity interest
    const maxInterest = tenureMonths ? principal * (interestRate / 100) * tenureMonths : rawInterest;
    const totalInterest = Math.min(rawInterest, maxInterest);

    return Math.max(0, totalInterest - interestAlreadyPaid);
}

interface UseRepaymentCalculationsProps {
    loan: any;
    schedule: any[];
    selectedScheduleIndex: number | null;
    principalAmount: string;
    interestAmount: string;
}

export function useRepaymentCalculations({
    loan,
    schedule,
    selectedScheduleIndex,
    principalAmount,
    interestAmount
}: UseRepaymentCalculationsProps) {
    // Calculate amounts due
    const calculations = useMemo(() => {
        if (!loan) return { principalDue: 0, interestDue: 0, totalDue: 0 };

        const principalDue = loan.principal - (loan.amount_repaid || 0);
        const interestDue = calculateInterestDue(
            loan.principal,
            loan.interest_rate,
            loan.origination_date || loan.start_date,
            loan.interest_repaid || 0,
            loan.tenure_months
        );

        return {
            principalDue: Math.max(0, principalDue),
            interestDue: Math.max(0, interestDue),
            totalDue: Math.max(0, principalDue) + Math.max(0, interestDue)
        };
    }, [loan]);

    const totalPayment = (parseFloat(principalAmount) || 0) + (parseFloat(interestAmount) || 0);
    const selectedScheduleItem = selectedScheduleIndex !== null ? schedule[selectedScheduleIndex] : null;
    const activeScheduleItem = selectedScheduleItem || schedule.find(s => s.status !== 'paid') || schedule[0] || null;

    const actualPrincipal = parseFloat(principalAmount) || 0;
    const actualInterest = parseFloat(interestAmount) || 0;
    const actualTotal = actualPrincipal + actualInterest;

    const totalRemainingPayoff = calculations.principalDue + calculations.interestDue;
    
    const allItemsPaid = schedule.length > 0 && schedule.every(s => s.status === 'paid');
    const isPhysicalLastItem = activeScheduleItem && schedule.length > 0 && activeScheduleItem.id === schedule[schedule.length - 1].id;
    const isFinalPhase = allItemsPaid || isPhysicalLastItem || schedule.length === 0;

    const expectedPrincipal = isFinalPhase ? calculations.principalDue : (activeScheduleItem ? activeScheduleItem.principal_amount : (schedule.length > 0 && loan ? loan.principal / loan.tenure_months : calculations.principalDue));
    const expectedInterest = isFinalPhase ? calculations.interestDue : (activeScheduleItem ? activeScheduleItem.interest_amount : calculations.interestDue);
    const expectedTotal = expectedPrincipal + expectedInterest;

    const isFinalPhaseShortfall = isFinalPhase && actualTotal < totalRemainingPayoff - 0.01;

    return {
        calculations,
        totalPayment,
        selectedScheduleItem,
        activeScheduleItem,
        actualPrincipal,
        actualInterest,
        actualTotal,
        totalRemainingPayoff,
        allItemsPaid,
        isPhysicalLastItem,
        isFinalPhase,
        expectedPrincipal,
        expectedInterest,
        expectedTotal,
        isFinalPhaseShortfall
    };
}
