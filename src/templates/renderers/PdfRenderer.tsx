import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Link,
  StyleSheet,
} from "@react-pdf/renderer";
import { Resume, Section, SectionItem } from "@/lib/schema";
import { partitionSections } from "../layoutHelper";
import { getPdfFontFamily } from "@/lib/pdf/fonts";
import { getTemplateDesignDefaults } from "../registry";
import { resolveSectionDesign, resolveHeaderDesign } from "@/lib/design/resolve";
import {
  PdfSectionHeading,
  PdfEntryHeader,
  PdfBulletList,
  PdfLevelIndicator,
  PdfHeaderBlock,
} from "./primitives/pdfPrimitives";
import { PdfSectionIcon } from "./PdfSectionIcon";

interface PdfRendererProps {
  resume: Resume;
}

const mmToPt = (mm: number) => mm * 2.83465;

export const PdfResumeDocument: React.FC<PdfRendererProps> = ({ resume }) => {
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

  const pdfFont = getPdfFontFamily(fontFamily);
  const templateDefaults = getTemplateDesignDefaults(templateId);

  const resolvedHeader = resolveHeaderDesign(
    templateDefaults.headerDefaults,
    design,
    resume.headerDesign
  );

  const { fullWidthSections, mainSections, sideSections, isTwoColumn, sidebarPosition } =
    partitionSections(resume);

  const styles = StyleSheet.create({
    page: {
      fontFamily: pdfFont,
      fontSize: baseFontSize,
      color: textColor,
      paddingTop: mmToPt(marginsMm.top),
      paddingRight: mmToPt(marginsMm.right),
      paddingBottom: mmToPt(marginsMm.bottom),
      paddingLeft: mmToPt(marginsMm.left),
      backgroundColor: "#ffffff",
    },
    twoColumnContainer: {
      flexDirection: sidebarPosition === "left" ? "row" : "row-reverse",
      gap: 16,
    },
    sideCol: {
      width: `${sidebarWidth}%`,
    },
    mainCol: {
      flex: 1,
    },
  });

  const renderSectionItem = (
    item: SectionItem,
    resolvedSection: ReturnType<typeof resolveSectionDesign>,
    idx: number,
    totalItems: number = 0
  ) => {
    if (item.visible === false) return null;

    const { arrangement, entry, description, level, dates, spacing } = resolvedSection;
    const isTimeline = arrangement.mode === "timeline";

    // Tags mode
    if (arrangement.mode === "tags") {
      const tagsToRender = item.tags && item.tags.length > 0 ? item.tags : item.title ? [item.title] : [];
      const tagBg =
        arrangement.tagStyle === "filled"
          ? accentColor
          : arrangement.tagStyle === "soft"
          ? "#f3f4f6"
          : "#ffffff";
      const tagTextColor =
        arrangement.tagStyle === "filled" ? "#ffffff" : "#374151";
      const tagBorderColor =
        arrangement.tagStyle === "outline" ? "#d1d5db" : "transparent";

      return (
        <View key={item.id} style={{ marginVertical: 3 }}>
          {item.title && item.tags && item.tags.length > 0 && (
            <Text style={{ fontSize: baseFontSize * 0.95, fontWeight: "bold", color: "#111827", marginBottom: 3 }}>
              {item.title}
            </Text>
          )}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            {tagsToRender.map((tag, tIdx) => (
              <View
                key={tIdx}
                style={{
                  backgroundColor: tagBg,
                  borderWidth: arrangement.tagStyle === "outline" ? 0.75 : 0,
                  borderColor: tagBorderColor,
                  borderRadius: arrangement.tagRadius || 4,
                  paddingHorizontal: 6,
                  paddingVertical: 2.5,
                }}
              >
                <Text style={{ fontSize: baseFontSize * 0.82, color: tagTextColor, fontWeight: "medium" }}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        </View>
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
        return (
          <View
            key={item.id}
            style={{
              flexDirection: "row",
              width: "100%",
              marginVertical: 1.5,
              alignItems: "flex-start",
            }}
          >
            <View style={{ width: 145, paddingRight: 8, flexShrink: 0 }}>
              <Text
                style={{
                  fontSize: baseFontSize * 0.95,
                  fontWeight: "bold",
                  color: "#111827",
                }}
              >
                {item.title}:
              </Text>
            </View>
            <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start" }}>
              <Text style={{ fontSize: baseFontSize * 0.92, color: "#374151", flex: 1 }}>
                {hasTags ? tagsText : item.subtitle}
              </Text>
              {typeof item.level === "number" && item.level > 0 && (
                <View style={{ marginLeft: 3 }}>
                  <PdfLevelIndicator
                    level={item.level}
                    design={level}
                    accentColor={accentColor}
                    baseFontSize={baseFontSize}
                  />
                </View>
              )}
            </View>
          </View>
        );
      }

      const linkIconSize = Math.max(7, Math.round(baseFontSize * 0.78));
      const isGithub = item.link ? /github\.com/i.test(item.link) : false;

      const inlineTextContent = item.title || item.subtitle || tagsText;
      const inlineNode = item.link ? (
        <Link
          src={item.link.startsWith("http") ? item.link : `https://${item.link}`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          <Text style={{ fontSize: baseFontSize * 0.92, color: accentColor || "#1f2937", textDecoration: "none" }}>
            {inlineTextContent}
          </Text>
          <PdfSectionIcon
            iconName={isGithub ? "Github" : "ExternalLink"}
            size={linkIconSize}
            color={accentColor || "#1f2937"}
            style={{ marginLeft: 3, marginRight: 0 }}
          />
        </Link>
      ) : (
        <Text style={{ fontSize: baseFontSize * 0.92, color: "#1f2937" }}>
          {inlineTextContent}
        </Text>
      );

      return (
        <View key={item.id} style={{ flexDirection: "row", alignItems: "center", marginRight: 4, marginVertical: 1 }}>
          {inlineNode}
          {typeof item.level === "number" && item.level > 0 && (
            <View style={{ marginLeft: 3 }}>
              <PdfLevelIndicator
                level={item.level}
                design={level}
                accentColor={accentColor}
                baseFontSize={baseFontSize}
              />
            </View>
          )}
          {idx < totalItems - 1 ? (
            <Text style={{ color: "#9ca3af", marginLeft: 4 }}>
              {sep}
            </Text>
          ) : null}
        </View>
      );
    }

    // Standard / timeline / grid item
    return (
      <View
        key={item.id}
        style={{
          marginBottom: spacing.itemSpacing,
          paddingLeft: isTimeline ? 10 : 0,
          borderLeftWidth: isTimeline ? 1.5 : 0,
          borderLeftColor: isTimeline ? accentColor : "transparent",
          position: "relative",
        }}
        wrap={resolvedSection.placement.keepTogether ? false : undefined}
      >
        {isTimeline && (
          <View
            style={{
              position: "absolute",
              left: -3,
              top: 3,
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: accentColor,
            }}
          />
        )}

        <PdfEntryHeader
          item={item}
          entryDesign={entry}
          datesDesign={dates}
          dateFormat={dateFormat}
          accentColor={accentColor}
          baseFontSize={baseFontSize}
        />

        <PdfBulletList
          htmlDescription={item.description}
          design={description}
          accentColor={accentColor}
          textColor={textColor}
          baseFontSize={baseFontSize}
        />

        {item.tags && item.tags.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3, marginTop: 2 }}>
            {item.tags.map((tag, tIdx) => (
              <View
                key={tIdx}
                style={{
                  backgroundColor: `${accentColor}18`,
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                  borderRadius: 2,
                }}
              >
                <Text style={{ fontSize: baseFontSize * 0.78, color: accentColor }}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}

        {typeof item.level === "number" && item.level > 0 && (
          <View style={{ marginTop: 2 }}>
            <PdfLevelIndicator
              level={item.level}
              design={level}
              accentColor={accentColor}
              baseFontSize={baseFontSize}
            />
          </View>
        )}
      </View>
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

    const isGrid = resolvedSection.arrangement.mode === "grid";
    const isInline = resolvedSection.arrangement.mode === "inline";
    const gridCols = resolvedSection.arrangement.gridColumns || 2;
    const colWidth = `${100 / gridCols}%`;

    const containerBg =
      resolvedSection.container.background === "soft-accent"
        ? `${accentColor}10`
        : resolvedSection.container.background !== "none"
        ? resolvedSection.container.background
        : undefined;

    const containerBorder =
      resolvedSection.container.border === "left-accent"
        ? { borderLeftWidth: 3, borderLeftColor: accentColor, paddingLeft: 4 }
        : resolvedSection.container.border === "full"
        ? { borderWidth: 1, borderColor: `${accentColor}44`, padding: 4 }
        : {};

    return (
      <View
        key={section.id}
        style={{
          marginTop: resolvedSection.spacing.marginTop,
          marginBottom: resolvedSection.spacing.marginBottom,
          paddingLeft: resolvedSection.spacing.paddingX,
          paddingRight: resolvedSection.spacing.paddingX,
          backgroundColor: containerBg,
          ...containerBorder,
        }}
        wrap={!resolvedSection.placement.keepTogether}
        break={resolvedSection.placement.pageBreakBefore}
      >
        <PdfSectionHeading
          heading={section.heading}
          design={resolvedSection.heading}
          iconKey={section.icon}
          accentColor={accentColor}
          textColor={textColor}
        />

        {isGrid ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {section.items.map((item, idx) => (
              <View key={item.id} style={{ width: colWidth, paddingRight: 6 }}>
                {renderSectionItem(item, resolvedSection, idx, section.items.length)}
              </View>
            ))}
          </View>
        ) : isInline ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline" }}>
            {section.items.map((item, idx) =>
              renderSectionItem(item, resolvedSection, idx, section.items.length)
            )}
          </View>
        ) : (
          <View>
            {section.items.map((item, idx) =>
              renderSectionItem(item, resolvedSection, idx, section.items.length)
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Document title={`${personal.fullName || "Resume"} - ${resume.title}`}>
      <Page size={design.pageSize === "Letter" ? "LETTER" : "A4"} style={styles.page}>
        {/* Header Block */}
        <PdfHeaderBlock
          personal={personal}
          design={resolvedHeader}
          accentColor={accentColor}
          textColor={textColor}
          baseFontSize={baseFontSize}
        />

        {/* Full width sections */}
        {fullWidthSections.length > 0 && (
          <View>{fullWidthSections.map((s) => renderSection(s))}</View>
        )}

        {/* Multi-column vs single column */}
        {isTwoColumn ? (
          <View style={styles.twoColumnContainer}>
            <View style={styles.sideCol}>
              {sideSections.map((s) => renderSection(s))}
            </View>
            <View style={styles.mainCol}>
              {mainSections.map((s) => renderSection(s))}
            </View>
          </View>
        ) : (
          <View>{mainSections.map((s) => renderSection(s))}</View>
        )}
      </Page>
    </Document>
  );
};
