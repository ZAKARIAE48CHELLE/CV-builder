import { SectionDesign, HeaderDesign } from "@/lib/schema";
import { DEFAULT_SECTION_DESIGN, DEFAULT_HEADER_DESIGN } from "@/lib/design/defaults";

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  badge?: string;
  defaultLayout: "one-column" | "two-column-left" | "two-column-right";
  recommendedFont: string;
  previewThumbnail: string;
  sectionDefaults?: Partial<SectionDesign>;
  headerDefaults?: Partial<HeaderDesign>;
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "plain",
    name: "Plain",
    description: "Ultra-clean single column layout engineered for maximum ATS parser compatibility.",
    badge: "ATS Optimal",
    defaultLayout: "one-column",
    recommendedFont: "inter",
    previewThumbnail: "plain",
    sectionDefaults: {
      heading: {
        ...DEFAULT_SECTION_DESIGN.heading,
        style: "plain",
      },
    },
  },
  {
    id: "ledger",
    name: "Ledger",
    description: "Refined single column with modern accent divider rules under headings.",
    badge: "Popular",
    defaultLayout: "one-column",
    recommendedFont: "inter",
    previewThumbnail: "ledger",
    sectionDefaults: {
      heading: {
        ...DEFAULT_SECTION_DESIGN.heading,
        style: "full-rule",
        ruleThickness: 2,
      },
    },
  },
  {
    id: "margin",
    name: "Margin",
    description: "Two-column design with a distinct left sidebar for personal details, skills, and languages.",
    badge: "Balanced",
    defaultLayout: "two-column-left",
    recommendedFont: "roboto",
    previewThumbnail: "margin",
    headerDefaults: {
      ...DEFAULT_HEADER_DESIGN,
      layout: "name-left-contact-right",
    },
  },
  {
    id: "mono",
    name: "Mono",
    description: "Striking black & white technical aesthetic with bold typographic hierarchy.",
    badge: "Technical",
    defaultLayout: "one-column",
    recommendedFont: "plex-mono",
    previewThumbnail: "mono",
    sectionDefaults: {
      heading: {
        ...DEFAULT_SECTION_DESIGN.heading,
        style: "full-rule",
        case: "uppercase",
        letterSpacing: 0.08,
      },
      typography: {
        ...DEFAULT_SECTION_DESIGN.typography,
        fontFamily: "plex-mono",
      },
    },
  },
  {
    id: "split",
    name: "Split",
    description: "Modern two-column design with an accent header banner and right sidebar.",
    badge: "Modern",
    defaultLayout: "two-column-right",
    recommendedFont: "lato",
    previewThumbnail: "split",
    headerDefaults: {
      ...DEFAULT_HEADER_DESIGN,
      layout: "banner",
      background: "accent",
    },
  },
  {
    id: "compact",
    name: "Compact",
    description: "High-density single-column format engineered to fit extensive careers cleanly into fewer pages.",
    badge: "High Density",
    defaultLayout: "one-column",
    recommendedFont: "inter",
    previewThumbnail: "compact",
    sectionDefaults: {
      spacing: {
        ...DEFAULT_SECTION_DESIGN.spacing,
        marginBottom: 8,
        itemSpacing: 4,
      },
      entry: {
        ...DEFAULT_SECTION_DESIGN.entry,
        layout: "single-line",
      },
    },
  },
  {
    id: "serif",
    name: "Serif",
    description: "Sophisticated editorial serif typography with dignified centered header.",
    badge: "Classic",
    defaultLayout: "one-column",
    recommendedFont: "merriweather",
    previewThumbnail: "serif",
    headerDefaults: {
      ...DEFAULT_HEADER_DESIGN,
      align: "center",
    },
    sectionDefaults: {
      heading: {
        ...DEFAULT_SECTION_DESIGN.heading,
        align: "center",
        style: "full-rule",
      },
      entry: {
        ...DEFAULT_SECTION_DESIGN.entry,
        subtitleStyle: "italic",
      },
    },
  },
  {
    id: "timeline",
    name: "Timeline",
    description: "Visual career progression featuring an elegant vertical date rail alongside experience.",
    badge: "Visual",
    defaultLayout: "one-column",
    recommendedFont: "inter",
    previewThumbnail: "timeline",
    sectionDefaults: {
      arrangement: {
        ...DEFAULT_SECTION_DESIGN.arrangement,
        mode: "timeline",
      },
    },
  },
];

export function getTemplateById(id: string): TemplateDefinition {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}

export function getTemplateDesignDefaults(templateId: string): {
  sectionDefaults: SectionDesign;
  headerDefaults: HeaderDesign;
} {
  const tmpl = getTemplateById(templateId);
  return {
    sectionDefaults: {
      ...DEFAULT_SECTION_DESIGN,
      ...(tmpl.sectionDefaults || {}),
      heading: {
        ...DEFAULT_SECTION_DESIGN.heading,
        ...(tmpl.sectionDefaults?.heading || {}),
      },
      arrangement: {
        ...DEFAULT_SECTION_DESIGN.arrangement,
        ...(tmpl.sectionDefaults?.arrangement || {}),
      },
      entry: {
        ...DEFAULT_SECTION_DESIGN.entry,
        ...(tmpl.sectionDefaults?.entry || {}),
      },
      description: {
        ...DEFAULT_SECTION_DESIGN.description,
        ...(tmpl.sectionDefaults?.description || {}),
      },
      level: {
        ...DEFAULT_SECTION_DESIGN.level,
        ...(tmpl.sectionDefaults?.level || {}),
      },
      spacing: {
        ...DEFAULT_SECTION_DESIGN.spacing,
        ...(tmpl.sectionDefaults?.spacing || {}),
      },
      typography: {
        ...DEFAULT_SECTION_DESIGN.typography,
        ...(tmpl.sectionDefaults?.typography || {}),
      },
      container: {
        ...DEFAULT_SECTION_DESIGN.container,
        ...(tmpl.sectionDefaults?.container || {}),
      },
      placement: {
        ...DEFAULT_SECTION_DESIGN.placement,
        ...(tmpl.sectionDefaults?.placement || {}),
      },
      dates: {
        ...DEFAULT_SECTION_DESIGN.dates,
        ...(tmpl.sectionDefaults?.dates || {}),
      },
    },
    headerDefaults: {
      ...DEFAULT_HEADER_DESIGN,
      ...(tmpl.headerDefaults || {}),
      photo: {
        ...DEFAULT_HEADER_DESIGN.photo,
        ...(tmpl.headerDefaults?.photo || {}),
      },
    },
  };
}
