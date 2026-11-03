"use client";

import React, { useState } from "react";
import { SectionItem, SectionType } from "@/lib/schema";
import { RichTextEditor } from "./RichTextEditor";
import {
  Eye,
  EyeOff,
  Copy,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Tag,
  Plus,
  X,
  ExternalLink,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SectionItemEditorProps {
  item: SectionItem;
  sectionType: SectionType;
  onUpdate: (patch: Partial<SectionItem>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
}

export const SectionItemEditor: React.FC<SectionItemEditorProps> = ({
  item,
  sectionType,
  onUpdate,
  onDuplicate,
  onDelete,
  onToggleVisibility,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [newTagInput, setNewTagInput] = useState("");

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const current = item.tags || [];
    if (!current.includes(newTagInput.trim())) {
      onUpdate({ tags: [...current, newTagInput.trim()] });
    }
    setNewTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const current = item.tags || [];
    onUpdate({ tags: current.filter((t) => t !== tagToRemove) });
  };

  const isSummary = sectionType === "summary";
  const isSkillsOrLanguages = sectionType === "skills" || sectionType === "languages";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border transition-all ${
        item.visible === false
          ? "border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/40 opacity-60"
          : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xs"
      }`}
    >
      {/* Item header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/30">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 touch-none"
            title="Drag to reorder item"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
            {item.title || item.subtitle || (isSummary ? "Summary Text" : "Untitled Item")}
          </span>

          {item.visible === false && (
            <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              Hidden
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleVisibility}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors"
            title={item.visible === false ? "Show in resume" : "Hide from resume"}
          >
            {item.visible === false ? (
              <EyeOff className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onDuplicate}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors"
            title="Duplicate item"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-md transition-colors"
            title="Delete item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors ml-0.5"
            title={isOpen ? "Collapse" : "Expand"}
          >
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Item Body */}
      {isOpen && (
        <div className="p-3.5 space-y-3">
          {/* Main Title & Subtitle (unless it's just a summary) */}
          {!isSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                  {sectionType === "experience"
                    ? "Job Title / Role"
                    : sectionType === "education"
                    ? "Degree / Certificate"
                    : sectionType === "skills"
                    ? "Skill Group Name"
                    : sectionType === "projects"
                    ? "Project Name"
                    : "Title"}
                </label>
                <input
                  type="text"
                  value={item.title || ""}
                  onChange={(e) => onUpdate({ title: e.target.value })}
                  placeholder={
                    sectionType === "experience"
                      ? "e.g. Lead Software Engineer"
                      : sectionType === "education"
                      ? "e.g. B.S. in Computer Science"
                      : "Title"
                  }
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                  {sectionType === "experience"
                    ? "Company / Organization"
                    : sectionType === "education"
                    ? "School / University"
                    : sectionType === "projects"
                    ? "Context / Subtitle"
                    : "Subtitle"}
                </label>
                <input
                  type="text"
                  value={item.subtitle || ""}
                  onChange={(e) => onUpdate({ subtitle: e.target.value })}
                  placeholder="e.g. Acme Corp"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-900"
                />
              </div>
            </div>
          )}

          {/* Dates & Location & Link (for experience, education, projects, awards, volunteering) */}
          {!isSummary && !isSkillsOrLanguages && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                  Start Date
                </label>
                <input
                  type="text"
                  value={item.startDate || ""}
                  onChange={(e) => onUpdate({ startDate: e.target.value })}
                  placeholder="2022-01 or 2022"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                  End Date
                </label>
                <input
                  type="text"
                  value={item.endDate || ""}
                  onChange={(e) => onUpdate({ endDate: e.target.value })}
                  placeholder="Present or 2024"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={item.location || ""}
                  onChange={(e) => onUpdate({ location: e.target.value })}
                  placeholder="e.g. Remote / New York"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                  Link / URL
                </label>
                <input
                  type="text"
                  value={item.link || ""}
                  onChange={(e) => onUpdate({ link: e.target.value })}
                  placeholder="https://..."
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-900"
                />
              </div>
            </div>
          )}

          {/* Proficiency Level (for languages or skill items) */}
          {isSkillsOrLanguages && (
            <div className="flex items-center gap-4 py-1">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                Proficiency Level (Optional):
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onUpdate({ level: item.level === lvl ? undefined : lvl })}
                    className={`w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center transition-all ${
                      item.level && item.level >= lvl
                        ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                        : "border border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-neutral-400"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
                {item.level && (
                  <button
                    type="button"
                    onClick={() => onUpdate({ level: undefined })}
                    className="text-[10px] text-neutral-400 hover:text-neutral-600 ml-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Description / Bullet Points */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1">
              {isSummary ? "Summary Text" : "Description & Accomplishments"}
            </label>
            <RichTextEditor
              value={item.description || ""}
              onChange={(html) => onUpdate({ description: html })}
              placeholder={
                isSummary
                  ? "Write a compelling career summary highlighting your core strengths and quantifiable wins..."
                  : "• Action verb + task + quantifiable result (e.g. • Engineered microservices cutting latency by 35%)..."
              }
            />
          </div>

          {/* Tags (Skills / Tech Stack) */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Tags / Keywords / Technologies
            </label>

            <div className="flex flex-wrap items-center gap-1.5">
              {item.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag + Enter"
                  className="text-xs px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-900 w-28"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="p-1 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300"
                  title="Add tag"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
