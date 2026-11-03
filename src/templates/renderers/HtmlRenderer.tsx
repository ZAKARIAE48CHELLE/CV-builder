"use client";

import React, { useState } from "react";
import { Resume, Section, SectionItem } from "@/lib/schema";
import { partitionSections } from "../layoutHelper";
import { getTemplateDesignDefaults } from "../registry";
import { resolveSectionDesign, resolveHeaderDesign } from "@/lib/design/resolve";
import {
  HtmlSectionHeading,
  HtmlEntryHeader,
  HtmlBulletList,
  HtmlLevelIndicator,
  HtmlArrangement,
  HtmlHeaderBlock,
} from "./primitives/htmlPrimitives";
import { ExternalLink } from "lucide-react";
import { GithubIcon } from "@/components/common/BrandIcons";

interface HtmlRendererProps {
  resume: Resume;
  selectedTarget?: { type: "header" } | { type: "section"; sectionId: string } | null;
  onSelectTarget?: (target: { type: "header" } | { type: "section"; sectionId: string }) => void;
}

export const HtmlRenderer: React.FC<HtmlRendererProps> = ({
  resume,
  selectedTarget,
  onSelectTarget,
}) => {
  const { design, personal, templateId } = resume;
  const {
    baseFontSize = 10,
    lineHeight = 1.35,
    accentColor = "#0f172a",
    textColor = "#1f2937",
    marginsMm = { top: 15, right: 15, bottom: 15, left: 15 },
    fontFamily = "inter",
    sidebarWidth = 32,
    dateFormat = "MMM YYYY",
  } = design;

  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);

  const templateDefaults = getTemplateDesignDefaults(templateId);
  const resolvedHeader = resolveHeaderDesign(
    templateDefaults.headerDefaults,
    design,
    resume.headerDesign
  );

  const { fullWidthSections, mainSections, sideSections, isTwoColumn, sidebarPosition } =
    partitionSections(resume);

  // Font family CSS
  const getFontFamilyCss = (font = fontFamily) => {
    switch (font) {
      case "roboto":
        return "'Roboto', sans-serif";
      case "lato":
        return "'Lato', sans-serif";
      case "merriweather":
        return "'Merriweather', serif";
      case "lora":
        return "'Lora', serif";
      case "eb-garamond":
        return "'EB Garamond', serif";
      case "plex-mono":
        return "'Courier New', Courier, monospace";
      case "inter":
      default:
        return "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    }
  };

  const containerStyle: React.CSSProperties = {
    fontFamily: getFontFamilyCss(fontFamily),
    fontSize: `${baseFontSize}pt`,
    lineHeight: lineHeight,
    color: textColor,
    paddingTop: `${marginsMm.top}mm`,
    paddingRight: `${marginsMm.right}mm`,
    paddingBottom: `${marginsMm.bottom}mm`,
    paddingLeft: `${marginsMm.left}mm`,
    minHeight: design.pageSize === "Letter" ? "279.4mm" : "297mm",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
    position: "relative",
  };

  const renderSectionItem = (
    item: SectionItem,
    resolvedSection: ReturnType<typeof resolveSectionDesign>,
    idx: number,
    totalItems: number = 1
  ) => {
    if (item.visible === false) return null;

    const { arrangement, entry, description, level, dates, spacing } = resolvedSection;
    const isTimeline = arrangement.mode === "timeline";

    // Tags mode arrangement: render item as chips/tags
    if (arrangement.mode === "tags") {
      const tagsToRender = item.tags && item.tags.length > 0 ? item.tags : item.title ? [item.title] : [];
      const tagBg =
        arrangement.tagStyle === "filled"
          ? accentColor
          : arrangement.tagStyle === "soft"
          ? `${accentColor}18`
          : "transparent";
      const tagTextColor =
        arrangement.tagStyle === "filled" ? "#ffffff" : accentColor;
      const tagBorder =
        arrangement.tagStyle === "outline" ? `1px solid ${accentColor}` : undefined;

      return (
        <div key={item.id} className="my-1.5">
          {item.title && item.tags && item.tags.length > 0 && (
            <div className="text-[0.9em] font-semibold text-neutral-900 mb-1">
              {item.title}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {tagsToRender.map((tag, tIdx) => (
              <span
                key={tIdx}
                className="inline-flex items-center px-2 py-0.5 text-[0.82em] font-medium"
                style={{
                  backgroundColor: tagBg,
                  color: tagTextColor,
                  border: tagBorder,
                  borderRadius: `${arrangement.tagRadius}px`,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      );
    }

    // Inline mode
    if (arrangement.mode === "inline") {
      const sep =
        arrangement.inlineSeparator === "comma"
          ? ", "
          : arrangement.inlineSeparator === "pipe"
          ? " | "
          : arrangement.inlineSeparator === "slash"
          ? " / "
          : arrangement.inlineSeparator === "space"
          ? " "
          : " • ";

      const hasTags = item.tags && item.tags.length > 0;
      const tagsText = hasTags ? item.tags?.join(sep) : "";
      const isCategorized = Boolean(item.title && (hasTags || item.subtitle));

      if (isCategorized) {
        // Structured row layout for categorized items: Title on the left, items flowed on the right
        return (
          <div
            key={item.id}
            className="w-full flex flex-col sm:flex-row sm:items-baseline text-[0.92em] py-0.5"
          >
            <span className="font-bold text-neutral-900 shrink-0 sm:w-44 pr-2">
              {item.title}:
            </span>
            <div className="flex-1 flex flex-wrap items-baseline text-neutral-700">
              <span>{hasTags ? tagsText : item.subtitle}</span>
              {typeof item.level === "number" && item.level > 0 && (
                <span className="ml-2">
                  <HtmlLevelIndicator level={item.level} design={level} accentColor={accentColor} />
                </span>
              )}
            </div>
          </div>
        );
      }

      // Compact inline list for items without category breakdown
      const isGithub = item.link ? /github\.com/i.test(item.link) : false;
      const inlineTextContent = item.title || item.subtitle || tagsText;
      const inlineNode = item.link ? (
        <a
          href={item.link.startsWith("http") ? item.link : `https://${item.link}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium hover:underline"
          style={{ color: accentColor }}
        >
          <span>{inlineTextContent}</span>
          {isGithub ? (
            <GithubIcon className="w-3 h-3 inline shrink-0" />
          ) : (
            <ExternalLink className="w-3 h-3 inline shrink-0" />
          )}
        </a>
      ) : (
        <span className="font-medium text-neutral-800">{inlineTextContent}</span>
      );

      return (
        <span key={item.id} className="inline-flex items-center text-[0.92em] py-0.5">
          {inlineNode}
          {typeof item.level === "number" && item.level > 0 && (
            <span className="ml-1">
              <HtmlLevelIndicator level={item.level} design={level} accentColor={accentColor} />
            </span>
          )}
          {idx < totalItems - 1 && (
            <span className="mx-2 text-neutral-400 font-normal select-none">
              {sep}
            </span>
          )}
        </span>
      );
    }

    // Standard / Timeline / Grid item
    return (
      <div
        key={item.id}
        className={`relative ${isTimeline ? "pl-4 ml-1 border-l-2" : ""}`}
        style={{
          marginBottom: `${spacing.itemSpacing}pt`,
          borderColor: isTimeline ? accentColor : undefined,
        }}
      >
        {isTimeline && (
          <span
            className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ring-2 ring-white"
            style={{ backgroundColor: accentColor }}
          />
        )}

        <HtmlEntryHeader
          item={item}
          entryDesign={entry}
          datesDesign={dates}
          dateFormat={dateFormat}
          accentColor={accentColor}
          baseFontSize={baseFontSize}
        />

        <HtmlBulletList
          htmlDescription={item.description}
          design={description}
          accentColor={accentColor}
          textColor={textColor}
        />

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.tags.map((tag, tIdx) => (
              <span
                key={tIdx}
                className="inline-block px-1.5 py-0.5 rounded text-[0.8em] font-medium"
                style={{
                  backgroundColor: `${accentColor}12`,
                  color: accentColor,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {typeof item.level === "number" && item.level > 0 && (
          <div className="mt-1">
            <HtmlLevelIndicator level={item.level} design={level} accentColor={accentColor} />
          </div>
        )}
      </div>
    );
  };

  const renderSection = (section: Section) => {
    if (section.visible === false) return null;

    const sectionOverrides = resume.sectionDesigns?.[section.id];
    const resolvedSection = resolveSectionDesign(
      templateDefaults.sectionDefaults,
      design,
      section.type,
      sectionOverrides
    );

    const isSelected = selectedTarget?.type === "section" && selectedTarget.sectionId === section.id;
    const isHovered = hoveredSectionId === section.id;

    const containerBg =
      resolvedSection.container.background === "soft-accent"
        ? `${accentColor}0c`
        : resolvedSection.container.background !== "none"
        ? resolvedSection.container.background
        : undefined;

    const containerBorder =
      resolvedSection.container.border === "left-accent"
        ? `3px solid ${accentColor}`
        : resolvedSection.container.border === "full"
        ? `1px solid ${accentColor}44`
        : undefined;

    return (
      <section
        key={section.id}
        onClick={(e) => {
          e.stopPropagation();
          onSelectTarget?.({ type: "section", sectionId: section.id });
        }}
        onMouseEnter={() => setHoveredSectionId(section.id)}
        onMouseLeave={() => setHoveredSectionId(null)}
        style={{
          marginTop: `${resolvedSection.spacing.marginTop}pt`,
          marginBottom: `${resolvedSection.spacing.marginBottom}pt`,
          paddingLeft: `${resolvedSection.spacing.paddingX}pt`,
          paddingRight: `${resolvedSection.spacing.paddingX}pt`,
          lineHeight: resolvedSection.spacing.lineHeight,
          fontFamily:
            resolvedSection.typography.fontFamily !== "inherit"
              ? getFontFamilyCss(resolvedSection.typography.fontFamily)
              : undefined,
          fontSize: `${baseFontSize * resolvedSection.typography.fontSizeScale}pt`,
          textAlign: resolvedSection.typography.textAlign,
          color:
            resolvedSection.typography.color !== "inherit"
              ? resolvedSection.typography.color
              : textColor,
          backgroundColor: containerBg,
          border: containerBorder,
          borderRadius: `${resolvedSection.container.radius}px`,
        }}
        className={`break-inside-avoid relative group transition-all cursor-pointer rounded-xs ${
          resolvedSection.placement.pageBreakBefore ? "break-before-page" : ""
        } ${
          isSelected
            ? "ring-2 ring-blue-500 ring-offset-2"
            : isHovered
            ? "ring-1 ring-blue-400/50"
            : ""
        }`}
      >
        {/* Subtle hover badge for click-to-select */}
        {isHovered && !isSelected && (
          <span className="absolute -top-3.5 right-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-600 text-white shadow-xs z-10 select-none">
            Click to edit style
          </span>
        )}

        <HtmlSectionHeading
          heading={section.heading}
          design={resolvedSection.heading}
          iconKey={section.icon}
          accentColor={accentColor}
          textColor={textColor}
        />

        <HtmlArrangement
          mode={resolvedSection.arrangement.mode}
          gridColumns={resolvedSection.arrangement.gridColumns}
          inlineSeparator={resolvedSection.arrangement.inlineSeparator}
          tagStyle={resolvedSection.arrangement.tagStyle}
          tagRadius={resolvedSection.arrangement.tagRadius}
          accentColor={accentColor}
          itemSpacing={resolvedSection.spacing.itemSpacing}
        >
          {section.items.map((item, idx) =>
            renderSectionItem(item, resolvedSection, idx, section.items.length)
          )}
        </HtmlArrangement>
      </section>
    );
  };

  const isHeaderSelected = selectedTarget?.type === "header";

  return (
    <div style={containerStyle} className="resume-container select-text">
      {/* 1. Header Block */}
      <HtmlHeaderBlock
        personal={personal}
        design={resolvedHeader}
        accentColor={accentColor}
        textColor={textColor}
        baseFontSize={baseFontSize}
        onClick={() => onSelectTarget?.({ type: "header" })}
        isSelected={isHeaderSelected}
      />

      {/* 2. Full-width sections (above two columns if any) */}
      {fullWidthSections.length > 0 && (
        <div className="w-full">
          {fullWidthSections.map((s) => renderSection(s))}
        </div>
      )}

      {/* 3. Main and side sections layout */}
      {isTwoColumn ? (
        <div
          className={`flex gap-6 ${
            sidebarPosition === "left" ? "flex-row" : "flex-row-reverse"
          }`}
        >
          {/* Side column */}
          <div style={{ width: `${sidebarWidth}%` }} className="shrink-0">
            {sideSections.map((s) => renderSection(s))}
          </div>

          {/* Main column */}
          <div className="flex-1 min-w-0">
            {mainSections.map((s) => renderSection(s))}
          </div>
        </div>
      ) : (
        <div className="w-full">
          {mainSections.map((s) => renderSection(s))}
        </div>
      )}
    </div>
  );
};
