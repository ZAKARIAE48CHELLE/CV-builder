import { SectionType } from "../schema";
import { SectionDesign, HeaderDesign, GlobalDesign } from "./types";
import { DEFAULT_SECTION_DESIGN, DEFAULT_HEADER_DESIGN } from "./defaults";

/**
 * Deep merges section design across 3 levels:
 * 1. Template defaults
 * 2. Global design (global.sectionDefaults)
 * 3. Section overrides (Partial<SectionDesign>)
 *
 * Then applies token inheritances (e.g. "inherit" fontFamily falls back to global.fontFamily,
 * "accent" color resolves to global.accentColor, etc.)
 */
export function resolveSectionDesign(
  templateDefaults: SectionDesign = DEFAULT_SECTION_DESIGN,
  global: GlobalDesign,
  sectionType: SectionType,
  overrides?: Partial<SectionDesign>
): SectionDesign {
  const g = global.sectionDefaults || DEFAULT_SECTION_DESIGN;
  const o = overrides || {};

  // Deep merge each subgroup
  const heading = {
    ...templateDefaults.heading,
    ...g.heading,
    ...(o.heading || {}),
  };

  const arrangement = {
    ...templateDefaults.arrangement,
    ...g.arrangement,
    ...(o.arrangement || {}),
  };

  const entry = {
    ...templateDefaults.entry,
    ...g.entry,
    ...(o.entry || {}),
  };

  const description = {
    ...templateDefaults.description,
    ...g.description,
    ...(o.description || {}),
  };

  const level = {
    ...templateDefaults.level,
    ...g.level,
    ...(o.level || {}),
    labels: o.level?.labels || g.level?.labels || templateDefaults.level.labels,
  };

  const spacing = {
    ...templateDefaults.spacing,
    ...g.spacing,
    ...(o.spacing || {}),
  };

  const typography = {
    ...templateDefaults.typography,
    ...g.typography,
    ...(o.typography || {}),
  };

  const container = {
    ...templateDefaults.container,
    ...g.container,
    ...(o.container || {}),
  };

  const placement = {
    ...templateDefaults.placement,
    ...g.placement,
    ...(o.placement || {}),
  };

  const dates = {
    ...templateDefaults.dates,
    ...g.dates,
    ...(o.dates || {}),
  };

  // Resolve inheritance & color tokens
  const resolvedHeadingColor =
    heading.color === "accent"
      ? global.accentColor
      : heading.color === "text"
      ? global.textColor
      : heading.color;

  const resolvedBulletColor =
    description.bulletColor === "accent"
      ? global.accentColor
      : global.textColor;

  const resolvedFontFamily =
    typography.fontFamily === "inherit" || !typography.fontFamily
      ? global.fontFamily
      : typography.fontFamily;

  const resolvedTextColor =
    typography.color === "inherit" || !typography.color
      ? global.textColor
      : typography.color;

  const resolvedDateFormat =
    dates.format === "inherit" || !dates.format
      ? global.dateFormat
      : dates.format;

  return {
    heading: {
      ...heading,
      color: resolvedHeadingColor,
    },
    arrangement,
    entry,
    description: {
      ...description,
      bulletColor: resolvedBulletColor as "accent" | "text",
    },
    level,
    spacing,
    typography: {
      ...typography,
      fontFamily: resolvedFontFamily,
      color: resolvedTextColor,
    },
    container,
    placement,
    dates: {
      ...dates,
      format: resolvedDateFormat,
    },
  };
}

/**
 * Resolves header design across:
 * 1. Template defaults
 * 2. Global design fallbacks (photo toggle, contact icons toggle)
 * 3. Header overrides
 */
export function resolveHeaderDesign(
  templateDefaults: HeaderDesign = DEFAULT_HEADER_DESIGN,
  global: GlobalDesign,
  overrides?: Partial<HeaderDesign>
): HeaderDesign {
  const o = overrides || {};

  const mergedPhoto = {
    ...templateDefaults.photo,
    show: global.showPhoto ?? templateDefaults.photo.show,
    ...(o.photo || {}),
  };

  const merged: HeaderDesign = {
    ...templateDefaults,
    contactIcons: global.showIcons ?? templateDefaults.contactIcons,
    ...o,
    photo: mergedPhoto,
  };

  const resolvedNameColor =
    merged.nameColor === "accent" || !merged.nameColor
      ? global.accentColor
      : merged.nameColor === "text"
      ? global.textColor
      : merged.nameColor;

  return {
    ...merged,
    nameColor: resolvedNameColor,
  };
}

/**
 * Checks if a specific section property is overridden compared to global defaults.
 */
export function isPropertyOverridden<T extends keyof SectionDesign, K extends keyof SectionDesign[T]>(
  group: T,
  prop: K,
  overrides?: Partial<SectionDesign>,
  globalDefaults?: SectionDesign
): boolean {
  if (!overrides || !overrides[group]) return false;
  const groupOverrides = overrides[group] as any;
  if (groupOverrides[prop] === undefined) return false;

  if (!globalDefaults) return true;
  const defaultVal = (globalDefaults[group] as any)?.[prop];
  return groupOverrides[prop] !== defaultVal;
}

/**
 * Checks if any property in a given subgroup is overridden.
 */
export function isGroupOverridden<T extends keyof SectionDesign>(
  group: T,
  overrides?: Partial<SectionDesign>,
  globalDefaults?: SectionDesign
): boolean {
  if (!overrides || !overrides[group]) return false;
  const groupOverrides = overrides[group] as any;
  const keys = Object.keys(groupOverrides);
  if (keys.length === 0) return false;

  if (!globalDefaults) return true;
  const defaults = globalDefaults[group] as any;
  return keys.some((k) => groupOverrides[k] !== undefined && groupOverrides[k] !== defaults?.[k]);
}
