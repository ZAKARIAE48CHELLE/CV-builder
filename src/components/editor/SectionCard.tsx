"use client";

import React, { useState } from "react";
import { Section, SectionItem, SectionType, SECTION_META } from "@/lib/schema";
import { SectionItemEditor } from "./SectionItemEditor";
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Columns,
  Sparkles,
  Slash,
} from "lucide-react";
import {
  AVAILABLE_SECTION_ICONS,
  getSectionIconComponent,
} from "@/components/common/SectionIcon";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

interface SectionCardProps {
  section: Section;
  resumeId: string;
  onUpdateHeading: (newHeading: string) => void;
  onUpdateIcon?: (icon?: string) => void;
  onToggleVisibility: () => void;
  onDeleteSection: () => void;
  onMoveColumn: (column: "main" | "side") => void;
  onAddItem: (itemPatch?: Partial<SectionItem>) => void;
  onUpdateItem: (itemId: string, patch: Partial<SectionItem>) => void;
  onRemoveItem: (itemId: string) => void;
  onDuplicateItem: (itemId: string) => void;
  onToggleItemVisibility: (itemId: string) => void;
  onReorderItems: (newItemIds: string[]) => void;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  section,
  onUpdateHeading,
  onUpdateIcon,
  onToggleVisibility,
  onDeleteSection,
  onMoveColumn,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onDuplicateItem,
  onToggleItemVisibility,
  onReorderItems,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditingHeading, setIsEditingHeading] = useState(false);
  const [headingInput, setHeadingInput] = useState(section.heading);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  const itemSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const handleDragEndItems = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = section.items.findIndex((i) => i.id === active.id);
    const newIndex = section.items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(section.items, oldIndex, newIndex);
    onReorderItems(reordered.map((i) => i.id));
  };

  const meta = SECTION_META[section.type] || {
    label: section.heading,
    defaultHeading: section.heading,
  };

  const handleHeadingBlur = () => {
    setIsEditingHeading(false);
    if (headingInput.trim() && headingInput !== section.heading) {
      onUpdateHeading(headingInput.trim());
    } else {
      setHeadingInput(section.heading);
    }
  };

  const currentIconKey = section.icon !== undefined ? section.icon : meta.iconName;
  const CurrentIconComponent = getSectionIconComponent(currentIconKey);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border transition-all ${
        section.visible === false
          ? "border-neutral-200 dark:border-neutral-800 bg-neutral-100/40 dark:bg-neutral-900/40 opacity-70"
          : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs"
      }`}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-neutral-100 dark:border-neutral-800/80">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 touch-none"
            title="Drag to reorder section"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Section Icon Picker Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsIconPickerOpen((prev) => !prev)}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200 transition-colors flex items-center justify-center"
              title={
                currentIconKey === "none"
                  ? "Select section icon"
                  : `Change section icon (${currentIconKey})`
              }
            >
              {CurrentIconComponent ? (
                <CurrentIconComponent className="w-3.5 h-3.5" />
              ) : (
                <Slash className="w-3.5 h-3.5 text-neutral-400" />
              )}
            </button>

            {isIconPickerOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsIconPickerOpen(false)}
                />
                <div className="absolute left-0 mt-2 z-50 w-64 p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100 dark:border-neutral-800">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Header Icon
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateIcon?.("none");
                        setIsIconPickerOpen(false);
                      }}
                      className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Slash className="w-3 h-3" /> None
                    </button>
                  </div>
                  <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto pr-1">
                    {AVAILABLE_SECTION_ICONS.map((item) => {
                      const IconComp = item.icon;
                      const isSelected = currentIconKey === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onUpdateIcon?.(item.id);
                            setIsIconPickerOpen(false);
                          }}
                          className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 ring-2 ring-neutral-900 dark:ring-neutral-100"
                              : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                          }`}
                          title={item.label}
                        >
                          <IconComp className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {isEditingHeading ? (
            <input
              type="text"
              autoFocus
              value={headingInput}
              onChange={(e) => setHeadingInput(e.target.value)}
              onBlur={handleHeadingBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleHeadingBlur();
                if (e.key === "Escape") {
                  setIsEditingHeading(false);
                  setHeadingInput(section.heading);
                }
              }}
              className="text-sm font-bold px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
            />
          ) : (
            <span
              onClick={() => setIsEditingHeading(true)}
              className="text-sm font-bold text-neutral-900 dark:text-neutral-100 cursor-pointer hover:underline flex items-center gap-1.5"
              title="Click to edit section heading"
            >
              {section.heading}
              <span className="text-[10px] text-neutral-400 font-normal">
                ({meta.label})
              </span>
            </span>
          )}

          {section.visible === false && (
            <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
              Hidden
            </span>
          )}
        </div>

        {/* Section Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Column Switcher (Main vs Side) */}
          <button
            type="button"
            onClick={() => onMoveColumn(section.column === "side" ? "main" : "side")}
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md border transition-colors ${
              section.column === "side"
                ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                : "bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700"
            }`}
            title="Toggle column assignment (Main vs Side column)"
          >
            <Columns className="w-3 h-3" />
            {section.column === "side" ? "Sidebar" : "Main"}
          </button>

          {/* Visibility toggle */}
          <button
            type="button"
            onClick={onToggleVisibility}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors"
            title={section.visible === false ? "Show section" : "Hide section"}
          >
            {section.visible === false ? (
              <EyeOff className="w-4 h-4 text-amber-500" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>

          {/* Delete section */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete section "${section.heading}"?`)) {
                onDeleteSection();
              }
            }}
            className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-md transition-colors"
            title="Delete section"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Collapse/Expand */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors ml-0.5"
            title={isOpen ? "Collapse section" : "Expand section"}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Section Items */}
      {isOpen && (
        <div className="p-3.5 space-y-3">
          <DndContext
            sensors={itemSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEndItems}
          >
            <SortableContext
              items={section.items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2.5">
                {section.items.map((item) => (
                  <SectionItemEditor
                    key={item.id}
                    item={item}
                    sectionType={section.type}
                    onUpdate={(patch) => onUpdateItem(item.id, patch)}
                    onDuplicate={() => onDuplicateItem(item.id)}
                    onDelete={() => onRemoveItem(item.id)}
                    onToggleVisibility={() => onToggleItemVisibility(item.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {section.items.length === 0 && (
            <div className="text-center py-5 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-400 text-xs">
              No items in this section yet.
            </div>
          )}

          <div className="pt-1">
            <button
              type="button"
              onClick={() => onAddItem()}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 hover:border-neutral-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item to {section.heading}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
