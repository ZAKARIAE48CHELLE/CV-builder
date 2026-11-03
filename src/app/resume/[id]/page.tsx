"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useFolioStore } from "@/lib/store";
import { EditorPanel } from "@/components/editor/EditorPanel";
import { PreviewPanel } from "@/components/preview/PreviewPanel";
import { APP_NAME } from "@/config";
import { sanitizeFilename } from "@/lib/utils";
import { pdf } from "@react-pdf/renderer";
import { PdfResumeDocument } from "@/templates/renderers/PdfRenderer";
import { resolvePhotoBytesForPdf } from "@/lib/storage/userFiles";
import { SaveStatusIndicator } from "@/components/common/SaveStatusIndicator";
import { VersionConflictModal } from "@/components/common/VersionConflictModal";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Download,
  MoreVertical,
  Copy,
  FileCode,
  Settings,
  Trash2,
  Loader2,
  Sun,
  Moon,
  Save,
  Check,
} from "lucide-react";
import { useTheme } from "@/components/common/ThemeProvider";

function ResumeEditorContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    isHydrated,
    initStore,
    resumes,
    renameResume,
    duplicateResume,
    deleteResume,
    undo,
    redo,
    canUndo,
    canRedo,
    hardSave,
  } = useFolioStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const handleHardSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const ok = await hardSave();
      if (ok) {
        setShowSavedFeedback(true);
        setTimeout(() => setShowSavedFeedback(false), 2500);
      }
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!isHydrated) {
      initStore();
    }
  }, [isHydrated, initStore]);

  const resume = resumes.find((r) => r.id === params?.id);

  useEffect(() => {
    if (resume) {
      setTitleInput(resume.title);
    }
  }, [resume?.title]);

  // Global Keyboard Shortcuts (Ctrl/Cmd+S, Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleHardSave();
      } else if (modifier && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (resume && canUndo(resume.id)) {
          undo(resume.id);
        }
      } else if (
        (modifier && e.shiftKey && e.key.toLowerCase() === "z") ||
        (modifier && e.key.toLowerCase() === "y")
      ) {
        e.preventDefault();
        if (resume && canRedo(resume.id)) {
          redo(resume.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resume, canUndo, canRedo, undo, redo]);

  const triggerDownload = async () => {
    if (!resume || isDownloading) return;
    try {
      setIsDownloading(true);
      const embeddedPhoto = resume.personal.photo
        ? await resolvePhotoBytesForPdf(resume.personal.photo)
        : undefined;
      const pdfResume = {
        ...resume,
        personal: {
          ...resume.personal,
          photo: embeddedPhoto,
        },
      };
      const blob = await pdf(<PdfResumeDocument resume={pdfResume} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const name = resume.personal.fullName || "Candidate";
      a.href = url;
      a.download = `${sanitizeFilename(name)}_${sanitizeFilename(resume.title)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF generation failed:", e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && resume && titleInput !== resume.title) {
      renameResume(resume.id, titleInput.trim());
    } else if (resume) {
      setTitleInput(resume.title);
    }
  };

  const handleExportJson = () => {
    if (!resume) return;
    const jsonStr = JSON.stringify(resume, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilename(resume.title)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsMenuOpen(false);
  };

  const handleDuplicate = () => {
    if (!resume) return;
    const newId = duplicateResume(resume.id);
    setIsMenuOpen(false);
    if (newId) {
      router.push(`/resume/${newId}`);
    }
  };

  const handleDelete = () => {
    if (!resume) return;
    if (window.confirm(`Are you sure you want to delete "${resume.title}"?`)) {
      deleteResume(resume.id);
      router.push("/");
    }
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
          <p className="text-sm font-medium text-neutral-500">Loading {APP_NAME}...</p>
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-950 text-center">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Resume Not Found
        </h2>
        <p className="text-sm text-neutral-500 mb-6 max-w-sm">
          The requested resume could not be located in local storage.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-neutral-950">
      {/* Top Bar */}
      <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {/* Title Editor */}
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
              className="text-sm font-bold px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
            />
          ) : (
            <div className="flex items-center gap-2">
              <span
                onClick={() => setIsEditingTitle(true)}
                className="text-sm font-bold text-neutral-900 dark:text-neutral-100 cursor-pointer hover:underline"
                title="Click to rename"
              >
                {resume.title}
              </span>
              <span className="text-[10px] text-neutral-400">·</span>
              <SaveStatusIndicator />
            </div>
          )}
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5 border border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={() => undo(resume.id)}
              disabled={!canUndo(resume.id)}
              className="p-1.5 rounded text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => redo(resume.id)}
              disabled={!canRedo(resume.id)}
              className="p-1.5 rounded text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Hard Save button */}
          <button
            type="button"
            onClick={handleHardSave}
            disabled={isSaving}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all shadow-xs ${
              showSavedFeedback
                ? "bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-600 dark:border-emerald-500"
                : "bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-750"
            }`}
            title="Save all changes cleanly to database (Ctrl+S)"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : showSavedFeedback ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            )}
            <span>{isSaving ? "Saving..." : showSavedFeedback ? "Saved!" : "Save"}</span>
          </button>

          {/* Download PDF button */}
          <button
            type="button"
            onClick={triggerDownload}
            disabled={isDownloading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 transition-opacity shadow-xs disabled:opacity-50"
          >
            {isDownloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Download PDF
          </button>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Toggle light / dark mode"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
          </button>

          {/* More menu dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl py-1.5 z-50 text-xs">
                <button
                  type="button"
                  onClick={handleDuplicate}
                  className="w-full flex items-center gap-2 px-3 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplicate Resume
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="w-full flex items-center gap-2 px-3 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  Export JSON
                </button>
                <Link
                  href="/settings"
                  className="w-full flex items-center gap-2 px-3 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Settings
                </Link>
                <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Resume
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Editor */}
        <div className="w-full md:w-[48%] lg:w-[45%] xl:w-[42%] h-1/2 md:h-full overflow-hidden shrink-0">
          <EditorPanel resume={resume} />
        </div>

        {/* Right Side: Live Preview */}
        <div className="flex-1 h-1/2 md:h-full overflow-hidden">
          <PreviewPanel resume={resume} />
        </div>
      </div>

      <VersionConflictModal />
    </div>
  );
}

export default function ResumeEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
            <p className="text-sm font-medium text-neutral-500">Loading Resume...</p>
          </div>
        </div>
      }
    >
      <ResumeEditorContent />
    </Suspense>
  );
}
