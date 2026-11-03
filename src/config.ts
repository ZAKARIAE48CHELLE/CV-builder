export const APP_NAME = "Folio";
export const APP_TAGLINE = "Local-first, ATS-friendly resume & cover letter builder";
export const SCHEMA_VERSION = 2;

export const AVAILABLE_FONTS = [
  { id: "inter", name: "Inter (Modern Sans)", family: "var(--font-inter, 'Inter', sans-serif)", pdfFamily: "Helvetica" },
  { id: "roboto", name: "Roboto (Clean Sans)", family: "'Roboto', sans-serif", pdfFamily: "Helvetica" },
  { id: "lato", name: "Lato (Warm Sans)", family: "'Lato', sans-serif", pdfFamily: "Helvetica" },
  { id: "merriweather", name: "Merriweather (Editorial Serif)", family: "'Merriweather', serif", pdfFamily: "Times-Roman" },
  { id: "lora", name: "Lora (Contemporary Serif)", family: "'Lora', serif", pdfFamily: "Times-Roman" },
  { id: "eb-garamond", name: "EB Garamond (Classic Serif)", family: "'EB Garamond', serif", pdfFamily: "Times-Roman" },
  { id: "plex-mono", name: "IBM Plex Mono (Monospace)", family: "'Courier New', Courier, monospace", pdfFamily: "Courier" },
];

export const COLOR_PALETTES = [
  { name: "Slate", hex: "#0f172a" },
  { name: "Navy", hex: "#1e3a8a" },
  { name: "Teal", hex: "#0f766e" },
  { name: "Emerald", hex: "#047857" },
  { name: "Burgundy", hex: "#881337" },
  { name: "Indigo", hex: "#4338ca" },
  { name: "Charcoal", hex: "#27272a" },
  { name: "Amber", hex: "#b45309" },
];

export const DEFAULT_DESIGN: import("./lib/schema").DesignSettings = {
  layout: "one-column",
  sidebarWidth: 32,
  fontFamily: "inter",
  baseFontSize: 10,
  lineHeight: 1.35,
  accentColor: "#0f172a",
  textColor: "#1f2937",
  headingStyle: "underline",
  marginsMm: { top: 15, right: 15, bottom: 15, left: 15 },
  sectionSpacing: 14,
  pageSize: "A4",
  dateFormat: "MMM YYYY",
  showPhoto: false,
  showIcons: true,
  showSectionIcons: true,
};
