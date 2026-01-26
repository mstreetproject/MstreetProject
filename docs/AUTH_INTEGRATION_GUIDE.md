# MStreet Financial - Auth Integration Guide

This guide is for external development teams who need to integrate with MStreet Financial's authentication system.

---

## Table of Contents

1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Authentication Methods](#authentication-methods)
4. [API Endpoints](#api-endpoints)
5. [Supabase Direct Integration](#supabase-direct-integration)
6. [User Types & Roles](#user-types--roles)
7. [Email Configuration](#email-configuration)
8. [Security Considerations](#security-considerations)

---

## Overview

MStreet Financial uses **Supabase** for authentication. The system maintains two synced tables:

| Table | Purpose |
|-------|---------|
| `auth.users` | Supabase's native auth table (credentials, sessions) |
| `public.users` | Custom user profile table with business logic |

When a user signs up via Supabase Auth, a database trigger (`on_auth_user_created`) automatically creates the corresponding `public.users` entry.

---

## Environment Setup

### Required Environment Variables

Add these to your `.env.local` or `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

> ⚠️ **IMPORTANT**: Never expose the `SUPABASE_SERVICE_ROLE_KEY` in client-side code!

### Installing Dependencies

```bash
npm install @supabase/supabase-js
```

### Creating the Supabase Client

```typescript
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## Authentication Methods

### 1. User Registration (Sign Up)

```typescript
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "securePassword123",
  options: {
    data: {
      full_name: "John Doe",  // Will be saved to public.users
    },
    // Replace with YOUR domain's welcome/confirmation page
    emailRedirectTo: "https://your-website.com/welcome",
  },
});

if (error) {
  console.error("Sign up failed:", error.message);
} else {
  console.log("User created! Please check email for verification.");
}
```

**What happens behind the scenes:**
1. Supabase creates a row in `auth.users`
2. A verification email is sent to the user
3. Database trigger creates a row in `public.users` with:
   - `id` = same as auth.users.id
   - `full_name` = from metadata
   - `email` = from signup
   - `is_internal` = FALSE (external user)

---

### 2. Forgot Password

```typescript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  // Replace with YOUR domain's password reset page
  redirectTo: "https://your-website.com/reset-password",
});

if (error) {
  console.error("Reset request failed:", error.message);
} else {
  console.log("Password reset link sent to email!");
}
```

---

### 3. Reset Password

When the user clicks the reset link, they'll be redirected to your reset page with a session. Then:

```typescript
const { error } = await supabase.auth.updateUser({
  password: "newSecurePassword123",
});

if (error) {
  console.error("Password update failed:", error.message);
} else {
  console.log("Password updated successfully!");
}
```

---

### 4. Login

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "securePassword123",
});

if (error) {
  console.error("Login failed:", error.message);
} else {
  console.log("Logged in!", data.user);
}
```

---

### 5. Logout

```typescript
const { error } = await supabase.auth.signOut();
```

---

### 6. Get Current User

```typescript
const { data: { user } } = await supabase.auth.getUser();

if (user) {
  console.log("Current user:", user.email);
} else {
  console.log("Not logged in");
}
```

---

## API Endpoints

MStreet Financial also provides REST API endpoints that you can call from your backend:

### POST `/api/auth/signup`

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "John Doe",
  "redirectTo": "https://your-website.com/welcome"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "User created successfully. Please check email for verification.",
  "userId": "uuid-here"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "User already registered"
}
```

---

### POST `/api/auth/forgot-password`

Request a password reset email.

**Request:**
```json
{
  "email": "user@example.com",
  "redirectTo": "https://your-website.com/reset-password"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password reset link sent to email"
}
```

---

### POST `/api/auth/reset-password`

Complete password reset (requires valid session from email link).

**Request:**
```json
{
  "password": "newSecurePassword123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

## Supabase Direct Integration

If you prefer to use Supabase directly (recommended for client-side apps), simply use the same project credentials and call Supabase methods directly as shown in the [Authentication Methods](#authentication-methods) section.

---

## User Types & Roles

The `public.users` table has these boolean flags for user classification:

| Field | Description |
|-------|-------------|
| `is_internal` | Staff members (admins, officers) |
| `is_creditor` | External users who lend money |
| `is_debtor` | External users who borrow money |

**For external website signups:**
- `is_internal` is automatically set to `FALSE`
- To mark a user as creditor/debtor, update the `public.users` table:

```typescript
const { error } = await supabase
  .from('users')
  .update({ is_debtor: true })
  .eq('id', userId);
```

---

## Email Configuration

### Redirect URLs

You must configure your domain in Supabase Dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Add your domain to **Redirect URLs**:
   ```
   https://your-website.com/**
   ```
3. For local development:
   ```
   http://localhost:3000/**
   ```

### Email Templates

Supabase sends emails for:
- Email confirmation (after signup)
- Password reset
- Magic link login (if enabled)

To customize templates, go to **Authentication** → **Email Templates** in Supabase Dashboard.

---

## Security Considerations

### ✅ DO

- Always use HTTPS in production
- Validate email format on your frontend
- Use strong password requirements (min 6 characters)
- Handle errors gracefully without exposing details

### ❌ DON'T

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code
- Don't store passwords in plain text
- Don't log sensitive user data
- Don't skip email verification in production

---

## Support

For integration issues, contact the MStreet Financial development team.

---

*Last updated: January 2026*
