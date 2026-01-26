import { addMonths, addWeeks, format, parseISO, isValid } from 'date-fns';

export type RepaymentCycle =
    | 'fortnightly'
    | 'monthly'
    | 'bi_monthly'
    | 'quarterly'
    | 'quadrimester'
    | 'semiannual'
    | 'annually'
    | 'bullet'
    | '';

export interface LoanDates {
    maturityDate: Date;
    firstRepaymentDate: Date;
    formattedMaturityDate: string;
    formattedFirstRepaymentDate: string;
}

/**
 * Calculates maturity date and first repayment date for a loan
 */
export function calculateLoanDates(
    originationDateStr: string,
    tenureMonths: number,
    cycle: RepaymentCycle
): LoanDates | null {
    if (!originationDateStr || isNaN(tenureMonths) || !cycle) {
        return null;
    }

    const start = parseISO(originationDateStr);
    if (!isValid(start)) return null;

    // 1. Calculate Maturity Date (Origination + Tenure Months)
    const maturityDate = addMonths(start, tenureMonths);

    // 2. Calculate First Repayment Date based on cycle
    let firstRepaymentDate: Date;

    switch (cycle) {
        case 'fortnightly':
            firstRepaymentDate = addWeeks(start, 2);
            break;
        case 'monthly':
            firstRepaymentDate = addMonths(start, 1);
            break;
        case 'bi_monthly':
            firstRepaymentDate = addMonths(start, 2);
            break;
        case 'quarterly':
            firstRepaymentDate = addMonths(start, 3);
            break;
        case 'quadrimester':
            firstRepaymentDate = addMonths(start, 4);
            break;
        case 'semiannual':
            firstRepaymentDate = addMonths(start, 6);
            break;
        case 'annually':
            firstRepaymentDate = addMonths(start, 12);
            break;
        case 'bullet':
            firstRepaymentDate = maturityDate;
            break;
        default:
            firstRepaymentDate = addMonths(start, 1);
    }

    return {
        maturityDate,
        firstRepaymentDate,
        formattedMaturityDate: format(maturityDate, 'yyyy-MM-dd'),
        formattedFirstRepaymentDate: format(firstRepaymentDate, 'yyyy-MM-dd'),
    };
}
