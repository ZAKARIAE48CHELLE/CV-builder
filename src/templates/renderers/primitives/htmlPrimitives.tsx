"use client";

import React from "react";
import {
  SectionItem,
  SectionDesign,
  HeaderDesign,
  PersonalInfo,
} from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { sanitizeRichHtml } from "@/lib/security/sanitize";
import { resolvePhotoSignedUrl } from "@/lib/storage/userFiles";
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  ExternalLink,
} from "lucide-react";
import { LinkedinIcon, GithubIcon } from "@/components/common/BrandIcons";
import { getSectionIconComponent } from "@/components/common/SectionIcon";

// --------------------------------------------------------------------------
// 1. HtmlSectionHeading
// --------------------------------------------------------------------------
interface HtmlSectionHeadingProps {
  heading: string;
  design: SectionDesign["heading"];
  iconKey?: string;
  accentColor: string;
  textColor: string;
}

export const HtmlSectionHeading: React.FC<HtmlSectionHeadingProps> = ({
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

  let textCase = "";
  if (design.case === "uppercase") textCase = "uppercase tracking-wider";
  else if (design.case === "capitalize") textCase = "capitalize";

  const alignClass =
    design.align === "center"
      ? "justify-center text-center"
      : design.align === "right"
      ? "justify-end text-right"
      : "justify-start text-left";

  const SectionIcon =
    design.icon && iconKey ? getSectionIconComponent(iconKey) : null;

  // Heading Styles
  if (design.style === "full-rule") {
    return (
      <div
        className={`flex items-center gap-3 w-full mb-2`}
        style={{ marginBottom: `${design.spacingBelow}pt` }}
      >
        {design.align === "right" && (
          <div
            className="flex-1"
            style={{
              height: `${design.ruleThickness}pt`,
              backgroundColor: resolvedColor,
              opacity: 0.35,
            }}
          />
        )}
        <h2
          className={`flex items-center gap-1.5 shrink-0 font-bold ${textCase} ${alignClass}`}
          style={{
            fontSize: `${design.fontSize}pt`,
            fontWeight: design.fontWeight,
            letterSpacing: `${design.letterSpacing}em`,
            color: resolvedColor,
          }}
        >
          {SectionIcon && (
            <SectionIcon
              style={{
                width: `${design.fontSize * 0.95}pt`,
                height: `${design.fontSize * 0.95}pt`,
              }}
            />
          )}
          <span>{heading}</span>
        </h2>
        {design.align !== "right" && (
          <div
            className="flex-1"
            style={{
              height: `${design.ruleThickness}pt`,
              backgroundColor: resolvedColor,
              opacity: 0.35,
            }}
          />
        )}
      </div>
    );
  }

  if (design.style === "bar-left") {
    return (
      <div
        style={{
          borderLeft: `${design.ruleThickness * 2.5}px solid ${resolvedColor}`,
          paddingLeft: "8px",
          marginBottom: `${design.spacingBelow}pt`,
        }}
      >
        <h2
          className={`flex items-center gap-1.5 font-bold ${textCase} ${alignClass}`}
          style={{
            fontSize: `${design.fontSize}pt`,
            fontWeight: design.fontWeight,
            letterSpacing: `${design.letterSpacing}em`,
            color: resolvedColor,
          }}
        >
          {SectionIcon && (
            <SectionIcon
              style={{
                width: `${design.fontSize * 0.95}pt`,
                height: `${design.fontSize * 0.95}pt`,
              }}
            />
          )}
          <span>{heading}</span>
        </h2>
      </div>
    );
  }

  if (design.style === "box") {
    return (
      <div
        className="rounded px-2.5 py-1 mb-2 inline-block"
        style={{
          backgroundColor: `${resolvedColor}14`,
          border: `1px solid ${resolvedColor}33`,
          marginBottom: `${design.spacingBelow}pt`,
        }}
      >
        <h2
          className={`flex items-center gap-1.5 font-bold ${textCase} ${alignClass}`}
          style={{
            fontSize: `${design.fontSize}pt`,
            fontWeight: design.fontWeight,
            letterSpacing: `${design.letterSpacing}em`,
            color: resolvedColor,
          }}
        >
          {SectionIcon && (
            <SectionIcon
              style={{
                width: `${design.fontSize * 0.95}pt`,
                height: `${design.fontSize * 0.95}pt`,
              }}
            />
          )}
          <span>{heading}</span>
        </h2>
      </div>
    );
  }

  if (design.style === "accent-bg") {
    return (
      <div
        className="rounded px-2.5 py-1 mb-2 w-full text-white"
        style={{
          backgroundColor: resolvedColor,
          marginBottom: `${design.spacingBelow}pt`,
        }}
      >
        <h2
          className={`flex items-center gap-1.5 font-bold text-white ${textCase} ${alignClass}`}
          style={{
            fontSize: `${design.fontSize}pt`,
            fontWeight: design.fontWeight,
            letterSpacing: `${design.letterSpacing}em`,
          }}
        >
          {SectionIcon && (
            <SectionIcon
              style={{
                width: `${design.fontSize * 0.95}pt`,
                height: `${design.fontSize * 0.95}pt`,
              }}
            />
          )}
          <span>{heading}</span>
        </h2>
      </div>
    );
  }

  // "underline" or "plain"
  const borderBottom =
    design.style === "underline"
      ? `${design.ruleThickness}px solid ${resolvedColor}`
      : undefined;

  return (
    <div
      style={{
        borderBottom,
        paddingBottom: design.style === "underline" ? "3px" : undefined,
        marginBottom: `${design.spacingBelow}pt`,
      }}
    >
      <h2
        className={`flex items-center gap-1.5 font-bold ${textCase} ${alignClass}`}
        style={{
          fontSize: `${design.fontSize}pt`,
          fontWeight: design.fontWeight,
          letterSpacing: `${design.letterSpacing}em`,
          color: resolvedColor,
        }}
      >
        {SectionIcon && (
          <SectionIcon
            style={{
              width: `${design.fontSize * 0.95}pt`,
              height: `${design.fontSize * 0.95}pt`,
            }}
          />
        )}
        <span>{heading}</span>
      </h2>
    </div>
  );
};

// --------------------------------------------------------------------------
// 2. HtmlEntryHeader
// --------------------------------------------------------------------------
interface HtmlEntryHeaderProps {
  item: SectionItem;
  entryDesign: SectionDesign["entry"];
  datesDesign: SectionDesign["dates"];
  dateFormat: string;
  accentColor: string;
  baseFontSize: number;
}

export const HtmlEntryHeader: React.FC<HtmlEntryHeaderProps> = ({
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

  const subtitleClass =
    entryDesign.subtitleStyle === "italic"
      ? "italic text-neutral-700"
      : entryDesign.subtitleStyle === "accent"
      ? "font-medium"
      : entryDesign.subtitleStyle === "muted"
      ? "text-neutral-500 font-normal"
      : "font-medium text-neutral-700";

  const subtitleColor = entryDesign.subtitleStyle === "accent" ? accentColor : undefined;

  const titleNode = item.title && (
    <span
      className="text-neutral-900"
      style={{
        fontWeight: entryDesign.titleWeight,
        fontSize: `${baseFontSize * 1.02}pt`,
      }}
    >
      {item.title}
    </span>
  );

  const subtitleNode = item.subtitle && (
    <span className={subtitleClass} style={{ color: subtitleColor }}>
      {item.subtitle}
    </span>
  );

  const locationNode =
    item.location && entryDesign.locationPosition !== "hidden" ? (
      <span className="text-neutral-500 text-[0.88em]">
        ({item.location})
      </span>
    ) : null;

  const isGithubLink = item.link ? /github\.com/i.test(item.link) : false;
  const linkNode =
    item.link && entryDesign.showLink !== "hidden" ? (
      <a
        href={item.link.startsWith("http") ? item.link : `https://${item.link}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[0.85em] hover:underline"
        style={{ color: accentColor }}
      >
        {entryDesign.showLink === "text"
          ? item.link.replace(/^https?:\/\//, "")
          : null}
        {isGithubLink ? (
          <GithubIcon className="w-3 h-3 inline shrink-0" />
        ) : (
          <ExternalLink className="w-3 h-3 inline shrink-0" />
        )}
      </a>
    ) : null;

  const firstNode = entryDesign.order === "subtitle-first" ? subtitleNode : titleNode;
  const secondNode = entryDesign.order === "subtitle-first" ? titleNode : subtitleNode;

  // Single line layout
  if (entryDesign.layout === "single-line") {
    return (
      <div className="flex items-baseline flex-wrap gap-x-1.5 text-[0.95em]">
        {firstNode}
        {secondNode && <span className="text-neutral-400">·</span>}
        {secondNode}
        {locationNode}
        {dateRange && (
          <>
            <span className="text-neutral-400">·</span>
            <span className="text-neutral-500 text-[0.88em] font-medium">
              {dateRange}
            </span>
          </>
        )}
        {linkNode}
      </div>
    );
  }

  // Date in left column
  if (entryDesign.layout === "date-left-column") {
    return (
      <div className="flex items-baseline gap-3">
        <div
          className="shrink-0 text-right text-neutral-500 text-[0.88em] font-medium"
          style={{ width: `${entryDesign.dateColumnWidth}%` }}
        >
          {dateRange}
          {entryDesign.locationPosition === "with-date" && locationNode && (
            <div className="text-[0.82em]">{locationNode}</div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            {firstNode}
            {secondNode && <span className="text-neutral-400">·</span>}
            {secondNode}
            {entryDesign.locationPosition === "with-subtitle" && locationNode}
            {linkNode}
          </div>
        </div>
      </div>
    );
  }

  // Two line split
  if (entryDesign.layout === "two-line-split") {
    return (
      <div>
        <div className="flex justify-between items-baseline flex-wrap gap-x-2">
          {firstNode}
          {dateRange && (
            <span className="text-neutral-500 text-[0.88em] font-medium shrink-0 ml-auto">
              {dateRange}
            </span>
          )}
        </div>
        {(secondNode || locationNode || linkNode) && (
          <div className="flex justify-between items-baseline flex-wrap gap-x-2 text-[0.9em] mt-0.5">
            <div className="flex items-baseline gap-1.5">
              {secondNode}
              {entryDesign.locationPosition === "with-subtitle" && locationNode}
              {linkNode}
            </div>
            {entryDesign.locationPosition === "with-date" && locationNode && (
              <span className="shrink-0 ml-auto">{locationNode}</span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Stacked
  if (entryDesign.layout === "stacked") {
    return (
      <div>
        <div>{firstNode}</div>
        {secondNode && <div className="text-[0.92em]">{secondNode}</div>}
        <div className="flex items-baseline gap-2 text-neutral-500 text-[0.85em] mt-0.5">
          {dateRange && <span>{dateRange}</span>}
          {locationNode}
          {linkNode}
        </div>
      </div>
    );
  }

  // Default: title-date-row
  return (
    <div className="flex justify-between items-baseline flex-wrap gap-x-2">
      <div className="flex items-baseline gap-1.5 flex-wrap">
        {firstNode}
        {secondNode && <span className="text-neutral-400">·</span>}
        {secondNode}
        {entryDesign.locationPosition === "with-subtitle" && locationNode}
        {linkNode}
      </div>
      {dateRange && (
        <div className="text-neutral-500 text-[0.88em] font-medium shrink-0 ml-auto flex items-baseline gap-1">
          <span>{dateRange}</span>
          {entryDesign.locationPosition === "with-date" && locationNode}
        </div>
      )}
    </div>
  );
};

// --------------------------------------------------------------------------
// 3. HtmlBulletList
// --------------------------------------------------------------------------
interface HtmlBulletListProps {
  htmlDescription?: string;
  design: SectionDesign["description"];
  accentColor: string;
  textColor: string;
}

export const HtmlBulletList: React.FC<HtmlBulletListProps> = ({
  htmlDescription,
  design,
  accentColor,
}) => {
  if (!design.showDescription || !htmlDescription) return null;

  const hasBullets = /<li[^>]*>/i.test(htmlDescription);
  if (!hasBullets) {
    return (
      <div
        className="resume-rich-text mt-1 space-y-1 text-justify"
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(htmlDescription) }}
      />
    );
  }

  // Extract bullets to render with custom bullet symbol and spacing
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
    <div
      className="mt-1 space-y-1"
      style={{ paddingLeft: `${design.indent}pt` }}
    >
      {rawBullets.map((bullet, idx) => (
        <div
          key={idx}
          className="flex items-start gap-1.5"
          style={{ marginBottom: `${design.bulletSpacing}pt` }}
        >
          {design.bulletStyle !== "none" && (
            <span
              className="shrink-0 select-none font-medium"
              style={{ color: bulletColor, minWidth: "10px" }}
            >
              {getBulletSymbol(idx)}
            </span>
          )}
          <span className="flex-1 text-justify">{bullet}</span>
        </div>
      ))}
    </div>
  );
};

// --------------------------------------------------------------------------
// 4. HtmlLevelIndicator
// --------------------------------------------------------------------------
interface HtmlLevelIndicatorProps {
  level?: number;
  design: SectionDesign["level"];
  accentColor: string;
}

export const HtmlLevelIndicator: React.FC<HtmlLevelIndicatorProps> = ({
  level,
  design,
  accentColor,
}) => {
  if (design.display === "none" || !level || level <= 0) return null;

  const max = design.max || 5;
  const clampedLevel = Math.min(level, max);

  if (design.display === "text") {
    const label = design.labels?.[clampedLevel - 1] || `${clampedLevel}/${max}`;
    return (
      <span className="text-[0.82em] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700">
        {label}
      </span>
    );
  }

  if (design.display === "dots") {
    const dots = Array.from({ length: max }, (_, i) => i + 1);
    return (
      <div className="flex items-center gap-1 mt-1">
        {dots.map((dot) => (
          <span
            key={dot}
            className="w-2 h-2 rounded-full inline-block"
            style={{
              backgroundColor: dot <= clampedLevel ? accentColor : "#e5e7eb",
            }}
          />
        ))}
      </div>
    );
  }

  if (design.display === "bar") {
    const pct = Math.round((clampedLevel / max) * 100);
    return (
      <div className="w-24 h-1.5 bg-neutral-200 rounded-full overflow-hidden mt-1 inline-block">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: accentColor }}
        />
      </div>
    );
  }

  if (design.display === "stars") {
    const stars = Array.from({ length: max }, (_, i) => i < clampedLevel ? "★" : "☆").join("");
    return (
      <span className="text-[0.88em] tracking-wider" style={{ color: accentColor }}>
        {stars}
      </span>
    );
  }

  return null;
};

// --------------------------------------------------------------------------
// 5. HtmlArrangement
// --------------------------------------------------------------------------
interface HtmlArrangementProps {
  mode: SectionDesign["arrangement"]["mode"];
  gridColumns: 1 | 2 | 3 | 4;
  inlineSeparator: SectionDesign["arrangement"]["inlineSeparator"];
  tagStyle: SectionDesign["arrangement"]["tagStyle"];
  tagRadius: number;
  accentColor: string;
  itemSpacing: number;
  children: React.ReactNode;
}

export const HtmlArrangement: React.FC<HtmlArrangementProps> = ({
  mode,
  gridColumns,
  inlineSeparator,
  tagStyle,
  tagRadius,
  accentColor,
  itemSpacing,
  children,
}) => {
  if (mode === "grid") {
    return (
      <div
        className="grid gap-x-4"
        style={{
          gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
          rowGap: `${itemSpacing}pt`,
        }}
      >
        {children}
      </div>
    );
  }

  if (mode === "inline") {
    return (
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {children}
      </div>
    );
  }

  // Default / list / timeline
  return <div className="space-y-1">{children}</div>;
};

// --------------------------------------------------------------------------
// 6. HtmlHeaderBlock
// --------------------------------------------------------------------------
interface HtmlHeaderBlockProps {
  personal: PersonalInfo;
  design: HeaderDesign;
  accentColor: string;
  textColor: string;
  baseFontSize: number;
  onClick?: () => void;
  isSelected?: boolean;
}

export const HtmlHeaderBlock: React.FC<HtmlHeaderBlockProps> = ({
  personal,
  design,
  accentColor,
  textColor,
  baseFontSize,
  onClick,
  isSelected,
}) => {
  const isBanner = design.layout === "banner";
  const isCentered = design.align === "center";
  const isRight = design.align === "right";

  const alignClass = isCentered
    ? "text-center items-center"
    : isRight
    ? "text-right items-end"
    : "text-left items-start";

  const nameCaseClass = design.nameCase === "uppercase" ? "uppercase tracking-wider" : "";

  const resolvedNameColor = isBanner
    ? "#ffffff"
    : design.nameColor === "accent" || !design.nameColor
    ? accentColor
    : design.nameColor === "text"
    ? textColor
    : design.nameColor;

  const jobTitleColor =
    isBanner
      ? "rgba(255,255,255,0.85)"
      : design.jobTitleColor === "accent"
      ? accentColor
      : design.jobTitleColor === "muted"
      ? "#6b7280"
      : textColor;

  const [resolvedPhotoUrl, setResolvedPhotoUrl] = React.useState<string | undefined>(
    personal.photo && !personal.photo.startsWith("storage://") ? personal.photo : undefined
  );

  React.useEffect(() => {
    let active = true;
    if (!personal.photo) {
      setResolvedPhotoUrl(undefined);
    } else {
      resolvePhotoSignedUrl(personal.photo).then((url) => {
        if (active) setResolvedPhotoUrl(url);
      });
    }
    return () => {
      active = false;
    };
  }, [personal.photo]);

  const photoBorderClass = design.photo.border ? "ring-2 ring-neutral-200" : "";
  const photoShapeClass =
    design.photo.shape === "circle"
      ? "rounded-full"
      : design.photo.shape === "rounded"
      ? "rounded-lg"
      : "rounded-none";

  const renderPhoto = () => {
    if (!design.photo.show || !resolvedPhotoUrl) return null;
    return (
      <img
        src={resolvedPhotoUrl}
        alt={personal.fullName || "Photo"}
        className={`object-cover shrink-0 ${photoShapeClass} ${photoBorderClass}`}
        style={{
          width: `${design.photo.size}pt`,
          height: `${design.photo.size}pt`,
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

  const contactItems: { key: string; icon: any; node: React.ReactNode }[] = [];

  if (personal.email) {
    contactItems.push({
      key: "email",
      icon: Mail,
      node: (
        <a
          href={`mailto:${personal.email}`}
          className="hover:underline flex items-center gap-1"
        >
          {design.contactIcons && <Mail className="w-3 h-3 shrink-0" />}
          <span>{personal.email}</span>
        </a>
      ),
    });
  }

  if (personal.phone) {
    contactItems.push({
      key: "phone",
      icon: Phone,
      node: (
        <span className="flex items-center gap-1">
          {design.contactIcons && <Phone className="w-3 h-3 shrink-0" />}
          <span>{personal.phone}</span>
        </span>
      ),
    });
  }

  if (personal.location) {
    contactItems.push({
      key: "location",
      icon: MapPin,
      node: (
        <span className="flex items-center gap-1">
          {design.contactIcons && <MapPin className="w-3 h-3 shrink-0" />}
          <span>{personal.location}</span>
        </span>
      ),
    });
  }

  if (personal.website) {
    contactItems.push({
      key: "website",
      icon: Globe,
      node: (
        <a
          href={personal.website.startsWith("http") ? personal.website : `https://${personal.website}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline flex items-center gap-1"
        >
          {design.contactIcons && <Globe className="w-3 h-3 shrink-0" />}
          <span>{personal.website.replace(/^https?:\/\//, "")}</span>
        </a>
      ),
    });
  }

  if (personal.linkedin) {
    contactItems.push({
      key: "linkedin",
      icon: LinkedinIcon,
      node: (
        <a
          href={personal.linkedin.startsWith("http") ? personal.linkedin : `https://${personal.linkedin}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline flex items-center gap-1"
        >
          {design.contactIcons && <LinkedinIcon className="w-3 h-3 shrink-0" />}
          <span>{personal.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "")}</span>
        </a>
      ),
    });
  }

  if (personal.github) {
    contactItems.push({
      key: "github",
      icon: GithubIcon,
      node: (
        <a
          href={personal.github.startsWith("http") ? personal.github : `https://${personal.github}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline flex items-center gap-1"
        >
          {design.contactIcons && <GithubIcon className="w-3 h-3 shrink-0" />}
          <span>{personal.github.replace(/^https?:\/\/(www\.)?github\.com\//, "")}</span>
        </a>
      ),
    });
  }

  const renderContactList = () => {
    if (contactItems.length === 0) return null;

    if (design.contactArrangement === "column") {
      return (
        <div className="flex flex-col gap-1 text-[0.88em] text-neutral-600">
          {contactItems.map((c) => (
            <div key={c.key}>{c.node}</div>
          ))}
        </div>
      );
    }

    if (design.contactArrangement === "grid-2") {
      return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[0.88em] text-neutral-600">
          {contactItems.map((c) => (
            <div key={c.key}>{c.node}</div>
          ))}
        </div>
      );
    }

    if (design.contactArrangement === "grid-3") {
      return (
        <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-[0.88em] text-neutral-600">
          {contactItems.map((c) => (
            <div key={c.key}>{c.node}</div>
          ))}
        </div>
      );
    }

    // Default "row"
    return (
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.88em] ${isCentered ? "justify-center" : isRight ? "justify-end" : "justify-start"} text-neutral-600`}>
        {contactItems.map((c, idx) => (
          <React.Fragment key={c.key}>
            {c.node}
            {idx < contactItems.length - 1 && separatorChar && (
              <span className="text-neutral-400 select-none">{separatorChar}</span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Banner layout
  if (isBanner) {
    return (
      <header
        onClick={onClick}
        className={`p-6 text-white cursor-pointer transition-all ${
          isSelected ? "ring-2 ring-blue-500 rounded-sm" : ""
        }`}
        style={{
          backgroundColor: accentColor,
          marginBottom: `${design.spacingBelow}pt`,
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1
              className={`font-bold ${nameCaseClass}`}
              style={{
                fontSize: `${design.nameSize}pt`,
                fontWeight: design.nameWeight,
              }}
            >
              {personal.fullName || "Your Name"}
            </h1>
            {personal.jobTitle && (
              <p
                className="mt-0.5 font-medium"
                style={{
                  fontSize: `${design.jobTitleSize}pt`,
                  color: jobTitleColor,
                }}
              >
                {personal.jobTitle}
              </p>
            )}
          </div>
          {renderPhoto()}
        </div>
        <div className="mt-3 text-white/90">
          {renderContactList()}
        </div>
      </header>
    );
  }

  // Name left, contact right layout
  if (design.layout === "name-left-contact-right") {
    return (
      <header
        onClick={onClick}
        className={`flex justify-between items-center gap-4 cursor-pointer transition-all pb-2 ${
          isSelected ? "ring-2 ring-blue-500 rounded-sm" : ""
        }`}
        style={{ marginBottom: `${design.spacingBelow}pt` }}
      >
        <div className="flex items-center gap-3">
          {design.photo.position === "left" && renderPhoto()}
          <div>
            <h1
              className={`font-bold ${nameCaseClass}`}
              style={{
                fontSize: `${design.nameSize}pt`,
                fontWeight: design.nameWeight,
                color: resolvedNameColor,
              }}
            >
              {personal.fullName || "Your Name"}
            </h1>
            {personal.jobTitle && (
              <p
                className="mt-0.5 font-medium"
                style={{
                  fontSize: `${design.jobTitleSize}pt`,
                  color: jobTitleColor,
                }}
              >
                {personal.jobTitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {renderContactList()}
          {design.photo.position === "right" && renderPhoto()}
        </div>
      </header>
    );
  }

  // Stacked layout
  return (
    <header
      onClick={onClick}
      className={`flex flex-col cursor-pointer transition-all ${alignClass} pb-2 ${
        isSelected ? "ring-2 ring-blue-500 rounded-sm" : ""
      }`}
      style={{ marginBottom: `${design.spacingBelow}pt` }}
    >
      {design.photo.position === "top" && (
        <div className="mb-2">{renderPhoto()}</div>
      )}

      <div className={`flex items-center gap-4 ${isCentered ? "justify-center" : isRight ? "justify-end" : "justify-between"} w-full`}>
        {design.photo.position === "left" && renderPhoto()}
        <div className={alignClass}>
          <h1
            className={`font-bold ${nameCaseClass}`}
            style={{
              fontSize: `${design.nameSize}pt`,
              fontWeight: design.nameWeight,
              color: resolvedNameColor,
            }}
          >
            {personal.fullName || "Your Name"}
          </h1>
          {personal.jobTitle && (
            <p
              className="mt-0.5 font-medium"
              style={{
                fontSize: `${design.jobTitleSize}pt`,
                color: jobTitleColor,
              }}
            >
              {personal.jobTitle}
            </p>
          )}
        </div>
        {design.photo.position === "right" && renderPhoto()}
      </div>

      <div className="mt-2 w-full">
        {renderContactList()}
      </div>
    </header>
  );
};
