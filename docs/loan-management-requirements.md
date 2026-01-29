# Loan Management System Requirements

> **Status:** Pending Implementation  
> **Created:** 2026-01-26  
> **Last Updated:** 2026-01-26

---

## Spreadsheet Column Structure

### Main Data Columns (A-O)

| Column | Header | Description |
|--------|--------|-------------|
| A | S/N | Serial Number |
| B | REF. NO | Reference Number |
| C | NAME | Debtor Name |
| D | PRINCIPAL AMOUNT (NGN) | Principal Amount in Naira |
| E | PRINCIPAL AMOUNT (USD) | Principal Amount in USD |
| F | DISBURSED AMOUNT | Actual Disbursed Amount |
| G | RATE | Interest Rate |
| H | TENOR (MONTH) | Loan Tenure in Months |
| I | PRELIQUIDATED DATE | Preliquidation Date |
| J | DISBURSED DATE | Date Loan Was Disbursed |
| K | ORIGINATION DATE | When the loan starts counting |
| L | 1ST REPAYMENT | First Repayment Date (calculated based on repayment cycle) |
| M | PRELIQUIDATED BALANCE OF LC | Preliquidated Balance |
| N | TERMINATION D | Termination Date |
| O | MATURITY DATE | Origination Date + Tenure |

### Status Columns (Q-R-S-T) - **Separate Tab**

These columns should be in a **different tab** for updating based on output (Column M):

| Column | Header | Type | Description |
|--------|--------|------|-------------|
| Q | APPROVED | Status | Approval status (Approved/Pending/Rejected) |
| R | DISBURSED | YES/NO | Whether loan has been disbursed |
| S | PERFORMING | YES/NO | Whether loan is performing (current with payments) |
| T | CLOSED | YES/NO | Whether loan has been closed |

---

## Key Date Relationships

```
Origination Date + Tenure = Maturity Date
```

---

## Loan Status Categories (Derived from Column S - PERFORMING)

| # | Status | Description |
|---|--------|-------------|
| 1 | Performing | Loan is current with payments (S = YES, T = NO) |
| 2 | Non-performing - Overdue | Payments are overdue (S = NO, T = NO) |
| 3 | Non-performing - Full provision required | Requires full provision |
| 4 | Preliquidated - Closed | Loan has been closed/settled (T = YES) |

---

## Repayment Cycle Options

The system should calculate repayment dates based on these options:

| # | Mode | Frequency |
|---|------|-----------|
| 1 | Fortnightly | Every 2 weeks |
| 2 | Monthly | Every month |
| 3 | Bi-Monthly | Every 2 months |
| 4 | Quarterly | Every 3 months (quarter) |
| 5 | Quadrimester | Every 4 months |
| 6 | Semiannual | Every 6 months (twice a year) |
| 7 | Annually | Once a year |
| 8 | Bullet Payment | All interest + principal paid at maturity date |

---

## History Page Requirements

The history page should be accessible for **all debtors** and display:

- [ ] All loan details
- [ ] Repayment mode/cycle
- [ ] Loan status (Performing, Non-performing, etc.)
- [ ] Full payment/repayment history
- [ ] Origination date
- [ ] 1st repayment date
- [ ] Maturity date

---

## Implementation Notes

- Columns Q to T (loan status) should be in a **different tab** for updating based on output column M
- Repayment mode should calculate dates automatically based on the selected cycle option
- History page should capture all the above information for each debtor

---

## Open Questions

1. Clarify the "different tab" requirement - spreadsheet or UI tab?
2. Define calculation logic for 1st repayment date based on each cycle
3. Determine how loan status transitions are triggered
