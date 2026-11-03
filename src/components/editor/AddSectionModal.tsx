"use client";

import React, { useState } from "react";
import { SectionType, SECTION_META } from "@/lib/schema";
import {
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderGit2,
  Globe,
  Award,
  Trophy,
  BookOpen,
  Heart,
  Sparkles,
  Users,
  ListPlus,
  X,
} from "lucide-react";

interface AddSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSection: (type: SectionType, customHeading?: string) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  User: <User className="w-5 h-5" />,
  Briefcase: <Briefcase className="w-5 h-5" />,
  GraduationCap: <GraduationCap className="w-5 h-5" />,
  Wrench: <Wrench className="w-5 h-5" />,
  FolderGit2: <FolderGit2 className="w-5 h-5" />,
  Globe: <Globe className="w-5 h-5" />,
  Award: <Award className="w-5 h-5" />,
  Trophy: <Trophy className="w-5 h-5" />,
  BookOpen: <BookOpen className="w-5 h-5" />,
  Heart: <Heart className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
  Users: <Users className="w-5 h-5" />,
  ListPlus: <ListPlus className="w-5 h-5" />,
};

export const AddSectionModal: React.FC<AddSectionModalProps> = ({
  isOpen,
  onClose,
  onAddSection,
}) => {
  const [customHeading, setCustomHeading] = useState("");
  const [selectedType, setSelectedType] = useState<SectionType | null>(null);

  if (!isOpen) return null;

  const handleSelect = (type: SectionType) => {
    if (type === "custom") {
      setSelectedType("custom");
    } else {
      onAddSection(type);
      onClose();
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    onAddSection("custom", customHeading.trim() || "Custom Section");
    setCustomHeading("");
    setSelectedType(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-lg w-full p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Add New Section
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Choose from standardized resume sections or create a custom one.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {selectedType === "custom" ? (
          <form onSubmit={handleAddCustom} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Custom Section Heading
              </label>
              <input
                type="text"
                autoFocus
                value={customHeading}
                onChange={(e) => setCustomHeading(e.target.value)}
                placeholder="e.g. Leadership, Patents, Speaking, Military Service"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedType(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90"
              >
                Add Custom Section
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4 max-h-[60vh] overflow-y-auto p-1">
            {(Object.keys(SECTION_META) as SectionType[]).map((type) => {
              const meta = SECTION_META[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSelect(type)}
                  className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-all text-center group"
                >
                  <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 group-hover:scale-110 transition-transform mb-2">
                    {ICON_MAP[meta.iconName] || <ListPlus className="w-5 h-5" />}
                  </div>
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
