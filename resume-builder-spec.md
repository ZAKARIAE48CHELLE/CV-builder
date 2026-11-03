# Build Spec: Personal Resume Builder ("Folio")

You are building a personal, local-first resume builder web app. It is for a single user running it on their own machine. Use original designs, naming and copy throughout. Do not copy any existing product's templates, logos, wording or branding.

Working name: **Folio** (easy to rename via one constant in `src/config.ts`).

---

## 1. Goals

- Create, edit and maintain multiple resumes (and cover letters) with a live side-by-side preview.
- Export clean, **text-based, ATS-readable PDFs** with selectable text and embedded fonts.
- Customize templates fully: fonts, colors, spacing, section order, layout (1 or 2 columns).
- Import an existing resume (PDF / DOCX / pasted text) and auto-fill sections.
- Optional AI assistance (bring-your-own API key).
- All data stays local. No account, no backend database, no tracking.

## 2. Non-goals

- No user accounts, payments, sharing links, or analytics.
- No server-side storage. (A tiny local API route is allowed only for AI proxying.)

---

## 3. Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui components |
| State | Zustand with persistence middleware |
| Storage | IndexedDB via `idb-keyval` (fallback: localStorage) |
| Forms | react-hook-form + zod schemas |
| Drag & drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Rich text (bullets) | TipTap (bold, italic, links, bullet lists only) |
| PDF export | `@react-pdf/renderer` (produces real text PDFs, not images) |
| PDF import | `pdfjs-dist` (text extraction) |
| DOCX import | `mammoth` |
| Image import (optional) | `tesseract.js` OCR |
| Icons | `lucide-react` |
| Tests | Vitest + React Testing Library; Playwright for one end-to-end flow |

Package manager: pnpm. Node 20+.

---

## 4. Data model (zod schemas in `src/lib/schema.ts`)

```ts
type Resume = {
  id: string;
  title: string;            // internal name, e.g. "Data Analyst – Booking.com"
  createdAt: string;
  updatedAt: string;
  templateId: string;
  design: DesignSettings;
  personal: PersonalInfo;
  sections: Section[];      // ordered; order = render order
};

type PersonalInfo = {
  fullName: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  photo?: string;           // data URL, optional
  extraLinks?: { label: string; url: string }[];
};

type SectionType =
  | "summary" | "experience" | "education" | "skills" | "projects"
  | "languages" | "certifications" | "awards" | "publications"
  | "volunteering" | "interests" | "references" | "custom";

type Section = {
  id: string;
  type: SectionType;
  heading: string;          // user-editable, e.g. "Work Experience"
  visible: boolean;
  column?: "main" | "side"; // for 2-column layouts
  items: SectionItem[];
};

type SectionItem = {
  id: string;
  visible: boolean;
  title?: string;           // role / degree / project name / skill group
  subtitle?: string;        // company / school
  location?: string;
  startDate?: string;       // "YYYY-MM" or free text
  endDate?: string;         // "Present" allowed
  link?: string;
  description?: string;     // TipTap HTML (bullets)
  tags?: string[];          // skills, tech stack
  level?: number;           // 1–5 for languages/skills (optional display)
};

type DesignSettings = {
  layout: "one-column" | "two-column-left" | "two-column-right";
  sidebarWidth: number;     // % for two-column
  fontFamily: string;       // from bundled font list
  baseFontSize: number;     // pt, 9–12
  lineHeight: number;       // 1.1–1.6
  accentColor: string;      // hex
  textColor: string;
  headingStyle: "underline" | "caps" | "bar" | "plain";
  marginsMm: { top: number; right: number; bottom: number; left: number };
  sectionSpacing: number;   // pt
  pageSize: "A4" | "Letter";
  dateFormat: "MMM YYYY" | "MM/YYYY" | "YYYY";
  showPhoto: boolean;
  showIcons: boolean;       // contact icons
};

type CoverLetter = {
  id: string;
  title: string;
  linkedResumeId?: string;  // reuse personal info + design
  recipient: { name?: string; company?: string; address?: string };
  date: string;
  body: string;             // TipTap HTML
  design: DesignSettings;
};
```

Include a `schemaVersion` field on the persisted store and a migration function so later changes don't break saved data.

---

## 5. Screens & UX

### 5.1 Dashboard (`/`)
- Grid of resume cards (thumbnail, title, last edited).
- Actions per card: Open, Duplicate, Rename, Delete (with confirm), Export JSON.
- Buttons: **New resume** (blank or from template), **Import resume**, **New cover letter**.
- Tabs: Resumes | Cover letters.

### 5.2 Editor (`/resume/[id]`)
Split view: **left = editor panel**, **right = live preview** (A4/Letter page rendering, zoom 50–150%, page breaks visible).

Left panel has three tabs:
1. **Content**
   - Personal info form.
   - Collapsible section cards, drag to reorder sections and items.
   - Add section menu (all `SectionType`s + custom).
   - Per item: eye toggle (hide without deleting), duplicate, delete.
   - Rich-text bullets with a character counter.
2. **Design**
   - Template picker (thumbnails).
   - Layout, column assignment per section (drag between "Main" and "Side").
   - Font, size, line height, colors (preset palette + custom picker), heading style, margins, spacing, page size, date format, photo/icon toggles.
   - "Reset to template defaults" button.
3. **AI** (only if an API key is configured; see §8)

Top bar: resume title (inline editable), undo/redo, save status ("Saved locally"), **Download PDF**, more menu (Export JSON, Duplicate, Settings).

Autosave on every change (debounced ~500 ms). Undo/redo with a 50-step history.

### 5.3 Cover letter editor (`/cover-letter/[id]`)
Same split layout. Option to pull header/design from a linked resume.

### 5.4 Settings (`/settings`)
- AI provider + API key (stored locally, masked).
- Default page size, date format, language.
- Backup: **Export all data (JSON)** / **Import backup**.
- Danger zone: clear all data.

---

## 6. Templates

Build **8 original templates** as React components that render from the same `Resume` data in two targets:
- HTML preview (for speed while editing), and
- `@react-pdf/renderer` document (for export).

To avoid drift, create a shared layout description layer (`src/templates/<id>/layout.ts`) that both renderers consume, or render the preview from the react-pdf tree using its browser PDF viewer if performance allows. Pick one approach and keep preview and PDF visually identical.

Suggested originals (names and looks are ours):
1. **Plain** – one column, minimal, maximal ATS safety.
2. **Ledger** – one column, thin accent rules under headings.
3. **Margin** – two column, left sidebar for contact/skills/languages.
4. **Mono** – one column, monochrome, strong typographic hierarchy.
5. **Split** – two column, right sidebar, accent header band.
6. **Compact** – dense one-column for long experience on one page.
7. **Serif** – classic serif typography, centered header.
8. **Timeline** – experience shown with a vertical date rail.

Bundle 6–8 open-license fonts (e.g. Inter, Source Sans 3, Lato, Roboto, IBM Plex Sans, Merriweather, Lora, EB Garamond) as local font files registered with react-pdf.

---

## 7. PDF export requirements

- Must be text-based (selectable, searchable). Never rasterize the page.
- Fonts embedded. Links clickable.
- Respect page size and margins; handle multi-page with sensible breaks (don't split a heading from its first item; allow splitting long item descriptions).
- Filename: `<FullName>_<ResumeTitle>.pdf` (sanitized).
- Add a "Check ATS readability" helper: extract the text of the generated PDF with pdfjs and show it in a modal so the user can see what a parser sees.

---

## 8. AI features (optional, bring-your-own-key)

Provider-agnostic interface `src/lib/ai/provider.ts` with an adapter for at least one provider (configurable model name). Calls go through a local Next.js API route so the key isn't exposed in client bundles. If no key is set, hide all AI UI.

Features:
- **Improve bullet**: rewrite one bullet to be action-oriented and quantified. Show diff and Accept / Reject.
- **Generate summary** from experience + target role.
- **Tailor to job**: paste a job description, get suggested keyword additions and a per-section suggestions list (never auto-apply; user accepts each).
- **Grammar & spelling check** for the whole resume.
- **Translate** the resume into another language, producing a **new duplicated resume**.
- **Cover letter draft** from resume + job description.

Rule: AI never fabricates employers, dates, degrees or metrics. Prompts must instruct the model to use only facts present in the resume and to mark placeholders like `[X%]` where a number is needed.

---

## 9. Import

- Accept PDF, DOCX, TXT, or pasted text (images optional via OCR).
- Extract raw text, then parse into sections with heuristics (common heading keywords, date patterns, email/phone/URL regexes).
- If AI is configured, offer "Parse with AI" for better structuring into the zod schema (validate the output).
- Always show a **review screen** before creating the resume so the user can fix mis-parsed fields.

---

## 10. Extras (build after core is solid)

- **Job tracker** (`/jobs`): kanban columns Wishlist → Applied → Interview → Offer → Rejected. Card fields: company, role, link, date, notes, linked resume/cover letter version.
- Keyboard shortcuts: Ctrl/Cmd+S (download PDF), Ctrl/Cmd+Z / Shift+Z (undo/redo).
- Dark mode for the app UI (the resume preview stays as printed).

---

## 11. Project structure

```
src/
  app/
    page.tsx                 # dashboard
    resume/[id]/page.tsx
    cover-letter/[id]/page.tsx
    jobs/page.tsx
    settings/page.tsx
    api/ai/route.ts
  components/
    editor/  preview/  design/  dashboard/  ui/
  templates/
    plain/ ledger/ margin/ mono/ split/ compact/ serif/ timeline/
    registry.ts
  lib/
    schema.ts  store.ts  storage.ts  migrations.ts
    pdf/  import/  ai/
  config.ts                  # APP_NAME etc.
public/fonts/
```

---

## 12. Build order (milestones)

1. Scaffold project, schema, store, IndexedDB persistence, dashboard CRUD.
2. Content editor (all section types, drag-and-drop, rich-text bullets, hide/duplicate).
3. One template ("Plain") with live HTML preview + react-pdf export that match.
4. Design panel (all `DesignSettings`) wired into the template.
5. Remaining 7 templates + two-column column assignment.
6. JSON export/import backup, duplicate resume, undo/redo.
7. Import from PDF/DOCX/text with review screen.
8. Cover letters.
9. AI features.
10. Job tracker, shortcuts, dark mode, polish.

After each milestone: run typecheck, lint and tests; fix failures before moving on.

---

## 13. Acceptance criteria

- I can create a resume from scratch, fill every section type, reorder sections/items, and hide items.
- Changing any design setting updates the preview within ~200 ms.
- The downloaded PDF matches the preview, text is selectable, links work, and the ATS text-check shows content in a logical reading order.
- Data survives a browser refresh and app restart; JSON backup restores everything.
- Importing a typical one-page PDF resume pre-fills name, contact info, experience and education with the review screen.
- With no AI key set, the app is fully usable and shows no AI UI.
- `pnpm build` succeeds with zero TypeScript errors.

## 14. Run instructions to include in README

```
pnpm install
pnpm dev        # http://localhost:3000
pnpm build && pnpm start
pnpm test
```
