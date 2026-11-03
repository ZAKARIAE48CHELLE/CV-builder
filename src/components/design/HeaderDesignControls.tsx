"use client";

import React from "react";
import { HeaderDesign } from "@/lib/schema";
import { COLOR_PALETTES } from "@/config";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  Layout,
  Type,
  Sliders,
  Phone,
} from "lucide-react";

interface HeaderDesignControlsProps {
  design: HeaderDesign;
  templateDefaultHeader: HeaderDesign;
  accentColor: string;
  textColor: string;
  onChange: (patch: Partial<HeaderDesign>) => void;
  onReset: () => void;
}

export const HeaderDesignControls: React.FC<HeaderDesignControlsProps> = ({
  design,
  templateDefaultHeader,
  accentColor,
  textColor,
  onChange,
  onReset,
}) => {
  return (
    <div className="space-y-5 text-xs pb-6">
      {/* Reset button bar */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h4 className="font-bold text-neutral-900 dark:text-neutral-100">
            Header & Personal Info Design
          </h4>
          <p className="text-[11px] text-neutral-500">
            Configure layout, typography, contact row styles, and photo options.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold"
          title="Reset header to template defaults"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* 1. Header Layout */}
      <div>
        <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-2 flex items-center gap-1.5">
          <Layout className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Header Layout
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: "stacked", label: "Stacked", desc: "Classic vertical flow" },
              { id: "name-left-contact-right", label: "Split Row", desc: "Name left, contact right" },
              { id: "banner", label: "Accent Banner", desc: "Full colored band" },
            ] as const
          ).map((lay) => (
            <button
              key={lay.id}
              type="button"
              onClick={() => onChange({ layout: lay.id })}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                design.layout === lay.id
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 shadow-2xs"
                  : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              }`}
            >
              <div className="font-bold text-[11px]">{lay.label}</div>
              <div className="text-[9px] opacity-70 mt-0.5">{lay.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Alignment */}
      <div>
        <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1.5">
          Alignment
        </label>
        <div className="flex rounded-xl border border-neutral-200 dark:border-neutral-700 p-0.5 max-w-xs">
          {(
            [
              { id: "left", label: "Left", icon: <AlignLeft className="w-3.5 h-3.5" /> },
              { id: "center", label: "Center", icon: <AlignCenter className="w-3.5 h-3.5" /> },
              { id: "right", label: "Right", icon: <AlignRight className="w-3.5 h-3.5" /> },
            ] as const
          ).map((al) => (
            <button
              key={al.id}
              type="button"
              onClick={() => onChange({ align: al.id })}
              className={`flex-1 py-1.5 inline-flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg transition-colors ${
                design.align === al.id
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-2xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
              }`}
            >
              {al.icon}
              <span>{al.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Name & Job Title Typography */}
      <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-3">
        <div className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Name & Title Typography
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-neutral-600 dark:text-neutral-400">Name Size</span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100">{design.nameSize}pt</span>
            </div>
            <input
              type="range"
              min="14"
              max="32"
              step="1"
              value={design.nameSize}
              onChange={(e) => onChange({ nameSize: parseInt(e.target.value) })}
              className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-neutral-600 dark:text-neutral-400">Job Title Size</span>
              <span className="font-mono text-neutral-900 dark:text-neutral-100">{design.jobTitleSize}pt</span>
            </div>
            <input
              type="range"
              min="9"
              max="16"
              step="0.5"
              value={design.jobTitleSize}
              onChange={(e) => onChange({ jobTitleSize: parseFloat(e.target.value) })}
              className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Name Case
            </label>
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5">
              {(["none", "uppercase"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ nameCase: c })}
                  className={`flex-1 py-1 text-[11px] font-medium capitalize rounded transition-colors ${
                    design.nameCase === c
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Job Title Color
            </label>
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5">
              {(["text", "accent", "muted"] as const).map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => onChange({ jobTitleColor: col })}
                  className={`flex-1 py-1 text-[11px] font-medium capitalize rounded transition-colors ${
                    design.jobTitleColor === col
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Name Color */}
        <div className="pt-1">
          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
            Name Color
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChange({ nameColor: "accent" })}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                design.nameColor === "accent" || !design.nameColor || design.nameColor === accentColor
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 shadow-2xs"
                  : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
              <span>Theme Accent</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ nameColor: "text" })}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                design.nameColor === "text" || design.nameColor === textColor
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
                onClick={() => onChange({ nameColor: pal.hex })}
                title={pal.name}
                className={`p-1 rounded-lg border transition-all ${
                  design.nameColor?.toLowerCase() === pal.hex.toLowerCase()
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
                  design.nameColor === "accent" || !design.nameColor
                    ? accentColor
                    : design.nameColor === "text"
                    ? textColor
                    : design.nameColor.startsWith("#")
                    ? design.nameColor
                    : accentColor
                }
                onChange={(e) => onChange({ nameColor: e.target.value })}
                className="w-6 h-6 rounded border border-neutral-300 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Contact Row Styles */}
      <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-3">
        <div className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Contact Info Arrangement
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {(
            [
              { id: "row", label: "Single Row" },
              { id: "column", label: "Column" },
              { id: "grid-2", label: "2 Columns" },
              { id: "grid-3", label: "3 Columns" },
            ] as const
          ).map((arr) => (
            <button
              key={arr.id}
              type="button"
              onClick={() => onChange({ contactArrangement: arr.id })}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium text-center transition-all ${
                design.contactArrangement === arr.id
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
              }`}
            >
              {arr.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              Contact Separator
            </label>
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5">
              {(
                [
                  { id: "bullet", label: "• Bullet" },
                  { id: "pipe", label: "| Pipe" },
                  { id: "none", label: "None" },
                ] as const
              ).map((sep) => (
                <button
                  key={sep.id}
                  type="button"
                  onClick={() => onChange({ contactSeparator: sep.id })}
                  className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors ${
                    design.contactSeparator === sep.id
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {sep.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <span className="font-semibold text-[11px] text-neutral-700 dark:text-neutral-300">
              Show Contact Icons
            </span>
            <input
              type="checkbox"
              checked={design.contactIcons}
              onChange={(e) => onChange({ contactIcons: e.target.checked })}
              className="w-4 h-4 rounded text-neutral-900 dark:text-neutral-100 accent-neutral-900"
            />
          </div>
        </div>
      </div>

      {/* 5. Photo Controls */}
      <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Photo Settings
          </div>
          <input
            type="checkbox"
            checked={design.photo.show}
            onChange={(e) =>
              onChange({ photo: { ...design.photo, show: e.target.checked } })
            }
            className="w-4 h-4 rounded text-neutral-900 dark:text-neutral-100 accent-neutral-900"
          />
        </div>

        {design.photo.show && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Shape
                </label>
                <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5">
                  {(["circle", "rounded", "square"] as const).map((sh) => (
                    <button
                      key={sh}
                      type="button"
                      onClick={() => onChange({ photo: { ...design.photo, shape: sh } })}
                      className={`flex-1 py-1 text-[11px] font-medium capitalize rounded transition-colors ${
                        design.photo.shape === sh
                          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                          : "text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      {sh}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  Position
                </label>
                <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5">
                  {(["left", "right", "top"] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => onChange({ photo: { ...design.photo, position: pos } })}
                      className={`flex-1 py-1 text-[11px] font-medium capitalize rounded transition-colors ${
                        design.photo.position === pos
                          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                          : "text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-neutral-600 dark:text-neutral-400">Photo Size</span>
                <span className="font-mono text-neutral-900 dark:text-neutral-100">{design.photo.size}pt</span>
              </div>
              <input
                type="range"
                min="32"
                max="90"
                step="2"
                value={design.photo.size}
                onChange={(e) =>
                  onChange({ photo: { ...design.photo, size: parseInt(e.target.value) } })
                }
                className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* 6. Spacing Below */}
      <div>
        <div className="flex justify-between text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
          <span>Header Spacing Below</span>
          <span className="font-mono text-neutral-900 dark:text-neutral-100">{design.spacingBelow}pt</span>
        </div>
        <input
          type="range"
          min="4"
          max="36"
          step="1"
          value={design.spacingBelow}
          onChange={(e) => onChange({ spacingBelow: parseInt(e.target.value) })}
          className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer"
        />
      </div>
    </div>
  );
};
