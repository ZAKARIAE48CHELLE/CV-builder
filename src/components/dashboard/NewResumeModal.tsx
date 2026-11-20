"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TEMPLATES } from "@/templates/registry";
import { useFolioStore } from "@/lib/store";
import { buildResumeFromSingleJson, MOCK_RESUME_JSON_TEMPLATE } from "@/lib/import/parser";
import {
  Plus,
  X,
  Layout,
  FileJson,
  UploadCloud,
  Check,
  AlertCircle,
  Download,
  Loader2,
} from "lucide-react";

interface NewResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, templateId: string) => void;
  onImportJsonComplete?: (newResumeId: string) => void;
}

export const NewResumeModal: React.FC<NewResumeModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  onImportJsonComplete,
}) => {
  const { importSingleResumeJson } = useFolioStore();
  const [mode, setMode] = useState<"template" | "json">("template");
  const [title, setTitle] = useState("My Professional Resume");
  const [selectedTemplate, setSelectedTemplate] = useState("plain");

  // Single-CV JSON tab state
  const [jsonFileName, setJsonFileName] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState<string | null>(null);
  const [jsonTitleOverride, setJsonTitleOverride] = useState("");
  const [jsonTemplateId, setJsonTemplateId] = useState("plain");
  const [jsonHasCustomStyling, setJsonHasCustomStyling] = useState(false);
  const [jsonPreview, setJsonPreview] = useState<{
    detectedTitle: string;
    fullName: string;
    sectionsCount: number;
  } | null>(null);
  const [jsonError, setJsonError] = useState<{
    message: string;
    isFullBackup?: boolean;
  } | null>(null);
  const [isCreatingFromJson, setIsCreatingFromJson] = useState(false);

  if (!isOpen) return null;

  const resetJsonState = () => {
    setJsonFileName(null);
    setJsonText(null);
    setJsonTitleOverride("");
    setJsonTemplateId("plain");
    setJsonHasCustomStyling(false);
    setJsonPreview(null);
    setJsonError(null);
    setIsCreatingFromJson(false);
  };

  const handleClose = () => {
    resetJsonState();
    setMode("template");
    onClose();
  };

  const handleSubmitTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(title.trim() || "Untitled Resume", selectedTemplate);
    handleClose();
  };

  const handleDownloadJsonTemplate = () => {
    const jsonStr = JSON.stringify(MOCK_RESUME_JSON_TEMPLATE, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume-template.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setJsonFileName(file.name);
    setJsonError(null);
    setJsonPreview(null);

    try {
      const text = await file.text();
      setJsonText(text);

      let rawObj: any = null;
      try {
        rawObj = JSON.parse(text);
        if (Array.isArray(rawObj) && rawObj.length === 1) rawObj = rawObj[0];
        else if (rawObj && Array.isArray(rawObj.resumes) && rawObj.resumes.length === 1) {
          rawObj = rawObj.resumes[0];
        }
      } catch {}

      const built = buildResumeFromSingleJson(text, { id: "preview" });
      if (!built.ok) {
        setJsonError({ message: built.error, isFullBackup: built.isFullBackup });
        return;
      }

      const hasStyling = Boolean(
        rawObj &&
          typeof rawObj === "object" &&
          (rawObj.templateId || (rawObj.design && typeof rawObj.design === "object"))
      );
      setJsonHasCustomStyling(hasStyling);
      setJsonTemplateId(built.resume.templateId || "plain");
      setJsonTitleOverride("");
      setJsonPreview({
        detectedTitle: built.resume.title,
        fullName: built.resume.personal.fullName || "Candidate",
        sectionsCount: built.resume.sections.length,
      });
    } catch (err: any) {
      setJsonError({ message: err?.message || "Failed to read selected file." });
    } finally {
      e.target.value = "";
    }
  };

  const handleCreateFromJson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonText || !jsonPreview) return;

    setIsCreatingFromJson(true);
    setJsonError(null);
    try {
      const res = await importSingleResumeJson(jsonText, {
        titleOverride: jsonTitleOverride.trim() || undefined,
        templateId: jsonHasCustomStyling ? undefined : jsonTemplateId,
      });

      if (res.success && res.resumeId) {
        const createdId = res.resumeId;
        handleClose();
        onImportJsonComplete?.(createdId);
      } else {
        setJsonError({
          message: res.error || "Failed to create CV from JSON.",
          isFullBackup: res.isFullBackup,
        });
      }
    } catch (err: any) {
      setJsonError({ message: err?.message || "Failed to create CV from JSON." });
    } finally {
      setIsCreatingFromJson(false);
    }
  };

  const renderTemplateGrid = (currentValue: string, onSelect: (id: string) => void) => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
      {TEMPLATES.map((tmpl) => (
        <button
          key={tmpl.id}
          type="button"
          onClick={() => onSelect(tmpl.id)}
          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
            currentValue === tmpl.id
              ? "border-neutral-900 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800 ring-2 ring-neutral-900/10"
              : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 bg-white dark:bg-neutral-900"
          }`}
        >
          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
            {tmpl.name}
          </span>
          <span className="text-[10px] text-neutral-500 mt-1 line-clamp-1">{tmpl.badge}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-xl w-full p-6 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Create New Resume
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {mode === "template"
                ? "Choose an initial template. You can switch templates or layouts at any time."
                : "Upload a single CV JSON file to automatically create and open a new resume."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1 gap-1 mt-4 shrink-0">
          <button
            type="button"
            onClick={() => setMode("template")}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === "template"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            Start from Template
          </button>
          <button
            type="button"
            onClick={() => setMode("json")}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === "json"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            Create from JSON CV
          </button>
        </div>

        {mode === "template" ? (
          <form onSubmit={handleSubmitTemplate} className="space-y-4 mt-4 overflow-y-auto">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Resume Internal Title
              </label>
              <input
                type="text"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Frontend Dev – Stripe"
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Select Starting Template
              </label>
              {renderTemplateGrid(selectedTemplate, setSelectedTemplate)}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90"
              >
                Create Resume
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCreateFromJson} className="space-y-4 mt-4 overflow-y-auto">
            <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-5 text-center bg-neutral-50/50 dark:bg-neutral-950/50 hover:border-neutral-400 transition-colors">
              <input
                type="file"
                id="new-resume-json-input"
                accept=".json,application/json"
                onChange={handleJsonFileChange}
                className="hidden"
              />
              <label
                htmlFor="new-resume-json-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <div className="p-2.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  {jsonFileName ? jsonFileName : "Choose a single CV JSON file (.json)"}
                </span>
                <span className="text-[11px] text-neutral-500">
                  Supports exported Folio CV JSON, CV templates, or standard JSON Resume
                </span>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleDownloadJsonTemplate}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Download className="w-3 h-3" />
                Download JSON Template (.json)
              </button>
            </div>

            {jsonError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div className="space-y-1">
                  <p>{jsonError.message}</p>
                  {jsonError.isFullBackup && (
                    <Link
                      href="/account"
                      onClick={handleClose}
                      className="inline-block font-semibold underline hover:opacity-80"
                    >
                      Go to Account → Import Backup
                    </Link>
                  )}
                </div>
              </div>
            )}

            {jsonPreview && (
              <>
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                    <Check className="w-4 h-4" />
                    Single CV Detected & Ready
                  </div>
                  <p className="text-emerald-900/90 dark:text-emerald-200/90">
                    <span className="font-semibold">{jsonPreview.detectedTitle}</span> ·{" "}
                    {jsonPreview.fullName} · {jsonPreview.sectionsCount}{" "}
                    {jsonPreview.sectionsCount === 1 ? "section" : "sections"}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Resume Title (optional override)
                  </label>
                  <input
                    type="text"
                    value={jsonTitleOverride}
                    onChange={(e) => setJsonTitleOverride(e.target.value)}
                    placeholder={jsonPreview.detectedTitle}
                    className="w-full text-sm px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900"
                  />
                </div>

                {!jsonHasCustomStyling && (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                      Select Starting Template
                    </label>
                    {renderTemplateGrid(jsonTemplateId, setJsonTemplateId)}
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!jsonPreview || isCreatingFromJson}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 disabled:opacity-50"
              >
                {isCreatingFromJson ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Create CV from JSON
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
