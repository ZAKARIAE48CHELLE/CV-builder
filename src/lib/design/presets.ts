import { SectionDesign, HeadingDesignSchema } from "./types";
import { SectionType } from "../schema";

export interface StylePreset {
  id: string;
  name: string;
  description?: string;
  applicableTypes: SectionType[];
  overrides: Partial<SectionDesign>;
}

export const BUILT_IN_PRESETS: StylePreset[] = [
  // Experience presets
  {
    id: "exp-classic-stacked",
    name: "Classic Stacked",
    description: "Title, subtitle, and dates on separate lines",
    applicableTypes: ["experience", "education", "volunteering"],
    overrides: {
      arrangement: { mode: "list", gridColumns: 2, inlineSeparator: "bullet", tagStyle: "soft", tagRadius: 4 },
      entry: { layout: "stacked", order: "title-first", dateColumnWidth: 25, datePosition: "below-title", locationPosition: "with-subtitle", titleWeight: 700, subtitleStyle: "normal", showLink: "icon" },
      description: { bulletStyle: "disc", bulletColor: "text", indent: 12, bulletSpacing: 2, showDescription: true },
    },
  },
  {
    id: "exp-date-right",
    name: "Date on Right",
    description: "Title & company on left, right-aligned date range",
    applicableTypes: ["experience", "education", "projects", "certifications", "volunteering"],
    overrides: {
      arrangement: { mode: "list", gridColumns: 2, inlineSeparator: "bullet", tagStyle: "soft", tagRadius: 4 },
      entry: { layout: "title-date-row", order: "title-first", dateColumnWidth: 25, datePosition: "right", locationPosition: "with-subtitle", titleWeight: 600, subtitleStyle: "normal", showLink: "icon" },
    },
  },
  {
    id: "exp-date-column",
    name: "Date Column",
    description: "Dedicated left column for employment dates",
    applicableTypes: ["experience", "education"],
    overrides: {
      arrangement: { mode: "list", gridColumns: 2, inlineSeparator: "bullet", tagStyle: "soft", tagRadius: 4 },
      entry: { layout: "date-left-column", order: "title-first", dateColumnWidth: 25, datePosition: "left", locationPosition: "with-date", titleWeight: 600, subtitleStyle: "italic", showLink: "icon" },
    },
  },
  {
    id: "exp-timeline",
    name: "Timeline Date Rail",
    description: "Vertical date rail with indicator dots beside entries",
    applicableTypes: ["experience", "education", "volunteering", "projects"],
    overrides: {
      arrangement: { mode: "timeline", gridColumns: 2, inlineSeparator: "bullet", tagStyle: "soft", tagRadius: 4 },
      entry: { layout: "title-date-row", order: "title-first", dateColumnWidth: 25, datePosition: "right", locationPosition: "with-subtitle", titleWeight: 600, subtitleStyle: "normal", showLink: "icon" },
    },
  },
  {
    id: "exp-compact-single-line",
    name: "Compact Single-Line",
    description: "Role, company, location and date on one flowing line",
    applicableTypes: ["experience", "education", "projects", "certifications"],
    overrides: {
      arrangement: { mode: "list", gridColumns: 2, inlineSeparator: "bullet", tagStyle: "soft", tagRadius: 4 },
      entry: { layout: "single-line", order: "title-first", dateColumnWidth: 25, datePosition: "inline", locationPosition: "with-subtitle", titleWeight: 600, subtitleStyle: "normal", showLink: "icon" },
      spacing: { marginTop: 0, marginBottom: 8, itemSpacing: 3, paddingX: 0, lineHeight: 1.25 },
    },
  },

  // Skills presets
  {
    id: "skills-tags",
    name: "Pill Tags",
    description: "Modern soft bubble badges for skills and tags",
    applicableTypes: ["skills", "interests", "languages"],
    overrides: {
      arrangement: { mode: "tags", gridColumns: 2, inlineSeparator: "bullet", tagStyle: "soft", tagRadius: 4 },
    },
  },
  {
    id: "skills-filled-tags",
    name: "Filled Chips",
    description: "Solid high-contrast accent chips",
    applicableTypes: ["skills", "interests"],
    overrides: {
      arrangement: { mode: "tags", gridColumns: 2, inlineSeparator: "bullet", tagStyle: "filled", tagRadius: 12 },
    },
  },
  {
    id: "skills-comma-list",
    name: "Comma Separated List",
    description: "Compact single line separated by commas",
    applicableTypes: ["skills", "interests", "languages"],
    overrides: {
      arrangement: { mode: "inline", gridColumns: 2, inlineSeparator: "comma", tagStyle: "soft", tagRadius: 4 },
    },
  },
  {
    id: "skills-bullet-inline",
    name: "Bullet Inline",
    description: "Flowing horizontal line separated by subtle bullets",
    applicableTypes: ["skills", "interests", "languages"],
    overrides: {
      arrangement: { mode: "inline", gridColumns: 2, inlineSeparator: "bullet", tagStyle: "soft", tagRadius: 4 },
    },
  },
  {
    id: "skills-2col-grid",
    name: "2-Column Grid",
    description: "Clean two-column structured layout",
    applicableTypes: ["skills", "languages", "certifications", "awards"],
    overrides: {
      arrangement: { mode: "grid", gridColumns: 2, inlineSeparator: "bullet", tagStyle: "soft", tagRadius: 4 },
    },
  },
  {
    id: "skills-3col-grid",
    name: "3-Column Grid",
    description: "Dense 3-column items distribution",
    applicableTypes: ["skills", "languages", "certifications", "interests"],
    overrides: {
      arrangement: { mode: "grid", gridColumns: 3, inlineSeparator: "bullet", tagStyle: "soft", tagRadius: 4 },
    },
  },
  {
    id: "skills-with-level-dots",
    name: "With Level Dots",
    description: "Proficiency ratings displayed as filled 5-dots",
    applicableTypes: ["skills", "languages"],
    overrides: {
      arrangement: { mode: "grid", gridColumns: 2, inlineSeparator: "bullet", tagStyle: "soft", tagRadius: 4 },
      level: { display: "dots", max: 5, labels: ["Basic", "Intermediate", "Proficient", "Fluent", "Native"] },
    },
  },

  // Languages presets
  {
    id: "lang-inline-level-text",
    name: "Inline with Level Text",
    description: "Language name followed by proficiency badge (e.g. Fluent, Native)",
    applicableTypes: ["languages"],
    overrides: {
      arrangement: { mode: "inline", gridColumns: 2, inlineSeparator: "pipe", tagStyle: "soft", tagRadius: 4 },
      level: { display: "text", max: 5, labels: ["Basic", "Conversational", "Proficient", "Fluent", "Native"] },
    },
  },
  {
    id: "lang-grid-bars",
    name: "Grid with Progress Bars",
    description: "Two-column grid with horizontal proficiency bars",
    applicableTypes: ["languages", "skills"],
    overrides: {
      arrangement: { mode: "grid", gridColumns: 2, inlineSeparator: "bullet", tagStyle: "soft", tagRadius: 4 },
      level: { display: "bar", max: 5, labels: ["Basic", "Conversational", "Proficient", "Fluent", "Native"] },
    },
  },
];

const LOCAL_STORAGE_PRESETS_KEY = "folio_user_custom_presets_v1";

export function getCustomPresets(): StylePreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PRESETS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveCustomPreset(preset: StylePreset) {
  if (typeof window === "undefined") return;
  try {
    const current = getCustomPresets();
    const updated = [preset, ...current.filter((p) => p.id !== preset.id)];
    localStorage.setItem(LOCAL_STORAGE_PRESETS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save custom preset:", e);
  }
}

export function deleteCustomPreset(presetId: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getCustomPresets();
    const updated = current.filter((p) => p.id !== presetId);
    localStorage.setItem(LOCAL_STORAGE_PRESETS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to delete custom preset:", e);
  }
}
