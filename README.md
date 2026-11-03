# Folio – Personal & Invite-Only Multi-User Resume Builder

Folio is a privacy-focused resume and cover letter builder built with Next.js 16, Tailwind CSS, TypeScript, Zustand, and `@react-pdf/renderer`. It supports two seamless operating modes:
1. **Local Mode (No Env Vars Required)**: Runs 100% locally in your browser via IndexedDB + local file backup with zero accounts required.
2. **Invite-Only Multi-User Cloud Mode (Supabase + Cloudflare Workers)**: Share your deployed instance with 10–50 friends for **$0/month**, where every user's resumes, cover letters, job tracker items, and uploaded photos are strictly isolated at the PostgreSQL database level using **Row-Level Security (RLS)** (even the admin cannot read another user's documents).

---

## Key Features

- **8 Original ATS-Ready Templates**: Plain, Ledger, Margin, Mono, Split, Compact, Serif, and Timeline.
- **Real Text-Based PDF Export**: Generates true searchable, selectable text PDFs with embedded fonts and raw embedded photo bytes using `@react-pdf/renderer`.
- **ATS Machine Readability Inspector**: Uses `pdfjs-dist` to parse your generated PDF text stream and provide an instant ATS audit with readability scoring.
- **Invite-Only Access & Admin Approval (`/admin`)**: First user to sign up automatically becomes `admin` + `approved`. Friends on the pre-invite list are approved immediately; others wait on `/pending` until approved with one click.
- **Zero-Access Document Privacy**: PostgreSQL RLS policies enforce `owner_id = auth.uid() AND public.is_approved()` with **no admin bypass** on `resumes`, `cover_letters`, `jobs`, `style_presets`, or `storage.objects`.
- **Optimistic Concurrency & Offline Resilience**: Multi-tab version conflict detection (**Keep mine** / **Load latest** / **Duplicate mine as a copy**) and IndexedDB offline edit caching with automatic reconnect sync.
- **Dual-Mode AI Assistant**: Supports personal browser-only BYOK keys (never stored in the database) or an optional admin-sponsored shared `AI_API_KEY` with per-user daily quotas (`AI_DAILY_LIMIT_PER_USER`).
- **Full Data Portability & Account Self-Deletion (`/account`)**: One-click full JSON export and self-service account + storage deletion.

---

## 1. Running in Local Mode (Offline, Single User)

Leave `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` unset:

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # Run unit tests
pnpm build      # Production build
```

---

## 2. Setting Up Free Multi-User Cloud Mode (Supabase)

1. **Create a free Supabase project** at [supabase.com](https://supabase.com).
2. **Run the Database & Storage Schema**:
   - Open **SQL Editor** in your Supabase dashboard.
   - Paste and run the entire contents of [`supabase/schema.sql`](./supabase/schema.sql).
   - This creates `profiles`, `invites`, `resumes`, `cover_letters`, `jobs`, `style_presets`, `ai_usage`, the private `user-files` Storage bucket, triggers, and strict RLS policies.
3. **Configure Authentication**:
   - Under **Authentication → Providers → Email**, enable **Email + Password** (minimum password length: 8 characters).
   - Under **Authentication → URL Configuration**, set **Site URL** to your production URL (e.g., `https://folio.yourdomain.com` or `http://localhost:3000`).
4. **Configure Environment Variables**:
   - Copy `.env.example` to `.env.local` and fill in:
     ```bash
     NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
     ```
   - *(Optional)* To sponsor AI calls for selected friends, set server-only variables:
     ```bash
     AI_PROVIDER=gemini
     AI_API_KEY=your-secret-ai-key
     AI_MODEL=gemini-2.0-flash
     AI_DAILY_LIMIT_PER_USER=30
     ```
   - **Never** add `SUPABASE_SERVICE_ROLE_KEY` anywhere in the application.
5. **Bootstrap Your Admin Account**:
   - Start the app and sign up at `/signup`. The very first user in `profiles` is automatically granted `role = 'admin'` and `status = 'approved'`.

---

## 3. Inviting & Approving Friends

Open `/admin` while signed in as an admin:
- **Pre-Invite Friends**: Paste one or more friend email addresses into **Pre-Approve Friends by Email**. When they sign up with that email, they skip `/pending` and are approved automatically.
- **Approve Pending Sign-Ups**: Anyone else who signs up lands on `/pending`. Click **Approve** next to their row in `/admin` to grant access, or **Block** to suspend access immediately.
- **Sponsor Shared AI Key**: Toggle **Allowed** under the *Shared AI Key* column for any friend you want to allow using your server `AI_API_KEY` (up to `AI_DAILY_LIMIT_PER_USER` calls/day).

---

## 4. Deploying to Cloudflare Workers (Free Tier)

This project includes [`wrangler.jsonc`](./wrangler.jsonc) and [`open-next.config.ts`](./open-next.config.ts) for Cloudflare Workers deployment:

1. Connect your GitHub repository in **Cloudflare Dashboard → Workers & Pages** (or use Wrangler CLI).
2. Add environment variables in Worker Settings:
   - Plaintext: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `AI_PROVIDER`, `AI_MODEL`, `AI_DAILY_LIMIT_PER_USER`.
   - Encrypted Secret: `AI_API_KEY`.
3. Add your Worker domain to **Supabase → Authentication → URL Configuration**.

> **Free-Tier Note**: Supabase's free tier includes 500 MB Postgres database, 1 GB Storage, and 50,000 monthly active users. Free Supabase projects pause after 7 days of zero database activity (and wake up in ~1 minute from the Supabase dashboard).

---

## 5. Running the Automated Security Check

Verify that anonymous callers cannot read or enumerate any table, storage object, or admin RPC:

```bash
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co \
SUPABASE_ANON_KEY=eyJhbGciOi... \
bash supabase/security_check.sh
```

Every table (`profiles`, `invites`, `resumes`, `cover_letters`, `jobs`, `style_presets`, `ai_usage`), the `user-files` bucket, and `admin_member_stats` must return `[]` or `401/403`.
