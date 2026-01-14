# Technical Specification: MStreet Financial Platform

## 1. Overview
This document outlines the technical architecture for the MStreet Financial Lending Portfolio. The platform is designed as a back-office tool for staff to manage creditors, debtors, and calculate real-time profitability.

## 2. Tech Stack
| Component | Technology |
| :--- | :--- |
| **Frontend** | Next.js (React) |
| **Database** | PostgreSQL (Supabase) |
| **Auth** | Supabase Auth (Staff-only access for Phase 1) |
| **Styling** | Vanilla CSS (CSS Modules) |
| **State Management** | React Context + SWR (data fetching) |
| **Typography** | Clash Grotesk, Brotherhood Script |

## 3. Database Schema (Supabase)

### Table: `profiles`
Logs internal staff and their roles.
- `id`: uuid (primary key)
- `email`: string
- `role`: enum ('super_admin', 'finance_manager', 'ops_officer', 'risk_officer', 'viewer')
- `full_name`: string

### Table: `business_entities` (Creditors & Debtors)
Unified table for humans/entities stored in the system.
- `id`: uuid (primary key)
- `full_name`: string
- `email`: string
- `phone`: string
- `address`: text
- `is_creditor`: boolean
- `is_debtor`: boolean
- `created_at`: timestamp

### Table: `credits` (Funds from Creditors)
- `id`: uuid
- `creditor_id`: uuid (FK to business_entities)
- `principal`: numeric
- `interest_rate`: numeric (annual percentage)
- `start_date`: date
- `end_date`: date
- `status`: enum ('active', 'matured', 'withdrawn')

### Table: `loans` (Funds to Debtors)
- `id`: uuid
- `debtor_id`: uuid (FK to business_entities)
- `principal`: numeric
- `interest_rate`: numeric (annual percentage)
- `start_date`: date
- `end_date`: date
- `status`: enum ('active', 'repaid', 'overdue', 'defaulted')
- `guarantor_info`: jsonb

### Table: `operating_expenses`
- `id`: uuid
- `amount`: numeric
- `category`: string
- `date`: date
- `description`: text

## 4. Financial Calculations

### Interest Accrual Formula
Interest is calculated daily based on the active duration.
`Daily Interest = Principal * (Interest Rate / 100) / 365`

### MoM Profitability
`Net Profit = (Interest Earned from Loans) - (Interest Owed to Credits) - (OpEx) - (Bad Debt Provision)`

## 5. Security (RLS)
- **Super Admin**: CRUD access to all tables.
- **Finance Manager**: View all, CRUD on OpEx and Transactions.
- **Ops Officer**: CRUD on Creditors/Debtors/Loans.
- **Viewers**: Read-only access.

## 6. UI Brand Tokens
- **Navy**: `#070757`
- **Skyline**: `#02B3FF`
- **Lime**: `#B8DB0F`
- **Body Font**: Clash Grotesk
- **Accent Font**: Brotherhood Script
