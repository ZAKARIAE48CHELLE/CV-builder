"use client";

import React, { useState, useEffect } from "react";
import {
  Resume,
  GlobalDesign,
  SectionDesign,
  HeaderDesign,
  SectionType,
} from "@/lib/schema";
import { useFolioStore } from "@/lib/store";
import { TEMPLATES, getTemplateDesignDefaults } from "@/templates/registry";
import { AVAILABLE_FONTS, COLOR_PALETTES } from "@/config";
import { resolveSectionDesign, resolveHeaderDesign } from "@/lib/design/resolve";
import { SectionDesignControls } from "./SectionDesignControls";
import { HeaderDesignControls } from "./HeaderDesignControls";
import {
  BUILT_IN_PRESETS,
  getCustomPresets,
  saveCustomPreset,
  StylePreset,
} from "@/lib/design/presets";
import {
  RotateCcw,
  Palette,
  Type,
  Layout,
  Maximize2,
  Calendar,
  Image as ImageIcon,
  Columns,
  Check,
  Copy,
  ClipboardPaste,
  Sliders,
  Share2,
  Sparkles,
  Heading,
  AlertTriangle,
  FolderDown,
  BookmarkPlus,
} from "lucide-react";

interface DesignPanelProps {
  resume: Resume;
  onUpdateDesign: (patch: Partial<GlobalDesign>) => void;
  onResetDefaults: () => void;
  onUpdateTemplate: (templateId: string) => void;
  onMoveSectionColumn: (sectionId: string, col: "main" | "side") => void;
  selectedTarget?: { type: "header" } | { type: "section"; sectionId: string } | null;
  onSelectTarget?: (target: { type: "header" } | { type: "section"; sectionId: string } | null) => void;
}

export const DesignPanel: React.FC<DesignPanelProps> = ({
  resume,
  onUpdateDesign,
  onResetDefaults,
  onUpdateTemplate,
  onMoveSectionColumn,
  selectedTarget,
  onSelectTarget,
}) => {
  const { design, templateId, sections } = resume;

  const {
    updateSectionDefaults,
    updateHeaderDesign,
    resetHeaderDesign,
    updateSectionDesign,
    resetSectionDesign,
    resetSectionDesignGroup,
    applySectionDesignToType,
    promoteSectionDesignToGlobal,
    copyStyleClipboard,
    setCopyStyleClipboard,
    customPresets,
    saveCustomPresetAction,
  } = useFolioStore();

  // Sub-tabs: "global" | "header" | "sections"
  const [subTab, setSubTab] = useState<"global" | "header" | "sections">("global");
  const [activeSectionId, setActiveSectionId] = useState<string>(
    sections[0]?.id || ""
  );

  // Sync selectedTarget from outside (e.g. click-to-select in preview)
  useEffect(() => {
    if (selectedTarget) {
      if (selectedTarget.type === "header") {
        setSubTab("header");
      } else if (selectedTarget.type === "section") {
        setSubTab("sections");
        setActiveSectionId(selectedTarget.sectionId);
      }
    }
  }, [selectedTarget]);

  // When active section changes, notify target selection
  const handleSelectSection = (secId: string) => {
    setActiveSectionId(secId);
    onSelectTarget?.({ type: "section", sectionId: secId });
  };

  const templateDefaults = getTemplateDesignDefaults(templateId);

  const currentSection = sections.find((s) => s.id === activeSectionId) || sections[0];
  const sectionOverrides = currentSection ? resume.sectionDesigns?.[currentSection.id] : undefined;
  const resolvedSection = currentSection
    ? resolveSectionDesign(templateDefaults.sectionDefaults, design, currentSection.type, sectionOverrides)
    : templateDefaults.sectionDefaults;

  const resolvedHeader = resolveHeaderDesign(
    templateDefaults.headerDefaults,
    design,
    resume.headerDesign
  );

  const applicablePresets = currentSection
    ? [...BUILT_IN_PRESETS, ...customPresets].filter(
        (p) =>
          p.applicableTypes.length === 0 ||
          p.applicableTypes.includes(currentSection.type)
      )
    : [];

  const handleApplyPreset = (presetId: string) => {
    if (!currentSection || !presetId) return;
    const preset = applicablePresets.find((p) => p.id === presetId);
    if (preset) {
      updateSectionDesign(resume.id, currentSection.id, preset.overrides);
    }
  };

  const handleSaveCustomPreset = async () => {
    if (!currentSection || !sectionOverrides) {
      alert("No custom overrides to save for this section yet!");
      return;
    }
    const name = window.prompt("Enter a name for this custom style preset:");
    if (!name || !name.trim()) return;

    const newPreset: StylePreset = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      applicableTypes: [currentSection.type],
      overrides: JSON.parse(JSON.stringify(sectionOverrides)),
    };
    await saveCustomPresetAction(newPreset);
    alert(`Preset "${newPreset.name}" saved!`);
  };

  // Copy / Paste Style
  const handleCopyStyle = () => {
    if (!currentSection || !sectionOverrides) {
      alert("No custom overrides on this section to copy.");
      return;
    }
    setCopyStyleClipboard(JSON.parse(JSON.stringify(sectionOverrides)));
    alert(`Copied style from "${currentSection.heading}".`);
  };

  const handlePasteStyle = () => {
    if (!currentSection || !copyStyleClipboard) {
      alert("Style clipboard is empty. Click 'Copy Style' on a section first.");
      return;
    }
    updateSectionDesign(resume.id, currentSection.id, copyStyleClipboard);
  };

  // ATS Risk Warnings
  const atsWarnings: string[] = [];
  if (design.baseFontSize < 8.5) {
    atsWarnings.push("Base font size is below 8.5pt. Parsers and reviewers may find this difficult to read.");
  }
  if (Object.values(resume.sectionDesigns || {}).some((s) => s.level?.display === "bar")) {
    atsWarnings.push("Level progress bars alone cannot be parsed by ATS without accompanying text ratings.");
  }
  if (Object.values(resume.sectionDesigns || {}).some((s) => s.description?.showDescription === false)) {
    atsWarnings.push("Some section descriptions are hidden and will be excluded from text extraction.");
  }

  return (
    <div className="space-y-4 pb-12">
      {/* ATS Warnings Banner */}
      {atsWarnings.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>ATS Compatibility Notice</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90 pl-1">
            {atsWarnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 p-1">
        <button
          type="button"
          onClick={() => {
            setSubTab("global");
            onSelectTarget?.(null);
          }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            subTab === "global"
              ? "bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 shadow-xs"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
          }`}
        >
          1. Global
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab("header");
            onSelectTarget?.({ type: "header" });
          }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            subTab === "header"
              ? "bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 shadow-xs"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
          }`}
        >
          2. Header
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab("sections");
            if (currentSection) {
              onSelectTarget?.({ type: "section", sectionId: currentSection.id });
            }
          }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            subTab === "sections"
              ? "bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 shadow-xs"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
          }`}
        >
          3. Sections ({sections.length})
        </button>
      </div>

      {/* =================================================================== */}
      {/* SUB-TAB 1: GLOBAL DESIGN */}
      {/* =================================================================== */}
      {subTab === "global" && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Document Layout & Global Palette
              </h3>
              <p className="text-xs text-neutral-500">
                Templates, typography, page margins, and base section defaults.
              </p>
            </div>
            <button
              type="button"
              onClick={onResetDefaults}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
              title="Reset all design properties to template defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All
            </button>
          </div>

          {/* Template Picker */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layout className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Choose Template (8 Originals)
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TEMPLATES.map((tmpl) => {
                const isSelected = templateId === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      onUpdateTemplate(tmpl.id);
                      if (tmpl.defaultLayout) {
                        onUpdateDesign({
                          layout: tmpl.defaultLayout,
                          fontFamily: tmpl.recommendedFont,
                        });
                      }
                    }}
                    className={`relative flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-neutral-900 dark:border-neutral-100 ring-2 ring-neutral-900/10 dark:ring-neutral-100/20 bg-neutral-50 dark:bg-neutral-800/80 shadow-xs"
                        : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-white dark:bg-neutral-900"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {tmpl.name}
                      </span>
                      {tmpl.badge && (
                        <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                          {tmpl.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 line-clamp-2">
                      {tmpl.description}
                    </p>
                    {isSelected && (
                      <div className="absolute bottom-2 right-2 p-0.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Layout Structure (Columns) */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Columns className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Page Layout Structure
            </label>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "one-column", label: "Single Column", desc: "Classic ATS-safe flow" },
                  { id: "two-column-left", label: "2 Columns (Left)", desc: "Left sidebar" },
                  { id: "two-column-right", label: "2 Columns (Right)", desc: "Right sidebar" },
                ] as const
              ).map((lay) => (
                <button
                  key={lay.id}
                  type="button"
                  onClick={() => onUpdateDesign({ layout: lay.id })}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    design.layout === lay.id
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 shadow-2xs"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  }`}
                >
                  <div className="font-bold text-xs">{lay.label}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{lay.desc}</div>
                </button>
              ))}
            </div>

            {design.layout !== "one-column" && (
              <div className="pt-2">
                <div className="flex justify-between text-xs mb-1 font-medium text-neutral-700 dark:text-neutral-300">
                  <span>Sidebar Column Width</span>
                  <span className="font-mono">{design.sidebarWidth}%</span>
                </div>
                <input
                  type="range"
                  min="22"
                  max="45"
                  value={design.sidebarWidth}
                  onChange={(e) => onUpdateDesign({ sidebarWidth: parseInt(e.target.value) })}
                  className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Color Palette */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Color Theme
            </label>

            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PALETTES.map((pal) => (
                <button
                  key={pal.name}
                  type="button"
                  onClick={() => onUpdateDesign({ accentColor: pal.hex })}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    design.accentColor.toLowerCase() === pal.hex.toLowerCase()
                      ? "border-neutral-900 dark:border-neutral-100 ring-2 ring-neutral-900/20 shadow-xs"
                      : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400"
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: pal.hex }} />
                  <span>{pal.name}</span>
                </button>
              ))}

              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-xs text-neutral-500">Custom:</span>
                <input
                  type="color"
                  value={design.accentColor}
                  onChange={(e) => onUpdateDesign({ accentColor: e.target.value })}
                  className="w-7 h-7 rounded border border-neutral-300 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Base Typography
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AVAILABLE_FONTS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => onUpdateDesign({ fontFamily: font.id })}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    design.fontFamily === font.id
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 shadow-2xs"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  }`}
                >
                  <div className="text-xs font-semibold">{font.name}</div>
                  <div className="text-[10px] opacity-60 mt-0.5 truncate">{font.pdfFamily}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium text-neutral-700 dark:text-neutral-300">
                  <span>Base Font Size</span>
                  <span className="font-mono">{design.baseFontSize}pt</span>
                </div>
                <input
                  type="range"
                  min="8.5"
                  max="13"
                  step="0.5"
                  value={design.baseFontSize}
                  onChange={(e) => onUpdateDesign({ baseFontSize: parseFloat(e.target.value) })}
                  className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium text-neutral-700 dark:text-neutral-300">
                  <span>Line Height</span>
                  <span className="font-mono">{design.lineHeight}</span>
                </div>
                <input
                  type="range"
                  min="1.1"
                  max="1.7"
                  step="0.05"
                  value={design.lineHeight}
                  onChange={(e) => onUpdateDesign({ lineHeight: parseFloat(e.target.value) })}
                  className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Page Setup & Margins */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Maximize2 className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Page Margins & Size
            </label>

            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5">
                {(["A4", "Letter"] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => onUpdateDesign({ pageSize: sz })}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                      design.pageSize === sz
                        ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                        : "text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                  Margins:
                </span>
                <input
                  type="range"
                  min="8"
                  max="25"
                  value={design.marginsMm.top}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    onUpdateDesign({
                      marginsMm: { top: val, right: val, bottom: val, left: val },
                    });
                  }}
                  className="flex-1 accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
                />
                <span className="text-xs font-mono text-neutral-700 dark:text-neutral-300 w-10 text-right">
                  {design.marginsMm.top}mm
                </span>
              </div>
            </div>
          </div>

          {/* Section Defaults accordion */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                Default Section Styles (Applies to All Sections)
              </h4>
              <p className="text-[11px] text-neutral-500">
                Any section that does not override these properties will inherit these defaults.
              </p>
            </div>

            <SectionDesignControls
              sectionType="custom"
              resolved={design.sectionDefaults || templateDefaults.sectionDefaults}
              globalDefaults={templateDefaults.sectionDefaults}
              accentColor={design.accentColor}
              textColor={design.textColor}
              isGlobalDefaultsMode={true}
              onChange={(patch) => updateSectionDefaults(resume.id, patch)}
            />
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 2: HEADER DESIGN */}
      {/* =================================================================== */}
      {subTab === "header" && (
        <HeaderDesignControls
          design={resolvedHeader}
          templateDefaultHeader={templateDefaults.headerDefaults}
          accentColor={design.accentColor}
          textColor={design.textColor}
          onChange={(patch) => updateHeaderDesign(resume.id, patch)}
          onReset={() => resetHeaderDesign(resume.id)}
        />
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 3: PER-SECTION DESIGN */}
      {/* =================================================================== */}
      {subTab === "sections" && (
        <div className="space-y-4">
          {/* Section Selector Pills */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-2">
              Select Section to Style
            </label>
            <div className="flex flex-wrap gap-1.5">
              {sections.map((sec) => {
                const isSelected = sec.id === activeSectionId;
                const hasOverrides = Boolean(
                  resume.sectionDesigns?.[sec.id] &&
                    Object.keys(resume.sectionDesigns[sec.id]).length > 0
                );

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleSelectSection(sec.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-900 dark:border-neutral-100 shadow-xs"
                        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400"
                    }`}
                  >
                    <span>{sec.heading}</span>
                    {hasOverrides && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? "bg-blue-300 dark:bg-blue-600" : "bg-blue-600 dark:bg-blue-400"
                        }`}
                        title="Contains customized overrides"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {currentSection && (
            <div className="space-y-4 pt-2">
              {/* Presets and Section Quick Action Bar */}
              <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Preset:
                    </span>
                    <select
                      onChange={(e) => handleApplyPreset(e.target.value)}
                      defaultValue=""
                      className="text-xs font-medium py-1 px-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 cursor-pointer"
                    >
                      <option value="" disabled>
                        Choose style preset...
                      </option>
                      {applicablePresets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveCustomPreset}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 hover:underline"
                    title="Save current section styles as reusable preset"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Save as Preset</span>
                  </button>
                </div>

                {/* Batch / Clipboard Actions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-neutral-200/60 dark:border-neutral-800/60 text-[11px]">
                  {/* Reset section */}
                  <button
                    type="button"
                    onClick={() => resetSectionDesign(resume.id, currentSection.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium"
                    title="Reset all section overrides back to global defaults"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Section</span>
                  </button>

                  {/* Copy style */}
                  <button
                    type="button"
                    onClick={handleCopyStyle}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium"
                    title="Copy this section's style overrides to clipboard"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Style</span>
                  </button>

                  {/* Paste style */}
                  {copyStyleClipboard && (
                    <button
                      type="button"
                      onClick={handlePasteStyle}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-medium"
                      title="Paste copied style overrides onto this section"
                    >
                      <ClipboardPaste className="w-3 h-3" />
                      <span>Paste Style</span>
                    </button>
                  )}

                  {/* Apply to all of this type */}
                  {sectionOverrides && (
                    <button
                      type="button"
                      onClick={() => {
                        applySectionDesignToType(
                          resume.id,
                          currentSection.type,
                          sectionOverrides
                        );
                        alert(`Applied style to all "${currentSection.type}" sections.`);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium"
                      title="Apply this section's style to all sections of the same type"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Apply to all of type</span>
                    </button>
                  )}

                  {/* Promote to global */}
                  {sectionOverrides && (
                    <button
                      type="button"
                      onClick={() => {
                        promoteSectionDesignToGlobal(resume.id, currentSection.id);
                        alert("Promoted this section's styling to global defaults!");
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium ml-auto"
                      title="Promote these overrides to be the global default for all sections"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Make Global Default</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 10 Collapsible Control Groups for the active section */}
              <SectionDesignControls
                sectionType={currentSection.type}
                resolved={resolvedSection}
                globalDefaults={design.sectionDefaults || templateDefaults.sectionDefaults}
                overrides={sectionOverrides}
                accentColor={design.accentColor}
                textColor={design.textColor}
                onChange={(patch) =>
                  updateSectionDesign(resume.id, currentSection.id, patch)
                }
                onResetGroup={(groupKey) =>
                  resetSectionDesignGroup(resume.id, currentSection.id, groupKey)
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
