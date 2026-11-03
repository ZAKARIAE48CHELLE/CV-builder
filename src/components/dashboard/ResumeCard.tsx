"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Resume } from "@/lib/schema";
import { getTemplateById } from "@/templates/registry";
import { sanitizeFilename } from "@/lib/utils";
import {
  FileText,
  Copy,
  Trash2,
  Edit3,
  Download,
  MoreVertical,
  Check,
  Calendar,
} from "lucide-react";

interface ResumeCardProps {
  resume: Resume;
  onDuplicate: () => void;
  onRename: (newTitle: string) => void;
  onDelete: () => void;
  onExportJson: () => void;
}

export const ResumeCard: React.FC<ResumeCardProps> = ({
  resume,
  onDuplicate,
  onRename,
  onDelete,
  onExportJson,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(resume.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const template = getTemplateById(resume.templateId);
  const dateFormatted = new Date(resume.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && titleInput !== resume.title) {
      onRename(titleInput.trim());
    } else {
      setTitleInput(resume.title);
    }
  };

  return (
    <div
      className={`group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs hover:shadow-lg transition-all flex flex-col relative ${
        isMenuOpen ? "z-30" : "z-10"
      }`}
    >
      {/* Visual Mini Thumbnail Area */}
      <Link
        href={`/resume/${resume.id}`}
        className="h-44 bg-neutral-100 dark:bg-neutral-950 p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-center relative overflow-hidden rounded-t-2xl group-hover:bg-neutral-50 dark:group-hover:bg-neutral-900/50 transition-colors"
      >
        {/* Mock Miniature Document Preview */}
        <div
          className="w-28 h-36 bg-white dark:bg-neutral-900 rounded-sm shadow-md p-2 flex flex-col gap-1.5 transform group-hover:scale-105 transition-transform border border-neutral-200 dark:border-neutral-700"
          style={{ borderColor: `${resume.design.accentColor}33` }}
        >
          {/* Header line */}
          <div
            className="w-16 h-1.5 rounded-xs"
            style={{ backgroundColor: resume.design.accentColor }}
          />
          <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-xs" />
          <div className="border-b border-neutral-100 dark:border-neutral-800 my-0.5" />
          {/* Mock body lines */}
          <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-800 rounded-xs" />
          <div className="w-4/5 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-xs" />
          <div className="w-12 h-1.5 rounded-xs mt-1" style={{ backgroundColor: `${resume.design.accentColor}88` }} />
          <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-800 rounded-xs" />
          <div className="w-3/4 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-xs" />
        </div>

        <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/90 dark:bg-neutral-800/90 text-neutral-700 dark:text-neutral-300 shadow-2xs backdrop-blur-xs">
          {template.name} ({resume.design.layout === "one-column" ? "1 Col" : "2 Col"})
        </span>
      </Link>

      {/* Card Details */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                type="text"
                autoFocus
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSubmit();
                  if (e.key === "Escape") {
                    setIsEditingTitle(false);
                    setTitleInput(resume.title);
                  }
                }}
                className="w-full text-sm font-bold px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
              />
            ) : (
              <h3
                onClick={() => setIsEditingTitle(true)}
                className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate cursor-pointer hover:underline"
                title="Click to rename"
              >
                {resume.title}
              </h3>
            )}
            <p className="text-xs text-neutral-500 truncate mt-0.5">
              {resume.personal.fullName || "Candidate"} · {resume.personal.jobTitle || "Resume"}
            </p>
          </div>

          {/* More actions menu */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-44 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl py-1 z-50 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingTitle(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDuplicate();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onExportJson();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export JSON
                </button>
                <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDelete();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </>
          )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 mt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500">
          <span className="flex items-center gap-1 text-[11px]">
            <Calendar className="w-3 h-3 text-neutral-400" />
            Edited {dateFormatted}
          </span>

          <Link
            href={`/resume/${resume.id}`}
            className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 hover:underline"
          >
            Open Editor →
          </Link>
        </div>
      </div>
    </div>
  );
};
