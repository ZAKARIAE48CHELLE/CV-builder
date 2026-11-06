"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFolioStore } from "@/lib/store";
import { Navbar } from "@/components/common/Navbar";
import { ResumeCard } from "@/components/dashboard/ResumeCard";
import { CoverLetterCard } from "@/components/dashboard/CoverLetterCard";
import { NewResumeModal } from "@/components/dashboard/NewResumeModal";
import { ImportModal } from "@/components/dashboard/ImportModal";
import { LocalMigrationBanner } from "@/components/dashboard/LocalMigrationBanner";
import { APP_NAME, APP_TAGLINE } from "@/config";
import { sanitizeFilename } from "@/lib/utils";
import {
  Plus,
  UploadCloud,
  FileText,
  Mail,
  Download,
  Loader2,
  Sparkles,
  Layers,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const {
    isHydrated,
    initStore,
    resumes,
    coverLetters,
    createResume,
    duplicateResume,
    renameResume,
    deleteResume,
    createCoverLetter,
    duplicateCoverLetter,
    deleteCoverLetter,
    exportBackupJson,
    importBackupJson,
  } = useFolioStore();

  const [activeTab, setActiveTab] = useState<"resumes" | "letters">("resumes");
  const [isNewResumeOpen, setIsNewResumeOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    if (!isHydrated) {
      initStore();
    }
  }, [isHydrated, initStore]);

  const handleExportJson = (resume: any) => {
    const jsonStr = JSON.stringify(resume, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilename(resume.title)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await importBackupJson(text);
      if (res.success) {
        const parts: string[] = [];
        if (res.resumesCount > 0)
          parts.push(`${res.resumesCount} resume${res.resumesCount > 1 ? "s" : ""}`);
        if (res.coverLettersCount > 0)
          parts.push(
            `${res.coverLettersCount} cover letter${res.coverLettersCount > 1 ? "s" : ""}`
          );
        if (res.jobsCount > 0)
          parts.push(`${res.jobsCount} job application${res.jobsCount > 1 ? "s" : ""}`);
        if (res.presetsCount > 0)
          parts.push(`${res.presetsCount} style preset${res.presetsCount > 1 ? "s" : ""}`);
        alert(`Successfully imported: ${parts.join(", ")}!`);
      } else {
        alert(`Failed to import JSON: ${res.error || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Error reading JSON file: ${err?.message || "Invalid file"}`);
    } finally {
      e.target.value = "";
    }
  };

  const handleCreateNewResume = (title: string, templateId: string) => {
    const newId = createResume(title, templateId);
    router.push(`/resume/${newId}`);
  };

  const handleCreateNewLetter = () => {
    const newId = createCoverLetter("Cover Letter Application");
    router.push(`/cover-letter/${newId}`);
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          <p className="text-sm font-medium text-neutral-500">Loading {APP_NAME}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 flex flex-col text-neutral-900 dark:text-neutral-100 transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <LocalMigrationBanner />

        {/* Hero Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Documents & Applications
            </h1>
            <p className="text-sm text-neutral-500 mt-1 max-w-xl">
              {APP_TAGLINE}. All data remains stored locally on your machine.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                const jsonStr = exportBackupJson();
                const blob = new Blob([jsonStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                const dateStr = new Date().toISOString().slice(0, 10);
                a.href = url;
                a.download = `folio_backup_${dateStr}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              title="Download a full JSON backup of all your resumes and data"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs transition-all"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Backup All
            </button>

            <label
              title="Import a JSON backup or exported resume"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Import JSON
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportJsonFile}
              />
            </label>

            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs transition-all"
            >
              <UploadCloud className="w-4 h-4 text-neutral-500" />
              Import Resume
            </button>

            <button
              type="button"
              onClick={handleCreateNewLetter}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs transition-all"
            >
              <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              New Cover Letter
            </button>

            <button
              type="button"
              onClick={() => setIsNewResumeOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 text-xs font-bold shadow-xs transition-opacity"
            >
              <Plus className="w-4 h-4" />
              New Resume
            </button>
          </div>
        </div>

        {/* Tab switchers: Resumes vs Cover Letters */}
        <div className="flex items-center gap-2 mt-8 mb-6">
          <div className="inline-flex p-1 rounded-xl bg-neutral-200/60 dark:bg-neutral-800/60 border border-neutral-300/40 dark:border-neutral-700/40">
            <button
              type="button"
              onClick={() => setActiveTab("resumes")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "resumes"
                  ? "bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Resumes ({resumes.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("letters")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "letters"
                  ? "bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Cover Letters ({coverLetters.length})
            </button>
          </div>
        </div>

        {/* Resumes Grid */}
        {activeTab === "resumes" && (
          <div>
            {resumes.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl bg-white/40 dark:bg-neutral-900/40">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-500">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  No Resumes Created Yet
                </h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 mb-5">
                  Start fresh with one of our 8 ATS-ready templates or import your existing PDF or DOCX.
                </p>
                <button
                  type="button"
                  onClick={() => setIsNewResumeOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Resume
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {resumes.map((resume) => (
                  <ResumeCard
                    key={resume.id}
                    resume={resume}
                    onDuplicate={() => duplicateResume(resume.id)}
                    onRename={(newTitle) => renameResume(resume.id, newTitle)}
                    onDelete={() => {
                      if (window.confirm(`Delete "${resume.title}"?`)) {
                        deleteResume(resume.id);
                      }
                    }}
                    onExportJson={() => handleExportJson(resume)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cover Letters Grid */}
        {activeTab === "letters" && (
          <div>
            {coverLetters.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl bg-white/40 dark:bg-neutral-900/40">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-500">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  No Cover Letters Created Yet
                </h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 mb-5">
                  Compose compelling, tailored cover letters synchronized with your resume design.
                </p>
                <button
                  type="button"
                  onClick={handleCreateNewLetter}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                  Create Cover Letter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {coverLetters.map((cl) => (
                  <CoverLetterCard
                    key={cl.id}
                    coverLetter={cl}
                    onDuplicate={() => duplicateCoverLetter(cl.id)}
                    onDelete={() => {
                      if (window.confirm(`Delete "${cl.title}"?`)) {
                        deleteCoverLetter(cl.id);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <NewResumeModal
        isOpen={isNewResumeOpen}
        onClose={() => setIsNewResumeOpen(false)}
        onCreate={handleCreateNewResume}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={(newId) => router.push(`/resume/${newId}`)}
      />
    </div>
  );
}
