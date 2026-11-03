# Multi-User Guide: Folio for friends

This file turns Folio (the personal resume builder described in `resume-builder-spec.md` and `section-design-spec.md`) into a small **invite-only multi-user app**: friends create an account, the owner approves them, and each person gets their own private resumes, cover letters, job tracker and presets.

It follows the same model as Stage Radar: **Supabase** for accounts, database and files; **admin approval + invites**; privacy enforced by **Row-Level Security in the database**, not just hidden in the UI; a **security self-check** before inviting anyone; everything on **free hosting**.

> **Before you start (agent):** the GitHub repo `ZAKARIAE48CHELLE/CV-builder` currently contains only the Create Next App scaffold. Work on the owner's real local project. Read the existing code first and adapt the names below (store, types, folders) to what actually exists. Do not rewrite working features; replace only the storage layer and add what this guide lists.
>
> This project uses a recent Next.js with breaking changes (see `AGENTS.md`). Read `node_modules/next/dist/docs/` before writing routing, middleware/proxy, auth or server code. Heed deprecation notices.

---

## 1. What changes, what stays

| Area | Before (personal) | After (multi-user) |
|---|---|---|
| Accounts | none | Supabase Auth (email + password), admin approval |
| Data | IndexedDB in one browser | Supabase Postgres, one row per resume / letter / job, owner-only |
| Photos, imported files | data URLs in IndexedDB | private Supabase Storage bucket, per-user folder |
| AI key | owner's key in local settings | per-user key (browser only) **or** owner's key with quotas, chosen by admin |
| PDF export, preview, templates, per-section design | client-side | **unchanged**, still client-side |
| Hosting | `localhost` | Cloudflare (Workers via OpenNext), free |

Keep every existing feature working: editor, live preview, 8 templates, per-section design, PDF export, ATS check, import, cover letters, job tracker, presets, undo/redo, JSON export.

---

## 2. Stack additions

- `@supabase/supabase-js` and `@supabase/ssr` (cookie-based sessions for the Next.js server side).
- Supabase project (free plan, EU region).
- `@opennextjs/cloudflare` + `wrangler` for deployment to Cloudflare Workers. Fallback if it blocks on the Next.js version: Vercel Hobby (personal, non-commercial use is fine for friends).
- Never add the Supabase `service_role` key to the app. It is used only from the owner's terminal for admin scripts, if ever.

Environment variables (`.env.local`, and Cloudflare dashboard → Settings → Variables):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
AI_PROVIDER=...            # optional, only if the owner shares a key
AI_API_KEY=...             # optional, server-only, never NEXT_PUBLIC_
AI_MODEL=...
AI_DAILY_LIMIT_PER_USER=30
```

The anon key is public by design. Data protection comes from RLS (§4).

---

## 3. Database schema (`supabase/schema.sql`)

One idempotent SQL file (safe to re-run: `create ... if not exists`, `create or replace`, `drop policy if exists` before `create policy`). The owner pastes it into Supabase → SQL Editor → Run.

```sql
-- Profiles: one per auth user
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  status text not null default 'pending' check (status in ('pending','approved','blocked')),
  role text not null default 'member' check (role in ('member','admin')),
  ai_shared_key_allowed boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

-- Invites: emails pre-approved by the admin
create table if not exists public.invites (
  email text primary key,
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

-- Documents: the existing Resume / CoverLetter objects stored as jsonb
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  data jsonb not null,               -- full Resume object incl. design + sectionDesigns
  schema_version int not null,
  version int not null default 1,    -- optimistic concurrency
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  resume_id uuid references public.resumes(id) on delete set null,
  title text not null,
  data jsonb not null,
  schema_version int not null,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null,               -- company, role, link, status, notes, linked ids
  status text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.style_presets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  section_type text,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- AI usage counter for shared-key quotas
create table if not exists public.ai_usage (
  owner_id uuid references public.profiles(id) on delete cascade,
  day date not null default current_date,
  calls int not null default 0,
  primary key (owner_id, day)
);
```

### Document-style storage (important)

Treat Postgres like a document database here:

- Each resume, cover letter, job and preset is **one JSON document** in its `data jsonb` column, exactly the object the app already uses (personal info, sections, items, design, `sectionDesigns`).
- **Do not normalize** it into separate tables for sections, items or design settings. Adding or changing fields in the app must not require a database migration; only `schemaVersion` + the app's migration functions handle shape changes.
- Normal columns (`owner_id`, `title`, `status`, `updated_at`, `version`) exist only for security, listing, sorting and conflict checks. Keep `title` in sync with `data.title` on save.
- Save whole documents (load → edit in memory → save). If a partial update is ever needed, use a SQL function with `jsonb_set`, not extra tables.
- Add a GIN index on `data` only if a feature searches inside documents (e.g. finding resumes by skill tag). Not needed for v1.

Also include:

- Indexes on `owner_id` (and `updated_at desc`) for every user table.
- A trigger setting `updated_at = now()` on update.
- **`handle_new_user()`** trigger on `auth.users` insert: creates the profile; sets `status = 'approved'` if the email is in `invites` (and marks the invite used), otherwise `pending`. The very first user ever created becomes `admin` + `approved` (owner bootstrap).
- **`is_approved()`** and **`is_admin()`** helper functions (`security definer`, `stable`, fixed `search_path`) reading the caller's own profile.
- **`admin_member_stats()`**: `security definer`, admin-only (raises if not `is_admin()`), returns per member: email, name, status, role, created_at, last_seen_at, **counts** of resumes / letters / jobs, AI calls this month. Never returns document content.
- **`increment_ai_usage()`**: `security definer`, increments the caller's row for today and returns the new count.
- A size guard: a check constraint or trigger rejecting `data` larger than ~1 MB per row (photos belong in Storage, not jsonb).

---

## 4. Row-Level Security (the core of privacy)

Enable RLS on **every** table above. Policies:

| Table | Policy |
|---|---|
| `profiles` | user reads/updates **own** row, but cannot change `status`, `role` or `ai_shared_key_allowed` (enforce with a trigger or a column-level check). Admin reads all and updates `status`, `role`, `ai_shared_key_allowed`. |
| `invites` | admin only (select/insert/delete). |
| `resumes`, `cover_letters`, `jobs`, `style_presets` | `owner_id = auth.uid() and is_approved()` for select, insert, update, delete. **No admin bypass.** |
| `ai_usage` | user reads own rows; writes only through `increment_ai_usage()`. |

Rules:

- The admin (owner) **cannot read friends' resumes or letters**. The admin page only sees counts through `admin_member_stats()`.
- Pending or blocked users can sign in but see only a "Waiting for approval" / "Account blocked" screen, and RLS returns nothing for them.
- `insert` policies use `with check (owner_id = auth.uid())` so nobody can write into another user's space.

### Storage

- Bucket `user-files`, **private**.
- Path convention: `<user_id>/photos/<file>`, `<user_id>/imports/<file>`.
- Policies on `storage.objects`: allowed only when `(storage.foldername(name))[1] = auth.uid()::text and is_approved()`.
- Limits: photos ≤ 2 MB (jpeg/png/webp), imports ≤ 10 MB (pdf/docx/txt/png/jpg). Enforce in the bucket settings and in the UI.
- Display photos with short-lived signed URLs. For PDF export, fetch the photo and embed it as bytes so the PDF never contains an expiring URL.

---

## 5. Auth and approval flow

- Sign up / sign in with **email + password**. Turn **off** "Confirm email" in Supabase (its built-in mailer only sends to project team members at a very low rate). The admin approval is the gate instead.
- Optional later: Google sign-in. Not required.
- Password reset: needs working email. Document that the owner must configure custom SMTP (e.g. a free transactional mail provider) to enable it; until then, the admin can reset a member's password from the Supabase dashboard.
- Route protection (Next.js middleware/proxy per the installed version's docs):
  - Not signed in → `/login`.
  - Signed in, `pending` → `/pending`.
  - Signed in, `blocked` → `/blocked`.
  - `/admin` → admins only.
  - Public pages: `/login`, `/signup`, `/pending`, `/blocked`, a short landing page.
- Never trust the client for status or role checks: the server side and RLS both enforce them.

Pages to add:

- `/login`, `/signup` (name, email, password; message that the account needs approval unless invited).
- `/pending`, `/blocked`.
- `/account`: display name, change password, **export all my data (JSON)**, **delete my account** (deletes all rows, Storage files and the auth user via a server route using a secure RPC; confirm by typing the email).
- `/admin` (§7).

---

## 6. Data layer refactor

Replace direct IndexedDB access with a **repository interface** so the UI does not care where data lives:

```ts
// src/lib/data/repository.ts
interface Repository {
  listResumes(): Promise<ResumeSummary[]>;
  getResume(id: string): Promise<Resume>;
  createResume(r: Resume): Promise<Resume>;
  saveResume(r: Resume, expectedVersion: number): Promise<{ version: number }>;
  deleteResume(id: string): Promise<void>;
  // same for cover letters, jobs, presets
}
```

- `SupabaseRepository` is the implementation for the deployed app.
- Keep `LocalRepository` (current IndexedDB code) working for `pnpm dev` without Supabase env vars, so the app still runs offline locally.
- Dashboard lists use summary columns only (`id, title, updated_at`), not full `data`.

Saving:

- Keep the current debounced autosave (~500 ms) and undo/redo in memory.
- `saveResume` updates only where `version = expectedVersion`, then increments it. On a mismatch (same resume edited in two tabs or devices), show a dialog: **Keep mine** (overwrite) / **Load latest** / **Duplicate mine as a copy**.
- Save status in the top bar: "Saving…", "Saved", "Offline – changes kept on this device", "Couldn't save – retry".
- Keep a small IndexedDB cache of unsaved edits per resume so a network drop or closed tab never loses work; flush on reconnect.

Validation:

- Validate `data` with the existing zod schemas before every write and after every read; run the `schemaVersion` migrations on read and save back the upgraded version.

Owner's existing data:

- On first sign-in, if local IndexedDB data exists, offer **"Import my local resumes into my account"**. Upload each resume / letter / job / preset, move data-URL photos into Storage, rewrite references, then offer to clear local data. Also accept the existing JSON backup file.

Duplicate, JSON export/import, and resume-to-letter links must keep working with database ids (remap ids on import and duplicate, as the section-design spec already requires for overrides).

---

## 7. Admin page (`/admin`)

- **Members table** from `admin_member_stats()`: name, email, status, role, joined, last seen, number of resumes / letters / jobs, AI calls this month.
- Actions: **Approve**, **Block / Unblock**, **Make admin / Remove admin** (never remove the last admin), **Allow shared AI key** toggle.
- **Invites**: add emails (one or many), list, revoke.
- A pending-count badge in the nav for admins.
- No way to open or read a member's documents.

---

## 8. AI in multi-user mode

All AI calls still go through the server route (`/api/ai`). Two modes, combinable:

1. **Bring your own key (default).** Each user enters their own key in `/account`. Store it **only in that browser** (localStorage, wrapped in try/catch), send it with each request, never log it, never store it in the database.
2. **Owner's shared key (optional).** If `AI_API_KEY` is set on the server and the admin enabled `ai_shared_key_allowed` for that member, the route uses the server key. Before calling the provider, the route checks the session, `is_approved()`, the flag, and `increment_ai_usage()` against `AI_DAILY_LIMIT_PER_USER`; over the limit returns a clear "Daily AI limit reached" message.

Route rules:

- Reject unauthenticated or non-approved callers (401/403).
- Cap request size (e.g. 30 KB of resume + job text) and output length.
- Basic rate limit per user (e.g. 10 calls per minute).
- Keep the existing no-fabrication prompt rules.
- If neither a personal key nor shared access exists, hide AI UI as before.

---

## 9. Security checklist and self-check

Add `supabase/security_check.sh`: given the project URL and **anon key only**, it tries to read every table and list the Storage bucket as an anonymous visitor, and fails with `❌ LEAK` if anything comes back. Every table must return no rows.

Also add a short **Security** section to the README:

- Run `security_check.sh` before inviting anyone, and after every schema change.
- In the Supabase dashboard: RLS **enabled** on all tables; `user-files` bucket is **Private**.
- The `service_role` key never appears in the repo, client code or Cloudflare public variables.
- Rotate keys in Supabase → Project Settings → API if a secret was ever committed.
- Approved members are trusted people; only approve friends you know.

App-level:

- Sanitize TipTap HTML (allow-list: `p, ul, ol, li, strong, em, a[href]`) on load and before render; links get `rel="noopener noreferrer"` and only `http(s)`/`mailto` URLs.
- Never render user HTML with raw `dangerouslySetInnerHTML` without the sanitizer.
- Security headers via Next config: `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`, and a CSP that allows the Supabase URL.
- No analytics, no third-party trackers (keeps the original privacy promise).

---

## 10. Deployment (free)

1. **Supabase:** create the project (EU region) → SQL Editor → run `supabase/schema.sql` → Auth → disable "Confirm email" → Storage → confirm `user-files` is private.
2. **Owner bootstrap:** deploy, sign up first (becomes admin automatically), then add friends' emails as invites.
3. **Cloudflare:** set up `@opennextjs/cloudflare` (`wrangler.jsonc`, `open-next.config.ts`, build and deploy scripts in `package.json`), add environment variables, deploy, and connect the GitHub repo for automatic deploys on push.
4. **Supabase Auth URL settings:** set Site URL and redirect URLs to the deployed domain.
5. Run `security_check.sh` against the live project.

README must document: local dev without Supabase (local mode), local dev with Supabase, deploy steps, inviting friends, the security check, and free-tier notes (a Supabase free project pauses after about a week without activity and must be resumed from the dashboard; storage and database have size caps, so photos stay small).

---

## 11. Build order

1. Read the existing code; list where IndexedDB is used. Introduce the `Repository` interface with `LocalRepository`; app behaves exactly as before.
2. `supabase/schema.sql` (tables, triggers, helpers, RLS, Storage policies) + `security_check.sh`.
3. Supabase clients (browser + server), auth pages, route protection, pending/blocked screens.
4. `SupabaseRepository`: resumes first, with versioned autosave and conflict dialog; then letters, jobs, presets.
5. Photos and imports to Storage; signed URLs; PDF embedding of photo bytes.
6. "Import my local data" flow.
7. `/account` (export, delete account) and `/admin` (members, approvals, invites, AI toggle).
8. AI route modes, quotas, rate limits.
9. Sanitization, security headers, README.
10. Cloudflare deploy, live security check, end-to-end test with two accounts.

After each step: typecheck, lint, tests, and `pnpm build` with zero errors before moving on.

---

## 12. Tests

- Unit: repository mapping, version conflict handling, HTML sanitizer, AI quota logic.
- RLS tests (SQL or scripted with two test users + anon): user A cannot select, update or delete user B's resumes, letters, jobs, presets or files; pending users see nothing; members cannot promote themselves; admin cannot read member documents; `admin_member_stats()` fails for non-admins.
- Playwright end-to-end: sign up → pending screen → admin approves → create resume → edit design → reload (data persists) → download PDF → second account cannot see it.

---

## 13. Acceptance criteria

- A friend can sign up, sees "Waiting for approval", and gets full access once approved; invited emails are approved automatically.
- Each user sees only their own resumes, letters, jobs, presets and files, enforced by RLS (verified by tests and `security_check.sh`).
- The owner can approve, block, promote, invite and see usage counts, but cannot read anyone's documents.
- Every existing feature (templates, per-section design, PDF export, ATS check, import, cover letters, job tracker, undo/redo) works unchanged for every user.
- Edits survive reloads and switching devices; two tabs editing the same resume trigger the conflict dialog instead of silently overwriting.
- A user can export all their data and delete their account completely.
- AI works with a personal key, or with the shared key within the daily limit when the admin allows it.
- The app runs locally without Supabase (local mode) and deploys to Cloudflare for free.

---

## 14. Things NOT to do

- Don't put the `service_role` key in the app, the repo or any `NEXT_PUBLIC_` variable.
- Don't add an admin bypass to document RLS policies.
- Don't store photos or files as base64 inside `jsonb`.
- Don't split resumes into relational tables (sections, items, design); keep one JSON document per resume.
- Don't switch to another database (MongoDB, Firestore) without asking; Supabase is chosen for built-in auth, RLS and storage.
- Don't store users' personal AI keys in the database or logs.
- Don't move PDF generation to the server; it stays client-side.
- Don't remove local mode or the JSON export/import.
- Don't add analytics or tracking scripts.
