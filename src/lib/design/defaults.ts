import { SectionDesign, HeaderDesign, GlobalDesign } from "./types";
import { DEFAULT_DESIGN } from "@/config";

export const DEFAULT_SECTION_DESIGN: SectionDesign = {
  heading: {
    visible: true,
    style: "underline",
    case: "none",
    align: "left",
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: 0,
    color: "accent",
    icon: true,
    ruleThickness: 1.5,
    spacingBelow: 6,
  },
  arrangement: {
    mode: "list",
    gridColumns: 2,
    inlineSeparator: "bullet",
    tagStyle: "soft",
    tagRadius: 4,
  },
  entry: {
    layout: "title-date-row",
    order: "title-first",
    dateColumnWidth: 25,
    datePosition: "right",
    locationPosition: "with-subtitle",
    titleWeight: 600,
    subtitleStyle: "normal",
    showLink: "icon",
  },
  description: {
    bulletStyle: "disc",
    bulletColor: "text",
    indent: 12,
    bulletSpacing: 2,
    showDescription: true,
  },
  level: {
    display: "none",
    max: 5,
    labels: ["Basic", "Intermediate", "Proficient", "Fluent", "Native"],
  },
  spacing: {
    marginTop: 0,
    marginBottom: 12,
    itemSpacing: 8,
    paddingX: 0,
    lineHeight: 1.35,
  },
  typography: {
    fontFamily: "inherit",
    fontSizeScale: 1.0,
    textAlign: "left",
    color: "inherit",
  },
  container: {
    background: "none",
    border: "none",
    radius: 0,
  },
  placement: {
    column: "main",
    widthOverride: undefined,
    fullWidth: false,
    pageBreakBefore: false,
    keepTogether: false,
  },
  dates: {
    format: "inherit",
    separator: "–",
    presentLabel: "Present",
  },
};

export const DEFAULT_HEADER_DESIGN: HeaderDesign = {
  align: "left",
  layout: "stacked",
  nameSize: 20,
  nameWeight: 700,
  nameCase: "none",
  nameColor: "accent",
  jobTitleSize: 11.5,
  jobTitleColor: "text",
  contactArrangement: "row",
  contactSeparator: "bullet",
  contactIcons: true,
  iconStyle: "outline",
  photo: {
    show: false,
    shape: "circle",
    size: 50,
    position: "right",
    border: false,
  },
  background: "none",
  spacingBelow: 14,
  placement: "top-full-width",
};

export const DEFAULT_GLOBAL_DESIGN: GlobalDesign = {
  ...DEFAULT_DESIGN,
  sectionDefaults: { ...DEFAULT_SECTION_DESIGN },
};
