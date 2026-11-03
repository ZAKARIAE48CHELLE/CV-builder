import React from "react";
import { View, Text, Link, Image, StyleSheet } from "@react-pdf/renderer";
import {
  SectionItem,
  SectionDesign,
  HeaderDesign,
  PersonalInfo,
} from "@/lib/schema";
import { formatDate, htmlToPlainText } from "@/lib/utils";
import { PdfSectionIcon } from "../PdfSectionIcon";

// --------------------------------------------------------------------------
// 1. PdfSectionHeading
// --------------------------------------------------------------------------
interface PdfSectionHeadingProps {
  heading: string;
  design: SectionDesign["heading"];
  iconKey?: string;
  accentColor: string;
  textColor: string;
}

export const PdfSectionHeading: React.FC<PdfSectionHeadingProps> = ({
  heading,
  design,
  iconKey,
  accentColor,
}) => {
  if (!design.visible) return null;

  const resolvedColor =
    design.color === "accent"
      ? accentColor
      : design.color === "text"
      ? "#111827"
      : design.color || accentColor;

  const textAlign = design.align || "left";
  const textTransform =
    design.case === "uppercase"
      ? "uppercase"
      : design.case === "capitalize"
      ? "capitalize"
      : "none";

  const headingText = (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {design.icon && iconKey && (
        <View style={{ marginRight: 4 }}>
          <PdfSectionIcon
            iconName={iconKey}
            size={design.fontSize * 0.95}
            color={resolvedColor}
          />
        </View>
      )}
      <Text
        style={{
          fontSize: design.fontSize,
          fontWeight: design.fontWeight >= 600 ? "bold" : "normal",
          color: resolvedColor,
          textTransform,
          letterSpacing: design.letterSpacing * 10,
        }}
      >
        {heading}
      </Text>
    </View>
  );

  if (design.style === "full-rule") {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: design.spacingBelow,
        }}
      >
        {textAlign === "right" && (
          <View
            style={{
              flex: 1,
              height: design.ruleThickness,
              backgroundColor: resolvedColor,
              opacity: 0.35,
              marginRight: 6,
            }}
          />
        )}
        {headingText}
        {textAlign !== "right" && (
          <View
            style={{
              flex: 1,
              height: design.ruleThickness,
              backgroundColor: resolvedColor,
              opacity: 0.35,
              marginLeft: 6,
            }}
          />
        )}
      </View>
    );
  }

  if (design.style === "bar-left") {
    return (
      <View
        style={{
          borderLeftWidth: design.ruleThickness * 2,
          borderLeftColor: resolvedColor,
          paddingLeft: 6,
          marginBottom: design.spacingBelow,
        }}
      >
        {headingText}
      </View>
    );
  }

  if (design.style === "box") {
    return (
      <View
        style={{
          borderWidth: 1,
          borderColor: `${resolvedColor}44`,
          backgroundColor: `${resolvedColor}12`,
          paddingHorizontal: 6,
          paddingVertical: 3,
          borderRadius: 2,
          marginBottom: design.spacingBelow,
          alignSelf: textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start",
        }}
      >
        {headingText}
      </View>
    );
  }

  if (design.style === "accent-bg") {
    return (
      <View
        style={{
          backgroundColor: resolvedColor,
          paddingHorizontal: 6,
          paddingVertical: 3,
          borderRadius: 2,
          marginBottom: design.spacingBelow,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {design.icon && iconKey && (
            <View style={{ marginRight: 4 }}>
              <PdfSectionIcon
                iconName={iconKey}
                size={design.fontSize * 0.95}
                color="#ffffff"
              />
            </View>
          )}
          <Text
            style={{
              fontSize: design.fontSize,
              fontWeight: "bold",
              color: "#ffffff",
              textTransform,
            }}
          >
            {heading}
          </Text>
        </View>
      </View>
    );
  }

  // Underline or Plain
  return (
    <View
      style={{
        borderBottomWidth: design.style === "underline" ? design.ruleThickness : 0,
        borderBottomColor: resolvedColor,
        paddingBottom: design.style === "underline" ? 2 : 0,
        marginBottom: design.spacingBelow,
        alignItems: textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start",
      }}
    >
      {headingText}
    </View>
  );
};

// --------------------------------------------------------------------------
// 2. PdfEntryHeader
// --------------------------------------------------------------------------
interface PdfEntryHeaderProps {
  item: SectionItem;
  entryDesign: SectionDesign["entry"];
  datesDesign: SectionDesign["dates"];
  dateFormat: string;
  accentColor: string;
  baseFontSize: number;
}

export const PdfEntryHeader: React.FC<PdfEntryHeaderProps> = ({
  item,
  entryDesign,
  datesDesign,
  dateFormat,
  accentColor,
  baseFontSize,
}) => {
  const effectiveFormat =
    datesDesign.format === "inherit" || !datesDesign.format
      ? dateFormat
      : datesDesign.format;

  const startFormatted = formatDate(item.startDate, effectiveFormat);
  let endFormatted = item.endDate ? formatDate(item.endDate, effectiveFormat) : "";
  if (item.endDate?.toLowerCase() === "present" || item.endDate === "Present") {
    endFormatted = datesDesign.presentLabel || "Present";
  }

  const dateRange = [startFormatted, endFormatted]
    .filter(Boolean)
    .join(` ${datesDesign.separator || "–"} `);

  const titleNode = item.title && (
    <Text
      style={{
        fontWeight: entryDesign.titleWeight >= 600 ? "bold" : "normal",
        fontSize: baseFontSize * 1.02,
        color: "#111827",
      }}
    >
      {item.title}
    </Text>
  );

  const subtitleNode = item.subtitle && (
    <Text
      style={{
        fontStyle: entryDesign.subtitleStyle === "italic" ? "italic" : "normal",
        color:
          entryDesign.subtitleStyle === "accent"
            ? accentColor
            : entryDesign.subtitleStyle === "muted"
            ? "#6b7280"
            : "#4b5563",
        fontSize: baseFontSize,
      }}
    >
      {item.subtitle}
    </Text>
  );

  const locationNode =
    item.location && entryDesign.locationPosition !== "hidden" ? (
      <Text style={{ fontSize: baseFontSize * 0.85, color: "#6b7280", marginLeft: 2 }}>
        ({item.location})
      </Text>
    ) : null;

  const dateNode = dateRange ? (
    <Text style={{ fontSize: baseFontSize * 0.85, color: "#6b7280" }}>
      {dateRange}
    </Text>
  ) : null;

  const linkIconSize = Math.max(8, Math.round(baseFontSize * 0.82));
  const isGithubLink = item.link ? /github\.com/i.test(item.link) : false;
  const linkNode =
    item.link && entryDesign.showLink !== "hidden" ? (
      <Link
        src={item.link.startsWith("http") ? item.link : `https://${item.link}`}
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          textDecoration: "none",
          marginLeft: 4,
          paddingVertical: 1,
        }}
      >
        {entryDesign.showLink === "text" ? (
          <Text
            style={{
              fontSize: baseFontSize * 0.85,
              color: accentColor,
              marginRight: 3,
            }}
          >
            {item.link.replace(/^https?:\/\//, "")}
          </Text>
        ) : null}
        <PdfSectionIcon
          iconName={isGithubLink ? "Github" : "ExternalLink"}
          size={linkIconSize}
          color={accentColor}
          style={{ marginRight: 0 }}
        />
      </Link>
    ) : null;

  const firstNode = entryDesign.order === "subtitle-first" ? subtitleNode : titleNode;
  const secondNode = entryDesign.order === "subtitle-first" ? titleNode : subtitleNode;

  if (entryDesign.layout === "single-line") {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline" }}>
        {firstNode}
        {secondNode && <Text style={{ color: "#9ca3af", marginHorizontal: 3 }}>·</Text>}
        {secondNode}
        {locationNode}
        {dateNode && (
          <>
            <Text style={{ color: "#9ca3af", marginHorizontal: 3 }}>·</Text>
            {dateNode}
          </>
        )}
        {linkNode}
      </View>
    );
  }

  if (entryDesign.layout === "date-left-column") {
    return (
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        <View style={{ width: `${entryDesign.dateColumnWidth}%`, paddingRight: 8 }}>
          {dateNode}
          {entryDesign.locationPosition === "with-date" && locationNode}
        </View>
        <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "baseline" }}>
          {firstNode}
          {secondNode && <Text style={{ color: "#9ca3af", marginHorizontal: 3 }}>·</Text>}
          {secondNode}
          {entryDesign.locationPosition === "with-subtitle" && locationNode}
          {linkNode}
        </View>
      </View>
    );
  }

  if (entryDesign.layout === "two-line-split") {
    return (
      <View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>{firstNode}</View>
          {dateNode}
        </View>
        {(secondNode || locationNode || linkNode) && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 1 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline" }}>
              {secondNode}
              {entryDesign.locationPosition === "with-subtitle" && locationNode}
              {linkNode}
            </View>
            {entryDesign.locationPosition === "with-date" && locationNode}
          </View>
        )}
      </View>
    );
  }

  if (entryDesign.layout === "stacked") {
    return (
      <View>
        {firstNode}
        {secondNode && <View style={{ marginTop: 1 }}>{secondNode}</View>}
        <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 1 }}>
          {dateNode}
          {locationNode}
          {linkNode}
        </View>
      </View>
    );
  }

  // Default: title-date-row
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", flex: 1 }}>
        {firstNode}
        {secondNode && <Text style={{ color: "#9ca3af", marginHorizontal: 3 }}>·</Text>}
        {secondNode}
        {entryDesign.locationPosition === "with-subtitle" && locationNode}
        {linkNode}
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        {dateNode}
        {entryDesign.locationPosition === "with-date" && locationNode}
      </View>
    </View>
  );
};

// --------------------------------------------------------------------------
// 3. PdfBulletList
// --------------------------------------------------------------------------
interface PdfBulletListProps {
  htmlDescription?: string;
  design: SectionDesign["description"];
  accentColor: string;
  textColor: string;
  baseFontSize: number;
}

export const PdfBulletList: React.FC<PdfBulletListProps> = ({
  htmlDescription,
  design,
  accentColor,
  textColor,
  baseFontSize,
}) => {
  if (!design.showDescription || !htmlDescription) return null;

  const hasBullets = /<li[^>]*>/i.test(htmlDescription);
  if (!hasBullets) {
    const plain = htmlToPlainText(htmlDescription);
    const paragraphs = plain.split("\n").filter((p) => p.trim().length > 0);
    return (
      <View style={{ marginTop: 2 }}>
        {paragraphs.map((p, idx) => (
          <Text
            key={idx}
            style={{
              fontSize: baseFontSize * 0.95,
              color: textColor || "#374151",
              marginTop: 1,
            }}
          >
            {p}
          </Text>
        ))}
      </View>
    );
  }

  const rawBullets = htmlDescription
    .split(/<\/li>/i)
    .map((chunk) => chunk.replace(/<[^>]+>/g, "").trim())
    .filter((chunk) => chunk.length > 0);

  const getBulletSymbol = (idx: number) => {
    switch (design.bulletStyle) {
      case "dash":
        return "–";
      case "arrow":
        return "▸";
      case "square":
        return "▪";
      case "check":
        return "✓";
      case "numbered":
        return `${idx + 1}.`;
      case "none":
        return "";
      case "disc":
      default:
        return "•";
    }
  };

  const bulletColor = design.bulletColor === "accent" ? accentColor : "#4b5563";

  return (
    <View style={{ marginTop: 2, paddingLeft: design.indent }}>
      {rawBullets.map((bullet, idx) => (
        <View
          key={idx}
          style={{
            flexDirection: "row",
            marginBottom: design.bulletSpacing,
          }}
          wrap={false}
        >
          {design.bulletStyle !== "none" && (
            <Text
              style={{
                width: 10,
                fontSize: baseFontSize * 0.9,
                color: bulletColor,
              }}
            >
              {getBulletSymbol(idx)}
            </Text>
          )}
          <Text
            style={{
              flex: 1,
              fontSize: baseFontSize * 0.95,
              color: textColor || "#374151",
            }}
          >
            {bullet}
          </Text>
        </View>
      ))}
    </View>
  );
};

// --------------------------------------------------------------------------
// 4. PdfLevelIndicator
// --------------------------------------------------------------------------
interface PdfLevelIndicatorProps {
  level?: number;
  design: SectionDesign["level"];
  accentColor: string;
  baseFontSize: number;
}

export const PdfLevelIndicator: React.FC<PdfLevelIndicatorProps> = ({
  level,
  design,
  accentColor,
  baseFontSize,
}) => {
  if (design.display === "none" || !level || level <= 0) return null;

  const max = design.max || 5;
  const clamped = Math.min(level, max);

  if (design.display === "text") {
    const label = design.labels?.[clamped - 1] || `${clamped}/${max}`;
    return (
      <Text style={{ fontSize: baseFontSize * 0.8, color: "#6b7280" }}>
        {label}
      </Text>
    );
  }

  if (design.display === "dots") {
    const dots = Array.from({ length: max }, (_, i) => i + 1);
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
        {dots.map((d) => (
          <View
            key={d}
            style={{
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: d <= clamped ? accentColor : "#e5e7eb",
            }}
          />
        ))}
      </View>
    );
  }

  if (design.display === "bar") {
    const pct = Math.round((clamped / max) * 100);
    return (
      <View
        style={{
          width: 50,
          height: 3,
          backgroundColor: "#e5e7eb",
          borderRadius: 1.5,
          marginTop: 2,
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: 3,
            backgroundColor: accentColor,
            borderRadius: 1.5,
          }}
        />
      </View>
    );
  }

  if (design.display === "stars") {
    const stars = Array.from({ length: max }, (_, i) => i < clamped ? "★" : "☆").join("");
    return (
      <Text style={{ fontSize: baseFontSize * 0.85, color: accentColor }}>
        {stars}
      </Text>
    );
  }

  return null;
};

// --------------------------------------------------------------------------
// 5. PdfHeaderBlock
// --------------------------------------------------------------------------
interface PdfHeaderBlockProps {
  personal: PersonalInfo;
  design: HeaderDesign;
  accentColor: string;
  textColor: string;
  baseFontSize: number;
}

export const PdfHeaderBlock: React.FC<PdfHeaderBlockProps> = ({
  personal,
  design,
  accentColor,
  textColor,
  baseFontSize,
}) => {
  const isBanner = design.layout === "banner";
  const isCentered = design.align === "center";
  const isRight = design.align === "right";

  const textAlign = isCentered ? "center" : isRight ? "right" : "left";
  const alignItems = isCentered ? "center" : isRight ? "flex-end" : "flex-start";
  const textTransform = design.nameCase === "uppercase" ? "uppercase" : "none";

  const resolvedNameColor = isBanner
    ? "#ffffff"
    : design.nameColor === "accent" || !design.nameColor
    ? accentColor
    : design.nameColor === "text"
    ? textColor
    : design.nameColor;

  const resolvedJobTitleColor = isBanner
    ? "rgba(255,255,255,0.85)"
    : design.jobTitleColor === "accent"
    ? accentColor
    : design.jobTitleColor === "muted"
    ? "#6b7280"
    : textColor;

  const photoBorderRadius =
    design.photo.shape === "circle"
      ? design.photo.size / 2
      : design.photo.shape === "rounded"
      ? 4
      : 0;

  const renderPhoto = () => {
    if (!design.photo.show || !personal.photo) return null;
    return (
      <Image
        src={personal.photo}
        style={{
          width: design.photo.size,
          height: design.photo.size,
          borderRadius: photoBorderRadius,
          objectFit: "cover",
        }}
      />
    );
  };

  const separatorChar =
    design.contactSeparator === "pipe"
      ? " | "
      : design.contactSeparator === "none"
      ? ""
      : " · ";

  const contactList: { label: string; href?: string; iconName?: string }[] = [];
  if (personal.email) contactList.push({ label: personal.email, href: `mailto:${personal.email}`, iconName: "Mail" });
  if (personal.phone) contactList.push({ label: personal.phone, iconName: "Phone" });
  if (personal.location) contactList.push({ label: personal.location, iconName: "MapPin" });
  if (personal.website) contactList.push({ label: personal.website.replace(/^https?:\/\//, ""), href: personal.website, iconName: "Globe" });
  if (personal.linkedin) contactList.push({ label: personal.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "in/"), href: personal.linkedin, iconName: "Linkedin" });
  if (personal.github) contactList.push({ label: personal.github.replace(/^https?:\/\/(www\.)?github\.com\//, "github/"), href: personal.github, iconName: "Github" });

  const renderContactItem = (c: { label: string; href?: string; iconName?: string }) => {
    const iconColor = isBanner ? "#ffffff" : accentColor || "#4b5563";
    const textColor = isBanner ? "#ffffff" : "#4b5563";
    const iconSize = baseFontSize * 0.85;

    const content = (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {design.contactIcons && c.iconName && (
          <PdfSectionIcon
            iconName={c.iconName}
            size={iconSize}
            color={iconColor}
            style={{ marginRight: 3 }}
          />
        )}
        <Text style={{ fontSize: baseFontSize * 0.88, color: textColor }}>
          {c.label}
        </Text>
      </View>
    );

    if (c.href) {
      return (
        <Link
          src={c.href.startsWith("http") ? c.href : `https://${c.href}`}
          style={{ textDecoration: "none" }}
        >
          {content}
        </Link>
      );
    }
    return content;
  };

  const renderContacts = () => {
    if (contactList.length === 0) return null;

    if (design.contactArrangement === "column") {
      return (
        <View style={{ flexDirection: "column", gap: 2.5, marginTop: 4 }}>
          {contactList.map((c, i) => (
            <View key={i}>
              {renderContactItem(c)}
            </View>
          ))}
        </View>
      );
    }

    if (design.contactArrangement === "grid-2") {
      return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
          {contactList.map((c, i) => (
            <View key={i} style={{ width: "50%", paddingRight: 6, marginBottom: 2.5 }}>
              {renderContactItem(c)}
            </View>
          ))}
        </View>
      );
    }

    if (design.contactArrangement === "grid-3") {
      return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
          {contactList.map((c, i) => (
            <View key={i} style={{ width: "33.33%", paddingRight: 4, marginBottom: 2.5 }}>
              {renderContactItem(c)}
            </View>
          ))}
        </View>
      );
    }

    // Default "row"
    return (
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: isCentered ? "center" : isRight ? "flex-end" : "flex-start",
          marginTop: 4,
        }}
      >
        {contactList.map((c, i) => (
          <React.Fragment key={i}>
            {renderContactItem(c)}
            {i < contactList.length - 1 && separatorChar && (
              <Text style={{ fontSize: baseFontSize * 0.88, color: isBanner ? "#ffffff88" : "#9ca3af", marginHorizontal: 4 }}>
                {separatorChar}
              </Text>
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  if (isBanner) {
    return (
      <View
        style={{
          backgroundColor: accentColor,
          padding: 12,
          marginBottom: design.spacingBelow,
          borderRadius: 2,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: design.nameSize,
                fontWeight: "bold",
                color: "#ffffff",
                textTransform,
                lineHeight: 1.25,
              }}
            >
              {personal.fullName || "Your Name"}
            </Text>
            {personal.jobTitle && (
              <Text
                style={{
                  fontSize: design.jobTitleSize,
                  color: "rgba(255,255,255,0.85)",
                  marginTop: 3,
                  lineHeight: 1.3,
                }}
              >
                {personal.jobTitle}
              </Text>
            )}
          </View>
          {renderPhoto()}
        </View>
        {renderContacts()}
      </View>
    );
  }

  if (design.layout === "name-left-contact-right") {
    return (
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: design.spacingBelow,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, paddingRight: 8 }}>
          {design.photo.position === "left" && renderPhoto()}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: design.nameSize,
                fontWeight: design.nameWeight >= 600 ? "bold" : "normal",
                color: resolvedNameColor,
                textTransform,
                lineHeight: 1.25,
              }}
            >
              {personal.fullName || "Your Name"}
            </Text>
            {personal.jobTitle && (
              <Text style={{ fontSize: design.jobTitleSize, color: resolvedJobTitleColor, marginTop: 3, lineHeight: 1.3 }}>
                {personal.jobTitle}
              </Text>
            )}
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          {renderContacts()}
          {design.photo.position === "right" && <View style={{ marginTop: 4 }}>{renderPhoto()}</View>}
        </View>
      </View>
    );
  }

  // Stacked
  return (
    <View style={{ alignItems, marginBottom: design.spacingBelow, width: "100%" }}>
      {design.photo.position === "top" && <View style={{ marginBottom: 4 }}>{renderPhoto()}</View>}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: isCentered ? "center" : isRight ? "flex-end" : "flex-start",
          width: "100%",
        }}
      >
        {design.photo.position === "left" && <View style={{ marginRight: 10 }}>{renderPhoto()}</View>}
        <View style={{ alignItems, flex: 1 }}>
          <Text
            style={{
              fontSize: design.nameSize,
              fontWeight: design.nameWeight >= 600 ? "bold" : "normal",
              color: resolvedNameColor,
              textTransform,
              textAlign,
              lineHeight: 1.25,
            }}
          >
            {personal.fullName || "Your Name"}
          </Text>
          {personal.jobTitle && (
            <Text
              style={{
                fontSize: design.jobTitleSize,
                color: resolvedJobTitleColor,
                marginTop: 3,
                textAlign,
                lineHeight: 1.3,
              }}
            >
              {personal.jobTitle}
            </Text>
          )}
        </View>
        {design.photo.position === "right" && <View style={{ marginLeft: 10 }}>{renderPhoto()}</View>}
      </View>
      {renderContacts()}
    </View>
  );
};
