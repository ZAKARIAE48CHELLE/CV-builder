"use client";

import React, { useState } from "react";
import {
  SectionDesign,
  SectionType,
} from "@/lib/schema";
import { APPLICABLE, ALLOWED_ARRANGEMENT_MODES, SectionDesignGroup } from "@/lib/design/applicability";
import { isGroupOverridden, isPropertyOverridden } from "@/lib/design/resolve";
import { COLOR_PALETTES, AVAILABLE_FONTS } from "@/config";
import {
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Heading,
  LayoutGrid,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sliders,
  Type,
  Square,
  Calendar,
  Columns,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

interface SectionDesignControlsProps {
  sectionType: SectionType;
  resolved: SectionDesign;
  globalDefaults: SectionDesign;
  overrides?: Partial<SectionDesign>;
  accentColor: string;
  textColor: string;
  onChange: (patch: Partial<SectionDesign>) => void;
  onResetGroup?: (group: keyof SectionDesign) => void;
  onResetProperty?: (group: keyof SectionDesign, prop: string) => void;
  isGlobalDefaultsMode?: boolean;
}

export const SectionDesignControls: React.FC<SectionDesignControlsProps> = ({
  sectionType,
  resolved,
  globalDefaults,
  overrides,
  accentColor,
  textColor,
  onChange,
  onResetGroup,
  isGlobalDefaultsMode = false,
}) => {
  // Collapsible accordion state for each group
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    heading: true,
    arrangement: true,
    entry: false,
    description: false,
    level: false,
    spacing: false,
    typography: false,
    container: false,
    placement: false,
    dates: false,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const applicableGroups = APPLICABLE[sectionType] || Object.keys(openGroups);
  const allowedArrangements = ALLOWED_ARRANGEMENT_MODES[sectionType] || [
    "list",
    "inline",
    "grid",
    "tags",
    "timeline",
  ];

  // Helper to render collapsible group container
  const renderGroupWrapper = (
    key: keyof SectionDesign,
    title: string,
    icon: React.ReactNode,
    content: React.ReactNode
  ) => {
    if (!applicableGroups.includes(key)) return null;

    const isOpen = openGroups[key];
    const isOverridden = !isGlobalDefaultsMode && isGroupOverridden(key, overrides, globalDefaults);

    return (
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900/60 overflow-hidden mb-3 shadow-2xs">
        <div
          onClick={() => toggleGroup(key)}
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors select-none"
        >
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 dark:text-neutral-400">{icon}</span>
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
              {title}
            </span>
            {isOverridden && (
              <span
                className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 inline-block"
                title="Customized for this section"
              />
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isOverridden && onResetGroup && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onResetGroup(key);
                }}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                title="Reset group to global defaults"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
            {isOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            )}
          </div>
        </div>

        {isOpen && <div className="p-3 pt-1 border-t border-neutral-100 dark:border-neutral-800 space-y-3">{content}</div>}
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // 1. Heading Controls
  // -------------------------------------------------------------------------
  const renderHeadingControls = () => {
    const h = resolved.heading;
    return renderGroupWrapper(
      "heading",
      "Heading Styling",
      <Heading className="w-3.5 h-3.5" />,
      <div className="space-y-3 text-xs">
        {/* Visibility */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">Show Heading</span>
          <button
            type="button"
            onClick={() =>
              onChange({
                heading: { ...h, visible: !h.visible },
              })
            }
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
              h.visible
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
            }`}
          >
            {h.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{h.visible ? "Visible" : "Hidden"}</span>
          </button>
        </div>

        {/* Style */}
        <div>
          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
            Border & Rule Style
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: "underline", label: "Underline" },
                { id: "full-rule", label: "Full Rule" },
                { id: "bar-left", label: "Left Bar" },
                { id: "box", label: "Tinted Box" },
                { id: "accent-bg", label: "Solid Pill" },
                { id: "plain", label: "Plain" },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => onChange({ heading: { ...h, style: st.id } })}
                className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium text-center transition-all ${
                  h.style === st.id
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 shadow-2xs"
                    : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Case & Alignment */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Case
            </label>
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5">
              {(["none", "uppercase", "capitalize"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ heading: { ...h, case: c } })}
                  className={`flex-1 py-1 text-[10px] font-medium rounded capitalize transition-colors ${
                    h.case === c
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Alignment
            </label>
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5">
              {(
                [
                  { id: "left", icon: <AlignLeft className="w-3.5 h-3.5 mx-auto" /> },
                  { id: "center", icon: <AlignCenter className="w-3.5 h-3.5 mx-auto" /> },
                  { id: "right", icon: <AlignRight className="w-3.5 h-3.5 mx-auto" /> },
                ] as const
              ).map((al) => (
                <button
                  key={al.id}
                  type="button"
                  onClick={() => onChange({ heading: { ...h, align: al.id } })}
                  className={`flex-1 py-1 text-[10px] rounded transition-colors ${
                    h.align === al.id
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                  }`}
                >
                  {al.icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Heading Color */}
        <div>
          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
            Heading Color
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChange({ heading: { ...h, color: "accent" } })}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                h.color === "accent" || h.color === accentColor
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 shadow-2xs"
                  : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
              <span>Theme Accent</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ heading: { ...h, color: "text" } })}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                h.color === "text" || h.color === textColor
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 shadow-2xs"
                  : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: textColor }} />
              <span>Body Text</span>
            </button>

            {COLOR_PALETTES.map((pal) => (
              <button
                key={pal.name}
                type="button"
                onClick={() => onChange({ heading: { ...h, color: pal.hex } })}
                title={pal.name}
                className={`p-1 rounded-lg border transition-all ${
                  h.color?.toLowerCase() === pal.hex.toLowerCase()
                    ? "border-neutral-900 dark:border-neutral-100 ring-2 ring-neutral-900/20"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400"
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full block" style={{ backgroundColor: pal.hex }} />
              </button>
            ))}

            <div className="flex items-center gap-1 ml-auto">
              <span className="text-[10px] text-neutral-500">Custom:</span>
              <input
                type="color"
                value={
                  h.color === "accent"
                    ? accentColor
                    : h.color === "text"
                    ? textColor
                    : h.color?.startsWith("#")
                    ? h.color
                    : accentColor
                }
                onChange={(e) => onChange({ heading: { ...h, color: e.target.value } })}
                className="w-6 h-6 rounded border border-neutral-300 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Font size & Rule thickness sliders */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-neutral-600 dark:text-neutral-400">Font Size</span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100">{h.fontSize}pt</span>
            </div>
            <input
              type="range"
              min="9"
              max="18"
              step="0.5"
              value={h.fontSize}
              onChange={(e) =>
                onChange({ heading: { ...h, fontSize: parseFloat(e.target.value) } })
              }
              className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-neutral-600 dark:text-neutral-400">Rule Thickness</span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100">{h.ruleThickness}pt</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.5"
              value={h.ruleThickness}
              onChange={(e) =>
                onChange({ heading: { ...h, ruleThickness: parseFloat(e.target.value) } })
              }
              className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
            />
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // 2. Arrangement Controls
  // -------------------------------------------------------------------------
  const renderArrangementControls = () => {
    const arr = resolved.arrangement;
    return renderGroupWrapper(
      "arrangement",
      "Item Arrangement / Layout",
      <LayoutGrid className="w-3.5 h-3.5" />,
      <div className="space-y-3 text-xs">
        <div>
          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
            Display Mode
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {(
              [
                { id: "list", label: "List (Stacked)", desc: "Standard vertical" },
                { id: "timeline", label: "Timeline", desc: "Date rail & dots" },
                { id: "grid", label: "Grid", desc: "Multi-column" },
                { id: "tags", label: "Tags / Chips", desc: "Pills / Bubbles" },
                { id: "inline", label: "Inline", desc: "Flowing line" },
              ] as const
            )
              .filter((mode) => allowedArrangements.includes(mode.id))
              .map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onChange({ arrangement: { ...arr, mode: mode.id } })}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    arr.mode === mode.id
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 shadow-2xs"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <div className="font-bold text-[11px]">{mode.label}</div>
                  <div className="text-[9px] opacity-70">{mode.desc}</div>
                </button>
              ))}
          </div>
        </div>

        {/* Grid columns */}
        {arr.mode === "grid" && (
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Columns Count
            </label>
            <div className="flex gap-2">
              {([2, 3, 4] as const).map((cols) => (
                <button
                  key={cols}
                  type="button"
                  onClick={() => onChange({ arrangement: { ...arr, gridColumns: cols } })}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    arr.gridColumns === cols
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {cols} Columns
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tag style */}
        {arr.mode === "tags" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                Badge Style
              </label>
              <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5">
                {(["soft", "filled", "outline"] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => onChange({ arrangement: { ...arr, tagStyle: style } })}
                    className={`flex-1 py-1 text-[10px] font-medium capitalize rounded transition-colors ${
                      arr.tagStyle === style
                        ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                        : "text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-neutral-600 dark:text-neutral-400">Corner Radius</span>
                <span className="font-mono text-neutral-900 dark:text-neutral-100">{arr.tagRadius}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="16"
                value={arr.tagRadius}
                onChange={(e) =>
                  onChange({ arrangement: { ...arr, tagRadius: parseInt(e.target.value) } })
                }
                className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Inline separator */}
        {arr.mode === "inline" && (
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Inline Separator
            </label>
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {(
                [
                  { id: "bullet", label: "• Bullet" },
                  { id: "comma", label: ", Comma" },
                  { id: "pipe", label: "| Pipe" },
                  { id: "slash", label: "/ Slash" },
                  { id: "space", label: "Space" },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChange({ arrangement: { ...arr, inlineSeparator: s.id } })}
                  className={`py-1 rounded-lg border text-[11px] font-medium ${
                    arr.inlineSeparator === s.id
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // 3. Entry Layout Controls
  // -------------------------------------------------------------------------
  const renderEntryControls = () => {
    const ent = resolved.entry;
    return renderGroupWrapper(
      "entry",
      "Item Header (Role / Degree / Dates)",
      <Sliders className="w-3.5 h-3.5" />,
      <div className="space-y-3 text-xs">
        <div>
          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
            Header Layout
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { id: "title-date-row", label: "Title ... Date Row", desc: "Subtitle below" },
                { id: "two-line-split", label: "2-Line Split", desc: "Title...Date / Sub...Loc" },
                { id: "date-left-column", label: "Date Left Column", desc: "Dedicated date column" },
                { id: "single-line", label: "Compact Single-Line", desc: "All in one line" },
                { id: "stacked", label: "Stacked", desc: "Title / Sub / Date vertically" },
              ] as const
            ).map((layout) => (
              <button
                key={layout.id}
                type="button"
                onClick={() => onChange({ entry: { ...ent, layout: layout.id } })}
                className={`p-2 rounded-lg border text-left transition-all ${
                  ent.layout === layout.id
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 shadow-2xs"
                    : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <div className="font-bold text-[11px]">{layout.label}</div>
                <div className="text-[9px] opacity-70">{layout.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Ordering */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Field Order
            </label>
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5">
              {(
                [
                  { id: "title-first", label: "Title First" },
                  { id: "subtitle-first", label: "Company First" },
                ] as const
              ).map((ord) => (
                <button
                  key={ord.id}
                  type="button"
                  onClick={() => onChange({ entry: { ...ent, order: ord.id } })}
                  className={`flex-1 py-1 text-[10px] font-medium rounded transition-colors ${
                    ent.order === ord.id
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {ord.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Subtitle Style
            </label>
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5">
              {(["normal", "italic", "accent", "muted"] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => onChange({ entry: { ...ent, subtitleStyle: style } })}
                  className={`flex-1 py-1 text-[10px] font-medium capitalize rounded transition-colors ${
                    ent.subtitleStyle === style
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // 4. Bullets & Description Controls
  // -------------------------------------------------------------------------
  const renderDescriptionControls = () => {
    const d = resolved.description;
    return renderGroupWrapper(
      "description",
      "Bullets & Description",
      <List className="w-3.5 h-3.5" />,
      <div className="space-y-3 text-xs">
        <div>
          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
            Bullet Symbol
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 text-center font-mono">
            {(
              [
                { id: "disc", label: "• Disc" },
                { id: "dash", label: "– Dash" },
                { id: "arrow", label: "▸ Arrow" },
                { id: "square", label: "▪ Square" },
                { id: "check", label: "✓ Check" },
                { id: "numbered", label: "1. Num" },
                { id: "none", label: "None" },
              ] as const
            ).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onChange({ description: { ...d, bulletStyle: b.id } })}
                className={`py-1.5 rounded-lg border text-[11px] font-medium ${
                  d.bulletStyle === b.id
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-neutral-600 dark:text-neutral-400">Bullet Indent</span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100">{d.indent}pt</span>
            </div>
            <input
              type="range"
              min="0"
              max="28"
              value={d.indent}
              onChange={(e) =>
                onChange({ description: { ...d, indent: parseInt(e.target.value) } })
              }
              className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-neutral-600 dark:text-neutral-400">Bullet Spacing</span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100">{d.bulletSpacing}pt</span>
            </div>
            <input
              type="range"
              min="0"
              max="8"
              step="0.5"
              value={d.bulletSpacing}
              onChange={(e) =>
                onChange({ description: { ...d, bulletSpacing: parseFloat(e.target.value) } })
              }
              className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
            />
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // 5. Level Indicator Controls
  // -------------------------------------------------------------------------
  const renderLevelControls = () => {
    const lvl = resolved.level;
    return renderGroupWrapper(
      "level",
      "Proficiency Level Display",
      <Sparkles className="w-3.5 h-3.5" />,
      <div className="space-y-3 text-xs">
        <div>
          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
            Display Style
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {(
              [
                { id: "none", label: "None" },
                { id: "text", label: "Text Label" },
                { id: "dots", label: "5 Dots" },
                { id: "bar", label: "Progress Bar" },
                { id: "stars", label: "Stars" },
              ] as const
            ).map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onChange({ level: { ...lvl, display: l.id } })}
                className={`py-1.5 rounded-lg border text-[11px] font-medium text-center ${
                  lvl.display === l.id
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // 6. Spacing Controls
  // -------------------------------------------------------------------------
  const renderSpacingControls = () => {
    const sp = resolved.spacing;
    return renderGroupWrapper(
      "spacing",
      "Spacing & Padding",
      <Sliders className="w-3.5 h-3.5" />,
      <div className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-neutral-600 dark:text-neutral-400">Bottom Margin</span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100">{sp.marginBottom}pt</span>
            </div>
            <input
              type="range"
              min="4"
              max="28"
              value={sp.marginBottom}
              onChange={(e) =>
                onChange({ spacing: { ...sp, marginBottom: parseInt(e.target.value) } })
              }
              className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-neutral-600 dark:text-neutral-400">Item Gap</span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100">{sp.itemSpacing}pt</span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              value={sp.itemSpacing}
              onChange={(e) =>
                onChange({ spacing: { ...sp, itemSpacing: parseInt(e.target.value) } })
              }
              className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
            />
          </div>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // 7. Container / Placement Controls
  // -------------------------------------------------------------------------
  const renderPlacementControls = () => {
    const pl = resolved.placement;
    const cnt = resolved.container;
    return renderGroupWrapper(
      "placement",
      "Placement & Column Span",
      <Columns className="w-3.5 h-3.5" />,
      <div className="space-y-3 text-xs">
        {/* Full width toggle */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-neutral-800 dark:text-neutral-200">
              Span Both Columns (Full Width)
            </div>
            <div className="text-[10px] text-neutral-500">
              Renders above two-column layout in full width
            </div>
          </div>
          <input
            type="checkbox"
            checked={pl.fullWidth}
            onChange={(e) => onChange({ placement: { ...pl, fullWidth: e.target.checked } })}
            className="w-4 h-4 rounded text-neutral-900 dark:text-neutral-100 accent-neutral-900"
          />
        </div>

        {/* Page break before */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-neutral-800 dark:text-neutral-200">
              Page Break Before Section
            </div>
            <div className="text-[10px] text-neutral-500">
              Forces this section to begin on a new page
            </div>
          </div>
          <input
            type="checkbox"
            checked={pl.pageBreakBefore}
            onChange={(e) => onChange({ placement: { ...pl, pageBreakBefore: e.target.checked } })}
            className="w-4 h-4 rounded text-neutral-900 dark:text-neutral-100 accent-neutral-900"
          />
        </div>

        {/* Keep together */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-neutral-800 dark:text-neutral-200">
              Keep Section Together
            </div>
            <div className="text-[10px] text-neutral-500">
              Prevents awkward page breaks through this section
            </div>
          </div>
          <input
            type="checkbox"
            checked={pl.keepTogether}
            onChange={(e) => onChange({ placement: { ...pl, keepTogether: e.target.checked } })}
            className="w-4 h-4 rounded text-neutral-900 dark:text-neutral-100 accent-neutral-900"
          />
        </div>

        {/* Container background & border */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Container Border
            </label>
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5">
              {(
                [
                  { id: "none", label: "None" },
                  { id: "left-accent", label: "Left Accent" },
                  { id: "full", label: "Full Box" },
                ] as const
              ).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onChange({ container: { ...cnt, border: b.id } })}
                  className={`flex-1 py-1 text-[10px] font-medium rounded transition-colors ${
                    cnt.border === b.id
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Background
            </label>
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5">
              {(
                [
                  { id: "none", label: "None" },
                  { id: "soft-accent", label: "Soft Tint" },
                ] as const
              ).map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => onChange({ container: { ...cnt, background: bg.id } })}
                  className={`flex-1 py-1 text-[10px] font-medium rounded transition-colors ${
                    cnt.background === bg.id
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {renderHeadingControls()}
      {renderArrangementControls()}
      {renderEntryControls()}
      {renderDescriptionControls()}
      {renderLevelControls()}
      {renderSpacingControls()}
      {renderPlacementControls()}
    </div>
  );
};
