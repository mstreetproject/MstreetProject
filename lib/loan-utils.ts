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

export interface RepaymentInstallment {
    installment_no: number;
    due_date: string;
    principal_amount: number;
    interest_amount: number;
}

/**
 * Generates individual installments for a repayment schedule
 */
export function generateRepaymentSchedule(
    principal: number,
    annualRate: number,
    tenureMonths: number,
    cycle: RepaymentCycle,
    startDateStr: string
): RepaymentInstallment[] {
    const installments: RepaymentInstallment[] = [];
    const start = parseISO(startDateStr);
    const monthlyRate = annualRate / 100 / 12;

    // Total interest for simple interest: P * (R/12) * T
    const totalInterest = principal * monthlyRate * tenureMonths;

    let numInstallments = 0;
    let intervalMonths = 0;
    let intervalWeeks = 0;

    switch (cycle) {
        case 'fortnightly':
            intervalWeeks = 2;
            numInstallments = Math.floor((tenureMonths * 4.34) / 2); // Approximate weeks in months
            break;
        case 'monthly':
            intervalMonths = 1;
            numInstallments = tenureMonths;
            break;
        case 'bi_monthly':
            intervalMonths = 2;
            numInstallments = Math.floor(tenureMonths / 2);
            break;
        case 'quarterly':
            intervalMonths = 3;
            numInstallments = Math.floor(tenureMonths / 3);
            break;
        case 'quadrimester':
            intervalMonths = 4;
            numInstallments = Math.floor(tenureMonths / 4);
            break;
        case 'semiannual':
            intervalMonths = 6;
            numInstallments = Math.floor(tenureMonths / 6);
            break;
        case 'annually':
            intervalMonths = 12;
            numInstallments = Math.floor(tenureMonths / 12);
            break;
        case 'bullet':
            numInstallments = 1;
            break;
    }

    if (numInstallments === 0) numInstallments = 1;

    const principalPerInstallment = principal / numInstallments;
    const interestPerInstallment = totalInterest / numInstallments;

    for (let i = 1; i <= numInstallments; i++) {
        let dueDate: Date;
        if (cycle === 'fortnightly') {
            dueDate = addWeeks(start, i * intervalWeeks);
        } else if (cycle === 'bullet') {
            dueDate = addMonths(start, tenureMonths);
        } else {
            dueDate = addMonths(start, i * intervalMonths);
        }

        installments.push({
            installment_no: i,
            due_date: format(dueDate, 'yyyy-MM-dd'),
            principal_amount: Number(principalPerInstallment.toFixed(2)),
            interest_amount: Number(interestPerInstallment.toFixed(2))
        });
    }

    return installments;
}
