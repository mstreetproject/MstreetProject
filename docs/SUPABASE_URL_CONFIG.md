# Supabase Redirect URLs Configuration

## Purpose

When users sign up or reset their password, Supabase sends emails with links. These links need to redirect to allowed domains. Both MStreet dashboard and external websites need to be configured.

---

## How to Configure

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **mstreet-financial**
3. Navigate to: **Authentication** → **URL Configuration**

---

## Required Redirect URLs

Add ALL of the following URLs to the **Redirect URLs** list:

### MStreet Dashboard (Current)

```
http://localhost:3000/**
https://mstreet-financial.vercel.app/**
https://your-production-domain.com/**
```

### External Website (Add these)

```
http://localhost:3001/**
https://external-website-staging.vercel.app/**
https://external-website.com/**
```

> 💡 **Tip**: The `/**` wildcard allows any path on that domain.

---

## Email Templates

Go to **Authentication** → **Email Templates** to customize:

### 1. Confirm Signup Email
- Subject: `Confirm your email`
- Template includes `{{ .ConfirmationURL }}`

### 2. Reset Password Email
- Subject: `Reset Your Password`
- Template includes `{{ .ConfirmationURL }}`

### 3. Magic Link Email (if enabled)
- Subject: `Your Magic Link`
- Template includes `{{ .ConfirmationURL }}`

---

## Site URL

Set your primary **Site URL** in the URL Configuration:

```
https://your-main-domain.com
```

This is used as the default for `emailRedirectTo` if none is specified.

---

## Testing

After configuration:

1. Test signup from both dashboard and external website
2. Test forgot password flow from both
3. Verify email links redirect to correct domains

---

## Common Issues

### "Redirect URL not allowed"

- Make sure the exact domain pattern is in Redirect URLs
- Check for trailing slashes
- Ensure you're using `/**` wildcard

### Email not sending

- Check Supabase email quota
- Verify SMTP settings if using custom SMTP
- Check spam folder

---

*Configure this before sharing credentials with external team.*
