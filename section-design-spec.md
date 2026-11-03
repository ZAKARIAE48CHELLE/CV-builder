# Add-on Spec: Per-Section Design Controls

This file extends `resume-builder-spec.md`. Read that file first. Everything here **adds to or replaces** the "Design" parts of the original spec (§4 `DesignSettings`, §5.2 Design tab, §6 Templates).

**Goal:** every section of the resume, including the header/personal info, can be styled individually: orientation/arrangement, spacing, typography, heading style, bullets, dates, columns and page breaks. Global settings still exist and act as defaults.

---

## 1. Core concept: 3-level style inheritance

```
Template defaults  →  Global design (whole resume)  →  Section overrides
```

- Each template ships default values for every design property.
- **Global design** changes apply to all sections unless a section overrides that property.
- **Section overrides** store only the properties the user changed (a `Partial`), so changing a global value still affects every section that hasn't overridden it.
- One pure function resolves the final style:

```ts
// src/lib/design/resolve.ts
function resolveSectionDesign(
  templateDefaults: SectionDesign,
  global: GlobalDesign,
  sectionType: SectionType,
  overrides?: Partial<SectionDesign>
): SectionDesign
```

Templates must **never hardcode** spacing, orientation, sizes or styles. They render only from resolved design values. Templates may still define their own structure (e.g. sidebar placement, header band) and their own defaults.

Write unit tests for `resolveSectionDesign` covering: no overrides, partial overrides, global change propagating to non-overridden sections, and reset.

---

## 2. Data model changes

Add to `Resume`:

```ts
type Resume = {
  // ...existing fields
  design: GlobalDesign;                         // replaces DesignSettings
  headerDesign?: Partial<HeaderDesign>;         // personal info overrides
  sectionDesigns: Record<string, Partial<SectionDesign>>; // key = section.id
};
```

Keep `GlobalDesign` = the original `DesignSettings` (page size, margins, layout, base font, colors, etc.) **plus** a full `SectionDesign` used as the default for all sections:

```ts
type GlobalDesign = DesignSettings & { sectionDefaults: SectionDesign };
```

Bump `schemaVersion` and add a migration (old resumes → empty `sectionDesigns`, `sectionDefaults` from template).

### 2.1 `SectionDesign`

```ts
type SectionDesign = {
  // ---- Heading ----
  heading: {
    visible: boolean;
    style: "plain" | "underline" | "full-rule" | "bar-left" | "box" | "accent-bg";
    case: "none" | "uppercase" | "capitalize";
    align: "left" | "center" | "right";
    fontSize: number;          // pt
    fontWeight: 400 | 500 | 600 | 700 | 800;
    letterSpacing: number;     // em, -0.05 – 0.3
    color: "accent" | "text" | string;   // hex allowed
    icon: boolean;             // small icon before heading
    ruleThickness: number;     // pt, for underline/full-rule/bar
    spacingBelow: number;      // pt
  };

  // ---- Orientation / arrangement of items ----
  arrangement: {
    mode: "list" | "inline" | "grid" | "tags" | "timeline";
    // list:     items stacked vertically (default for experience, education)
    // inline:   items on one flowing line with a separator (skills, interests)
    // grid:     N columns of items (skills, languages, certifications)
    // tags:     pill/bubble chips (skills, interests)
    // timeline: vertical date rail with dots (experience, education)
    gridColumns: 1 | 2 | 3 | 4;
    inlineSeparator: "comma" | "bullet" | "pipe" | "slash" | "space";
    tagStyle: "outline" | "filled" | "soft";
    tagRadius: number;         // px-equivalent
  };

  // ---- Item header layout (entries like jobs, degrees, projects) ----
  entry: {
    layout:
      | "stacked"          // Title / Subtitle / Date on separate lines
      | "title-date-row"   // Title ......... Date   (subtitle below)
      | "two-line-split"   // Title ... Date  /  Subtitle ... Location
      | "date-left-column" // Date in a narrow left column, content on the right
      | "single-line";     // Title, Subtitle, Location, Date on one line
    order: "title-first" | "subtitle-first";   // role vs company first
    dateColumnWidth: number;   // % for date-left-column
    datePosition: "right" | "below-title" | "inline" | "left";
    locationPosition: "with-date" | "with-subtitle" | "hidden";
    titleWeight: 400 | 500 | 600 | 700;
    subtitleStyle: "normal" | "italic" | "accent" | "muted";
    showLink: "icon" | "text" | "hidden";
  };

  // ---- Description / bullets ----
  description: {
    bulletStyle: "disc" | "dash" | "arrow" | "square" | "check" | "numbered" | "none";
    bulletColor: "accent" | "text";
    indent: number;            // pt
    bulletSpacing: number;     // pt between bullets
    showDescription: boolean;
  };

  // ---- Levels (skills, languages) ----
  level: {
    display: "none" | "text" | "dots" | "bar" | "stars";
    max: 3 | 5;
    labels: string[];          // e.g. ["Basic","Intermediate","Fluent","Native"]
  };

  // ---- Spacing ----
  spacing: {
    marginTop: number;         // pt, before section
    marginBottom: number;      // pt, after section
    itemSpacing: number;       // pt, between items
    paddingX: number;          // pt, inner horizontal padding
    lineHeight: number;        // 1.0 – 1.8
  };

  // ---- Typography (section-level) ----
  typography: {
    fontFamily: "inherit" | string;
    fontSizeScale: number;     // 0.8 – 1.3 relative to base
    textAlign: "left" | "justify";
    color: "inherit" | string;
  };

  // ---- Box / background ----
  container: {
    background: "none" | "soft-accent" | string;
    border: "none" | "left-accent" | "full";
    radius: number;
  };

  // ---- Placement & pagination ----
  placement: {
    column: "main" | "side";   // only for 2-column layouts
    widthOverride?: number;    // % (e.g. full-width section inside 2-col layout)
    fullWidth: boolean;        // span both columns (e.g. Summary on top)
    pageBreakBefore: boolean;
    keepTogether: boolean;     // avoid splitting across pages
  };

  // ---- Dates ----
  dates: {
    format: "inherit" | "MMM YYYY" | "MMMM YYYY" | "MM/YYYY" | "YYYY";
    separator: "–" | "-" | "to";
    presentLabel: string;      // "Present", "Now", "Current"
  };
};
```

Not every property applies to every section type. Define an applicability map so the UI only shows relevant controls:

```ts
// src/lib/design/applicability.ts
const APPLICABLE: Record<SectionType, (keyof SectionDesign)[]> = {
  summary:        ["heading","spacing","typography","container","placement"],
  experience:     ["heading","arrangement","entry","description","spacing","typography","container","placement","dates"],
  education:      ["heading","arrangement","entry","description","spacing","typography","container","placement","dates"],
  projects:       ["heading","arrangement","entry","description","spacing","typography","container","placement","dates"],
  skills:         ["heading","arrangement","level","spacing","typography","container","placement"],
  languages:      ["heading","arrangement","level","spacing","typography","container","placement"],
  interests:      ["heading","arrangement","spacing","typography","container","placement"],
  certifications: ["heading","arrangement","entry","spacing","typography","container","placement","dates"],
  // ...fill the rest sensibly; custom = everything
};
```

Also restrict `arrangement.mode` options per type (e.g. no `tags` for experience, no `timeline` for skills).

### 2.2 `HeaderDesign` (personal info block)

```ts
type HeaderDesign = {
  align: "left" | "center" | "right";
  layout: "stacked" | "name-left-contact-right" | "banner";  // banner = colored band
  nameSize: number;           // pt
  nameWeight: 400 | 500 | 600 | 700 | 800;
  nameCase: "none" | "uppercase";
  jobTitleSize: number;
  jobTitleColor: "accent" | "text" | "muted";
  contactArrangement: "row" | "column" | "grid-2" | "grid-3";
  contactSeparator: "bullet" | "pipe" | "none";
  contactIcons: boolean;
  iconStyle: "outline" | "filled";
  photo: {
    show: boolean;
    shape: "circle" | "rounded" | "square";
    size: number;             // pt
    position: "left" | "right" | "top";
    border: boolean;
  };
  background: "none" | "accent" | "soft-accent" | string;
  spacingBelow: number;
  placement: "top-full-width" | "sidebar";   // 2-column layouts
};
```

---

## 3. Editor UI

### 3.1 Design tab structure
Split the Design tab into sub-tabs:

1. **Global**: page, layout, margins, base font, colors, plus "Section defaults" (the same controls as §3.2, applying to all sections).
2. **Header**: all `HeaderDesign` controls.
3. **Sections**: list of all sections in current order. Selecting one opens its panel.

### 3.2 Section design panel
Grouped, collapsible control groups in this order: Heading, Arrangement, Entry layout, Bullets, Levels, Spacing, Typography, Box, Placement, Dates. Show only applicable groups.

Controls to use:
- Segmented buttons with small visual icons for layout choices (arrangement mode, entry layout, alignment, heading style). Each option shows a mini diagram, not just text.
- Sliders **with numeric input** for all numbers (spacing, sizes, line height, columns).
- Color: "Accent / Text / Custom" + color picker.
- Toggles for booleans.

Per control and per group:
- A small **dot indicator** when the value is overridden (differs from global).
- **Reset** icon to remove that override (falls back to global).

Panel-level actions:
- **Reset section to global**.
- **Copy style** / **Paste style** (to another section of the same or compatible type).
- **Apply to all sections of this type**.
- **Make this the global default** (promote section values to `sectionDefaults`).

### 3.3 Click-to-select in preview
- Hovering a section in the live preview shows an outline and its name.
- Clicking it selects that section, switches the left panel to Design → Sections → that section, and scrolls the panel there.
- Clicking the header selects Header design.
- Selected section keeps a subtle outline in the preview (never in the PDF).

### 3.4 Quick controls (optional, nice to have)
A floating mini-toolbar above the selected section in the preview with the most-used controls: arrangement mode, spacing −/+, heading style, column (main/side), move up/down.

---

## 4. Rendering requirements

- Build reusable render primitives driven by resolved design, used by **both** the HTML preview and the react-pdf renderer:
  - `<SectionHeading design />`
  - `<ItemsArrangement mode columns separator>` (list / inline / grid / tags / timeline)
  - `<EntryHeader layout order datePosition ...>`
  - `<BulletList style indent spacing>`
  - `<LevelIndicator display max>`
  - `<HeaderBlock design>`
- Preview and PDF must stay visually identical for every combination. Add a dev-only `/dev/design-matrix` page that renders one sample resume with many combinations side by side (HTML vs PDF) to catch drift.
- `grid`, `tags` and `inline` must wrap correctly in react-pdf (use flexbox `flexWrap: "wrap"`).
- `timeline` draws a thin vertical line with dots aligned to each entry; it must not break awkwardly across pages.
- `keepTogether` maps to react-pdf `wrap={false}` on the section; `pageBreakBefore` maps to `break`.
- `fullWidth` sections in 2-column layouts render above the columns in document order.
- ATS safety: arrangement and decoration must not change the underlying text reading order. Inline separators must be real characters in the text layer. Icons are decorative only (no text replacement). Tags must still extract as readable words.
- Show an **ATS warning badge** (non-blocking) when the user picks risky options: icons replacing labels, very small font (< 8.5 pt), text as image, or level bars without text labels.

---

## 5. Presets

Offer per-section **style presets** in a dropdown at the top of each section panel, each just a `Partial<SectionDesign>`:

- Experience: "Classic stacked", "Date on right", "Date column", "Timeline", "Compact single-line".
- Skills: "Comma list", "Bullet inline", "2-column grid", "3-column grid", "Tags", "With level dots".
- Languages: "Inline with level text", "Grid with bars".
- Headings (global): "Underlined", "Caps with rule", "Left bar", "Accent box", "Minimal".

Users can **save their own presets** (stored locally) and reuse them across resumes.

---

## 6. Undo/redo, persistence, performance

- Every design change is one undo step; slider drags commit one step on release.
- Overrides persist with the resume and are included in JSON export/import.
- Duplicating a resume copies all overrides (remap keys to the new section ids).
- Deleting a section deletes its override entry.
- Preview updates within ~200 ms; debounce PDF regeneration, never block typing.

---

## 7. Build order (insert after milestone 4 of the main spec)

1. `SectionDesign` / `HeaderDesign` types, zod schemas, migration, `resolveSectionDesign` + tests.
2. Refactor templates to render only through the shared primitives and resolved design.
3. Global → Section defaults UI.
4. Sections sub-tab with full controls, override dots and reset.
5. Header design.
6. Click-to-select in preview.
7. Copy/paste style, apply to all, promote to global.
8. Presets (built-in + saved).
9. Design-matrix dev page, ATS warnings, polish.

---

## 8. Acceptance criteria

- I can select **any** section (or the header) and change its arrangement, spacing, heading style, typography, bullets, dates, column and page-break behavior independently of other sections.
- Skills can switch between list, inline, grid (2–4 columns) and tags; experience can switch between stacked, date-right, date-column, single-line and timeline. The preview updates instantly.
- Changing a global value updates every section **except** those that overrode that specific property; overridden controls show a dot and can be reset individually.
- Copy/paste style and "apply to all of this type" work.
- Clicking a section in the preview opens its design panel.
- The PDF matches the preview for all options, text remains selectable, and the ATS text check keeps a logical order.
- Old saved resumes open without errors after migration.
