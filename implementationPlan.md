Role-Based Dashboard Implementation Plan
Overview
Create comprehensive dashboards for all user types in the MStreet Financial platform, with role-specific views and functionality based on the RBAC system defined in the schema.

User Roles & Dashboard Types
Based on 
schema.sql
, we have:

Super Admin (super_admin) - Full system access
Finance Manager (finance_manager) - Financial operations oversight
Operations Officer (ops_officer) - Day-to-day operations
Risk Officer (risk_officer) - Risk assessment and monitoring
Creditors (is_creditor = TRUE) - View their credits and returns
Debtors (is_debtor = TRUE) - View their loans and payments
General Users - Basic authenticated users
Proposed Changes
1. Authentication & Authorization Middleware
[NEW] 
middleware.ts
Protect /dashboard/* routes
Check if user is authenticated via Supabase session
Redirect to /login if not authenticated
[NEW] 
lib/auth/permissions.ts
Helper functions to check user roles
getUserRole(), hasRole(), isCreditor(), isDebtor()
2. Shared Dashboard Components
[NEW] 
components/dashboard/DashboardLayout.tsx
Sidebar navigation with role-based menu items
Top bar with user info and logout
Responsive layout wrapper
[NEW] 
components/dashboard/StatsCard.tsx
Reusable card for key metrics
[NEW] 
components/dashboard/DataTable.tsx
Generic table component for credits/loans/users
3. Super Admin Dashboard
[NEW] 
app/dashboard/admin/page.tsx
Features:

System Overview: Total users, credits, loans, revenue
User Management: View all users, create staff, manage roles
Financial Summary: Total credits issued, loans disbursed, interest earned
Audit Logs: Recent system activities
Data Sources:

Count queries on users, credits, loans
Aggregate sums for financial totals
Join audit_logs for activity tracking
4. Finance Manager Dashboard
[NEW] 
app/dashboard/finance/page.tsx
Features:

Portfolio Overview: Active credits, active loans, interest tracking
Cash Flow: Incoming vs. outgoing funds
Maturity Calendar: Upcoming credit/loan maturities
Performance Metrics: ROI, default rates
Data Sources:

Filter credits and loans by status
Calculate totals from repayments and withdrawals
Join financial_statements for reporting
5. Creditor Dashboard
[NEW] 
app/dashboard/creditor/page.tsx
Features:

My Credits: List of all credits by this creditor
Total Invested: Sum of all active principal
Expected Returns: Projected interest earnings
Withdrawal History: Past withdrawal records
Data Sources:

Filter credits WHERE creditor_id = current_user_id
Join withdrawals for transaction history
Calculate interest based on interest_rate and tenure_months
6. Debtor Dashboard
[NEW] 
app/dashboard/debtor/page.tsx
Features:

My Loans: List of all loans for this debtor
Total Owed: Sum of outstanding balances
Payment Schedule: Upcoming repayment dates
Payment History: Past repayment records
Data Sources:

Filter loans WHERE debtor_id = current_user_id
Join repayments for transaction history
Calculate remaining balance
7. General User Dashboard
[NEW] 
app/dashboard/page.tsx
Features:

Profile Summary: User details, contact info
Recent Activity: Last login, account changes
Quick Actions: Update profile, change password
Role-based redirect: Automatically route to specific dashboard based on role
Logic:

if (hasRole('super_admin')) redirect('/dashboard/admin')
else if (hasRole('finance_manager')) redirect('/dashboard/finance')
else if (isCreditor()) redirect('/dashboard/creditor')
else if (isDebtor()) redirect('/dashboard/debtor')
Data Fetching Strategy
Server Components (Recommended)
Use Server Components for initial data loading
Fetch data directly in page components via Supabase server client
Automatic caching and better SEO
Client Components (for interactivity)
Use for forms, filters, real-time updates
Fetch via Supabase client-side hooks
Use React Query for caching if needed
Why This Approach?
TIP

Separation by Role: Each dashboard is tailored to show only relevant data for that user type. This improves security (users only see their data) and UX (no clutter).

IMPORTANT

RLS Enforcement: All database queries are protected by the RLS policies we implemented earlier. Even if a user tries to access another dashboard URL, the database will only return data they're authorized to see.

Verification Plan
Manual Testing
Create test users for each role (super_admin, finance_manager, creditor, debtor)
Log in as each user and verify dashboard content
Attempt to access unauthorized dashboards and verify redirects
Test CRUD operations (create credit, repay loan, etc.)
Automated Tests
Unit tests for permission helper functions
Integration tests for dashboard data fetching
E2E tests for user flows (login → dashboard → action)