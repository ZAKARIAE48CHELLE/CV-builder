import { z } from "zod";

export const DesignSettingsSchema = z.object({
  layout: z.enum(["one-column", "two-column-left", "two-column-right"]).default("one-column"),
  sidebarWidth: z.number().min(20).max(50).default(32),
  fontFamily: z.string().default("inter"),
  baseFontSize: z.number().min(8).max(14).default(10),
  lineHeight: z.number().min(1.0).max(2.0).default(1.35),
  accentColor: z.string().default("#0f172a"),
  textColor: z.string().default("#1f2937"),
  headingStyle: z.enum(["underline", "caps", "bar", "plain"]).default("underline"),
  marginsMm: z.object({
    top: z.number().min(5).max(30).default(15),
    right: z.number().min(5).max(30).default(15),
    bottom: z.number().min(5).max(30).default(15),
    left: z.number().min(5).max(30).default(15),
  }).default({ top: 15, right: 15, bottom: 15, left: 15 }),
  sectionSpacing: z.number().min(4).max(32).default(14),
  pageSize: z.enum(["A4", "Letter"]).default("A4"),
  dateFormat: z.enum(["MMM YYYY", "MM/YYYY", "YYYY"]).default("MMM YYYY"),
  showPhoto: z.boolean().default(false),
  showIcons: z.boolean().default(true),
  showSectionIcons: z.boolean().default(true),
});

export type DesignSettings = z.infer<typeof DesignSettingsSchema>;

export const HeadingDesignSchema = z.object({
  visible: z.boolean().default(true),
  style: z.enum(["plain", "underline", "full-rule", "bar-left", "box", "accent-bg"]).default("underline"),
  case: z.enum(["none", "uppercase", "capitalize"]).default("none"),
  align: z.enum(["left", "center", "right"]).default("left"),
  fontSize: z.number().min(8).max(24).default(11.5),
  fontWeight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700), z.literal(800)]).default(700),
  letterSpacing: z.number().min(-0.05).max(0.3).default(0),
  color: z.string().default("accent"),
  icon: z.boolean().default(true),
  ruleThickness: z.number().min(0.5).max(6).default(1.5),
  spacingBelow: z.number().min(0).max(24).default(6),
});

export const ArrangementDesignSchema = z.object({
  mode: z.enum(["list", "inline", "grid", "tags", "timeline"]).default("list"),
  gridColumns: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).default(2),
  inlineSeparator: z.enum(["comma", "bullet", "pipe", "slash", "space"]).default("bullet"),
  tagStyle: z.enum(["outline", "filled", "soft"]).default("soft"),
  tagRadius: z.number().min(0).max(16).default(4),
});

export const EntryDesignSchema = z.object({
  layout: z.enum(["stacked", "title-date-row", "two-line-split", "date-left-column", "single-line"]).default("title-date-row"),
  order: z.enum(["title-first", "subtitle-first"]).default("title-first"),
  dateColumnWidth: z.number().min(10).max(50).default(25),
  datePosition: z.enum(["right", "below-title", "inline", "left"]).default("right"),
  locationPosition: z.enum(["with-date", "with-subtitle", "hidden"]).default("with-subtitle"),
  titleWeight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700)]).default(600),
  subtitleStyle: z.enum(["normal", "italic", "accent", "muted"]).default("normal"),
  showLink: z.enum(["icon", "text", "hidden"]).default("icon"),
});

export const DescriptionDesignSchema = z.object({
  bulletStyle: z.enum(["disc", "dash", "arrow", "square", "check", "numbered", "none"]).default("disc"),
  bulletColor: z.enum(["accent", "text"]).default("text"),
  indent: z.number().min(0).max(36).default(12),
  bulletSpacing: z.number().min(0).max(12).default(2),
  showDescription: z.boolean().default(true),
});

export const LevelDesignSchema = z.object({
  display: z.enum(["none", "text", "dots", "bar", "stars"]).default("none"),
  max: z.union([z.literal(3), z.literal(5)]).default(5),
  labels: z.array(z.string()).default(["Basic", "Intermediate", "Proficient", "Fluent", "Native"]),
});

export const SpacingDesignSchema = z.object({
  marginTop: z.number().min(0).max(40).default(0),
  marginBottom: z.number().min(0).max(40).default(12),
  itemSpacing: z.number().min(0).max(32).default(8),
  paddingX: z.number().min(0).max(32).default(0),
  lineHeight: z.number().min(1.0).max(2.0).default(1.35),
});

export const TypographyDesignSchema = z.object({
  fontFamily: z.string().default("inherit"),
  fontSizeScale: z.number().min(0.8).max(1.3).default(1.0),
  textAlign: z.enum(["left", "justify"]).default("left"),
  color: z.string().default("inherit"),
});

export const ContainerDesignSchema = z.object({
  background: z.string().default("none"),
  border: z.enum(["none", "left-accent", "full"]).default("none"),
  radius: z.number().min(0).max(16).default(0),
});

export const PlacementDesignSchema = z.object({
  column: z.enum(["main", "side"]).default("main"),
  widthOverride: z.number().min(10).max(100).optional(),
  fullWidth: z.boolean().default(false),
  pageBreakBefore: z.boolean().default(false),
  keepTogether: z.boolean().default(false),
});

export const DatesDesignSchema = z.object({
  format: z.enum(["inherit", "MMM YYYY", "MMMM YYYY", "MM/YYYY", "YYYY"]).default("inherit"),
  separator: z.enum(["–", "-", "to"]).default("–"),
  presentLabel: z.string().default("Present"),
});

export const SectionDesignSchema = z.object({
  heading: HeadingDesignSchema,
  arrangement: ArrangementDesignSchema,
  entry: EntryDesignSchema,
  description: DescriptionDesignSchema,
  level: LevelDesignSchema,
  spacing: SpacingDesignSchema,
  typography: TypographyDesignSchema,
  container: ContainerDesignSchema,
  placement: PlacementDesignSchema,
  dates: DatesDesignSchema,
});

export type SectionDesign = z.infer<typeof SectionDesignSchema>;

export const HeaderPhotoSchema = z.object({
  show: z.boolean().default(false),
  shape: z.enum(["circle", "rounded", "square"]).default("circle"),
  size: z.number().min(24).max(120).default(50),
  position: z.enum(["left", "right", "top"]).default("right"),
  border: z.boolean().default(false),
});

export const HeaderDesignSchema = z.object({
  align: z.enum(["left", "center", "right"]).default("left"),
  layout: z.enum(["stacked", "name-left-contact-right", "banner"]).default("stacked"),
  nameSize: z.number().min(14).max(36).default(20),
  nameWeight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700), z.literal(800)]).default(700),
  nameCase: z.enum(["none", "uppercase"]).default("none"),
  nameColor: z.string().default("accent"),
  jobTitleSize: z.number().min(9).max(18).default(11.5),
  jobTitleColor: z.enum(["accent", "text", "muted"]).default("text"),
  contactArrangement: z.enum(["row", "column", "grid-2", "grid-3"]).default("row"),
  contactSeparator: z.enum(["bullet", "pipe", "none"]).default("bullet"),
  contactIcons: z.boolean().default(true),
  iconStyle: z.enum(["outline", "filled"]).default("outline"),
  photo: HeaderPhotoSchema,
  background: z.string().default("none"),
  spacingBelow: z.number().min(0).max(40).default(14),
  placement: z.enum(["top-full-width", "sidebar"]).default("top-full-width"),
});

export type HeaderDesign = z.infer<typeof HeaderDesignSchema>;

export const GlobalDesignSchema = DesignSettingsSchema.extend({
  sectionDefaults: SectionDesignSchema,
});

export type GlobalDesign = z.infer<typeof GlobalDesignSchema>;
