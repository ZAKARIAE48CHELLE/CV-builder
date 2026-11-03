"use client";

import React, { useState, useEffect } from "react";
import { Resume, SectionType } from "@/lib/schema";
import { useFolioStore } from "@/lib/store";
import { PersonalInfoForm } from "./PersonalInfoForm";
import { SectionCard } from "./SectionCard";
import { AddSectionModal } from "./AddSectionModal";
import { DesignPanel } from "../design/DesignPanel";
import { AiAssistantPanel } from "./AiAssistantPanel";
import {
  FileText,
  Palette,
  Sparkles,
  Plus,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

interface EditorPanelProps {
  resume: Resume;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ resume }) => {
  const [activeTab, setActiveTab] = useState<"content" | "design" | "ai">("content");
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);

  const {
    settings,
    userProfile,
    selectedDesignTarget,
    setSelectedDesignTarget,
    updatePersonalInfo,
    updateDesign,
    resetDesignToDefaults,
    addSection,
    removeSection,
    updateSectionHeading,
    updateSectionIcon,
    toggleSectionVisibility,
    reorderSections,
    moveSectionColumn,
    addItem,
    updateItem,
    removeItem,
    duplicateItem,
    toggleItemVisibility,
    reorderItems,
    updateResume,
  } = useFolioStore();

  // Auto-switch to design tab when user clicks header or a section in the live preview
  useEffect(() => {
    if (selectedDesignTarget) {
      setActiveTab("design");
    }
  }, [selectedDesignTarget]);

  const hasAiConfigured = Boolean(
    (settings.aiApiKey && settings.aiApiKey.trim().length > 0) ||
      settings.aiProvider === "ollama" ||
      userProfile?.ai_shared_key_allowed
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  const handleDragEndSections = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = resume.sections.findIndex((s) => s.id === active.id);
    const newIndex = resume.sections.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(resume.sections, oldIndex, newIndex);
    reorderSections(resume.id, reordered.map((s) => s.id));
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("content")}
          className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "content"
              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Content
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("design")}
          className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "design"
              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs"
              : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          Design
        </button>

        {hasAiConfigured && (
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "ai"
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            AI Assistant
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {activeTab === "content" && (
          <div className="space-y-4 max-w-2xl mx-auto">
            {/* Personal Details Form */}
            <PersonalInfoForm
              personal={resume.personal}
              onChange={(patch) => updatePersonalInfo(resume.id, patch)}
            />

            {/* Sections List with Drag & Drop */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndSections}
            >
              <SortableContext
                items={resume.sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 pt-2">
                  {resume.sections.map((section) => (
                    <SectionCard
                      key={section.id}
                      section={section}
                      resumeId={resume.id}
                      onUpdateHeading={(h) => updateSectionHeading(resume.id, section.id, h)}
                      onUpdateIcon={(icon) => updateSectionIcon(resume.id, section.id, icon)}
                      onToggleVisibility={() => toggleSectionVisibility(resume.id, section.id)}
                      onDeleteSection={() => removeSection(resume.id, section.id)}
                      onMoveColumn={(col) => moveSectionColumn(resume.id, section.id, col)}
                      onAddItem={(patch) => addItem(resume.id, section.id, patch)}
                      onUpdateItem={(itemId, patch) =>
                        updateItem(resume.id, section.id, itemId, patch)
                      }
                      onRemoveItem={(itemId) => removeItem(resume.id, section.id, itemId)}
                      onDuplicateItem={(itemId) => duplicateItem(resume.id, section.id, itemId)}
                      onToggleItemVisibility={(itemId) =>
                        toggleItemVisibility(resume.id, section.id, itemId)
                      }
                      onReorderItems={(itemIds) => reorderItems(resume.id, section.id, itemIds)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add Section Button */}
            <div className="pt-3">
              <button
                type="button"
                onClick={() => setIsAddSectionOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800/80 hover:border-neutral-400 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Add Section (Experience, Education, Skills, Custom...)
              </button>
            </div>
          </div>
        )}

        {activeTab === "design" && (
          <div className="max-w-2xl mx-auto">
            <DesignPanel
              resume={resume}
              selectedTarget={selectedDesignTarget}
              onSelectTarget={setSelectedDesignTarget}
              onUpdateDesign={(patch) => updateDesign(resume.id, patch)}
              onResetDefaults={() => resetDesignToDefaults(resume.id)}
              onUpdateTemplate={(tmplId) => {
                updateResume(resume.id, (draft) => {
                  draft.templateId = tmplId;
                  return draft;
                });
              }}
              onMoveSectionColumn={(sectionId, col) => moveSectionColumn(resume.id, sectionId, col)}
            />
          </div>
        )}

        {activeTab === "ai" && hasAiConfigured && (
          <div className="max-w-2xl mx-auto">
            <AiAssistantPanel resume={resume} />
          </div>
        )}
      </div>

      {/* Add Section Modal */}
      <AddSectionModal
        isOpen={isAddSectionOpen}
        onClose={() => setIsAddSectionOpen(false)}
        onAddSection={(type, customHeading) => addSection(resume.id, type, customHeading)}
      />
    </div>
  );
};
