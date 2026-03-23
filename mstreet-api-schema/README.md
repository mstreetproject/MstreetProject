# MStreet API — Public Loan Application Schema

## Overview

This schema handles **public loan applications** submitted via [mstreetsfinance.com/loan-application](https://mstreetsfinance.com/loan-application). Applicants **do not need to register** — all submissions are anonymous.

---

## Architecture

| Component | Details |
|---|---|
| **Database** | Supabase (PostgreSQL) |
| **Table** | `profiles` |
| **Storage Bucket** | `mstreetstorage` |
| **ID Type** | UUID (`gen_random_uuid()`) |
| **Reference Format** | `MSLA00001`, `MSLA00002`, ... (auto-generated) |

---

## `profiles` Table Schema

### Step 1: Personal Information (12 fields)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, auto-gen | Unique identifier |
| `reference_no` | `TEXT` | UNIQUE, auto-gen | Application reference (MSLA00001) |
| `title` | `TEXT` | CHECK enum | Mr., Mrs., Miss, Dr., Chief., Ms. |
| `gender` | `TEXT` | CHECK enum | Male, Female |
| `first_name` | `TEXT` | NOT NULL | Applicant's first name |
| `middle_name` | `TEXT` | nullable | Applicant's middle name |
| `last_name` | `TEXT` | NOT NULL | Applicant's last name |
| `marital_status` | `TEXT` | CHECK enum | Single, Married, Separated, Divorced, Widowed |
| `date_of_birth` | `DATE` | nullable | Date of birth |
| `phone_number` | `TEXT` | NOT NULL | +234 format, WhatsApp-registered |
| `email` | `TEXT` | nullable | Email address |
| `home_address` | `TEXT` | nullable | Residential address |
| `bvn` | `TEXT` | nullable | Bank Verification Number |
| `nin` | `TEXT` | nullable | National Identification Number |

### Step 2: Employment Details (7 fields)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `employment_type` | `TEXT` | CHECK enum | `employed` or `self_employed` |
| `employer` | `TEXT` | nullable | Employer name (if employed) |
| `office_email` | `TEXT` | nullable | Office email (if employed) |
| `office_address` | `TEXT` | nullable | Office address (if employed) |
| `nature_of_business` | `TEXT` | nullable | Business type (if self-employed) |
| `business_name` | `TEXT` | nullable | Business name (if self-employed) |
| `business_address` | `TEXT` | nullable | Business address (if self-employed) |

### Step 3: Next of Kin (6 fields)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `nok_first_name` | `TEXT` | nullable | Next of Kin first name |
| `nok_middle_name` | `TEXT` | nullable | Next of Kin middle name |
| `nok_last_name` | `TEXT` | nullable | Next of Kin last name |
| `nok_relationship` | `TEXT` | nullable | Relationship to applicant |
| `nok_mobile_number` | `TEXT` | nullable | Next of Kin phone number |
| `nok_email` | `TEXT` | nullable | Next of Kin email |

### Step 4: Upload Documents (4 fields)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id_type` | `TEXT` | CHECK enum | International Passport, Drivers Licence, Voters card, National ID |
| `id_document_url` | `TEXT` | nullable | Path in `mstreetstorage/loan-applications/` |
| `utility_bill_url` | `TEXT` | nullable | Path in `mstreetstorage/loan-applications/` |
| `passport_photo_url` | `TEXT` | nullable | Path in `mstreetstorage/loan-applications/` (optional) |

### Application Status & Admin (5 fields)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `status` | `TEXT` | CHECK enum, DEFAULT `submitted` | submitted, under_review, approved, rejected, additional_info |
| `admin_notes` | `TEXT` | nullable | Internal staff notes |
| `reviewed_by` | `UUID` | nullable | Admin who reviewed |
| `reviewed_at` | `TIMESTAMPTZ` | nullable | Review timestamp |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, auto | Submission time |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, auto | Last update time |

---

## RLS Policies

### Profiles Table

| Policy | Role | Operation | Rule |
|---|---|---|---|
| Public can submit | `anon` | INSERT | `true` — anyone can apply |
| Staff can view | `authenticated` | SELECT | `true` — all staff see all |
| Staff can update | `authenticated` | UPDATE | `true` — change status, notes |
| Staff can delete | `authenticated` | DELETE | `true` — remove spam |

### Storage (`mstreetstorage`)

| Policy | Role | Operation | Rule |
|---|---|---|---|
| Public can upload | `anon` | INSERT | Only to `loan-applications/` folder |
| Staff can view | `authenticated` | SELECT | All files |
| Staff can delete | `authenticated` | DELETE | All files |
| Staff can update | `authenticated` | UPDATE | All files |

---

## Storage Structure

```
mstreetstorage/
└── loan-applications/
    ├── {uuid}_id_document.pdf
    ├── {uuid}_utility_bill.jpg
    └── {uuid}_passport_photo.png
```

- **Max file size:** 5MB
- **Allowed types:** JPEG, PNG, WebP, PDF

---

## File Upload Path Convention

When uploading from the API, use this path format:
```
loan-applications/{profile_id}/{file_type}.{extension}
```

Example:
```
loan-applications/a1b2c3d4-e5f6-7890-abcd-ef1234567890/id_document.pdf
loan-applications/a1b2c3d4-e5f6-7890-abcd-ef1234567890/utility_bill.jpg
loan-applications/a1b2c3d4-e5f6-7890-abcd-ef1234567890/passport_photo.png
```
