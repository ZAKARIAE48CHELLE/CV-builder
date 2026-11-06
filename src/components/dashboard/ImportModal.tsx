"use client";

import React, { useState } from "react";
import { extractTextFromFile } from "@/lib/import/extractors";
import {
  parseTextHeuristically,
  sanitizeAndValidateParsedDraft,
  ParsedResumeDraft,
} from "@/lib/import/parser";
import { useFolioStore } from "@/lib/store";
import { callAiApi } from "@/lib/ai/provider";
import { uploadImportedFile } from "@/lib/storage/userFiles";
import { SectionType, SECTION_META, SectionItem } from "@/lib/schema";
import {
  UploadCloud,
  FileText,
  Sparkles,
  Check,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Globe,
  Award,
  BookOpen,
  Heart,
  FolderGit2,
  Users,
  ListPlus,
} from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (newResumeId: string) => void;
}

const SECTION_TYPE_OPTIONS: SectionType[] = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "languages",
  "certifications",
  "awards",
  "publications",
  "volunteering",
  "interests",
  "references",
  "custom",
];

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const { settings, userProfile, createResume, updateResume, importBackupJson } = useFolioStore();
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [pastedText, setPastedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Review stage
  const [step, setStep] = useState<"input" | "review">("input");
  const [parsedDraft, setParsedDraft] = useState<ParsedResumeDraft | null>(null);
  const [importTitle, setImportTitle] = useState("Imported Resume");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  // Ollama, BYOK, or Shared AI Key configured
  const hasAiConfigured =
    settings.aiProvider === "ollama" ||
    Boolean(settings.aiApiKey && settings.aiApiKey.trim().length > 0) ||
    Boolean(userProfile?.ai_shared_key_allowed);

  const toggleSectionExpand = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleProcessText = async (rawText: string, useAi = false) => {
    if (!rawText.trim()) {
      setErrorMsg("Please provide text or upload a document to proceed.");
      return;
    }

    const trimmed = rawText.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object") {
          setIsLoading(true);
          const res = await importBackupJson(trimmed);
          if (res.success) {
            if (res.firstResumeId) {
              onImportComplete(res.firstResumeId);
            } else {
              onClose();
            }
            return;
          } else {
            setErrorMsg(res.error || "Failed to import JSON data.");
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Fall back to normal text extraction
      }
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      let draft: ParsedResumeDraft;

      if (useAi && hasAiConfigured) {
        const res = await callAiApi(
          {
            action: "parse_resume",
            context: rawText,
          },
          settings
        );

        if (res.success && res.result?.personal) {
          draft = sanitizeAndValidateParsedDraft(res.result);
        } else {
          // If AI extraction failed or returned unexpected shape, fallback gracefully
          draft = parseTextHeuristically(rawText);
          if (res.error) {
            console.warn("AI parsing returned error, fell back to heuristic:", res.error);
          }
        }
      } else {
        draft = parseTextHeuristically(rawText);
      }

      setParsedDraft(draft);
      setImportTitle(
        draft.personal.jobTitle
          ? `${draft.personal.fullName} – ${draft.personal.jobTitle}`
          : `${draft.personal.fullName} Resume`
      );

      // Auto-expand all extracted sections by default
      const initialExpanded: Record<string, boolean> = {};
      draft.sections.forEach((s) => {
        initialExpanded[s.id] = true;
      });
      setExpandedSections(initialExpanded);

      setStep("review");
    } catch (err: any) {
      console.error("Extraction error:", err);
      setErrorMsg(err.message || "Failed to parse resume document.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartFileParse = async (useAi = false) => {
    if (!selectedFile) return;
    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMsg("Imported file must be 10 MB or smaller.");
      return;
    }

    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (ext === "json") {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const text = await selectedFile.text();
        const res = await importBackupJson(text);
        if (res.success) {
          if (res.firstResumeId) {
            onImportComplete(res.firstResumeId);
          } else {
            onClose();
          }
          return;
        } else {
          setErrorMsg(res.error || "Failed to import JSON file.");
          setIsLoading(false);
          return;
        }
      } catch (err: any) {
        setErrorMsg(err?.message || "Failed to parse JSON file.");
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      uploadImportedFile(selectedFile).catch(() => {});
      const text = await extractTextFromFile(selectedFile);
      await handleProcessText(text, useAi);
    } catch (e: any) {
      setErrorMsg(e.message || "Could not read text from selected file.");
      setIsLoading(false);
    }
  };

  // Section & Item mutators during Review
  const updateSection = (sIdx: number, patch: Partial<ParsedResumeDraft["sections"][0]>) => {
    if (!parsedDraft) return;
    const nextSections = [...parsedDraft.sections];
    nextSections[sIdx] = { ...nextSections[sIdx], ...patch };
    setParsedDraft({ ...parsedDraft, sections: nextSections });
  };

  const removeSection = (sIdx: number) => {
    if (!parsedDraft) return;
    const nextSections = parsedDraft.sections.filter((_, i) => i !== sIdx);
    setParsedDraft({ ...parsedDraft, sections: nextSections });
  };

  const addSection = () => {
    if (!parsedDraft) return;
    const newId = `sec-parsed-${Date.now()}`;
    const newSection: ParsedResumeDraft["sections"][0] = {
      id: newId,
      type: "experience",
      heading: "New Section",
      visible: true,
      column: "main",
      items: [
        {
          id: `item-parsed-${Date.now()}-0`,
          visible: true,
          title: "Title / Role",
          subtitle: "Company / School",
          startDate: "",
          endDate: "",
          description: "<p>Description or responsibilities...</p>",
        },
      ],
    };
    setParsedDraft({ ...parsedDraft, sections: [...parsedDraft.sections, newSection] });
    setExpandedSections((prev) => ({ ...prev, [newId]: true }));
  };

  const updateItem = (sIdx: number, iIdx: number, patch: Partial<SectionItem>) => {
    if (!parsedDraft) return;
    const nextSections = [...parsedDraft.sections];
    const targetSection = { ...nextSections[sIdx] };
    const nextItems = [...targetSection.items];
    nextItems[iIdx] = { ...nextItems[iIdx], ...patch };
    targetSection.items = nextItems;
    nextSections[sIdx] = targetSection;
    setParsedDraft({ ...parsedDraft, sections: nextSections });
  };

  const removeItem = (sIdx: number, iIdx: number) => {
    if (!parsedDraft) return;
    const nextSections = [...parsedDraft.sections];
    const targetSection = { ...nextSections[sIdx] };
    targetSection.items = targetSection.items.filter((_, i) => i !== iIdx);
    nextSections[sIdx] = targetSection;
    setParsedDraft({ ...parsedDraft, sections: nextSections });
  };

  const addItem = (sIdx: number) => {
    if (!parsedDraft) return;
    const nextSections = [...parsedDraft.sections];
    const targetSection = { ...nextSections[sIdx] };
    const newItem: SectionItem = {
      id: `item-parsed-${Date.now()}-${targetSection.items.length}`,
      visible: true,
      title: "",
      subtitle: "",
      description: "<p></p>",
    };
    targetSection.items = [...targetSection.items, newItem];
    nextSections[sIdx] = targetSection;
    setParsedDraft({ ...parsedDraft, sections: nextSections });
  };

  const handleFinalizeImport = () => {
    if (!parsedDraft) return;

    // Sanitize before committing to store
    const cleaned = sanitizeAndValidateParsedDraft(parsedDraft);

    // Create the resume in store with parsed info
    const newId = createResume(importTitle.trim() || "Imported Resume", "plain");

    updateResume(newId, (draft) => {
      draft.personal = { ...draft.personal, ...cleaned.personal };
      if (cleaned.sections.length > 0) {
        draft.sections = cleaned.sections;
      }
      return draft;
    });

    onImportComplete(newId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              {step === "input" ? "Import Existing Resume" : "Review & Correct Parsed Fields"}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {step === "input"
                ? "Upload a PDF, Word document (DOCX), text file, or paste raw text."
                : "Verify and adjust extracted candidate details, sections, and items before creating."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === "input" && (
            <>
              {/* Tab Selector */}
              <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === "upload"
                      ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                      : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                  }`}
                >
                  Upload Document (PDF / DOCX / TXT / JSON)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("paste")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === "paste"
                      ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                      : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                  }`}
                >
                  Paste Raw Text / JSON
                </button>
              </div>

              {activeTab === "upload" ? (
                <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-8 text-center hover:border-neutral-400 transition-colors bg-neutral-50/50 dark:bg-neutral-950/50">
                  <input
                    type="file"
                    id="resume-file-input"
                    accept=".pdf,.docx,.doc,.txt,.json,application/json"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label
                    htmlFor="resume-file-input"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <div className="p-3.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {selectedFile ? selectedFile.name : "Click to browse or drop resume or backup file"}
                    </span>
                    <span className="text-xs text-neutral-500">
                      Supports PDF, DOCX, DOC, TXT, and Folio JSON backups up to 10MB
                    </span>
                  </label>
                </div>
              ) : (
                <div>
                  <textarea
                    rows={9}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste full resume text here..."
                    className="w-full text-xs p-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900 font-mono"
                  />
                </div>
              )}
            </>
          )}

          {step === "review" && parsedDraft && (
            <div className="space-y-5">
              {/* Resume Title */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Resume Title
                </label>
                <input
                  type="text"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              {/* Personal Info Review */}
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 space-y-3">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Candidate Information
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-0.5">Full Name</label>
                    <input
                      type="text"
                      value={parsedDraft.personal.fullName}
                      onChange={(e) =>
                        setParsedDraft({
                          ...parsedDraft,
                          personal: { ...parsedDraft.personal, fullName: e.target.value },
                        })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-0.5">Job Title</label>
                    <input
                      type="text"
                      value={parsedDraft.personal.jobTitle || ""}
                      onChange={(e) =>
                        setParsedDraft({
                          ...parsedDraft,
                          personal: { ...parsedDraft.personal, jobTitle: e.target.value },
                        })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-0.5">Email</label>
                    <input
                      type="text"
                      value={parsedDraft.personal.email || ""}
                      onChange={(e) =>
                        setParsedDraft({
                          ...parsedDraft,
                          personal: { ...parsedDraft.personal, email: e.target.value },
                        })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-0.5">Phone</label>
                    <input
                      type="text"
                      value={parsedDraft.personal.phone || ""}
                      onChange={(e) =>
                        setParsedDraft({
                          ...parsedDraft,
                          personal: { ...parsedDraft.personal, phone: e.target.value },
                        })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-0.5">Location</label>
                    <input
                      type="text"
                      value={parsedDraft.personal.location || ""}
                      onChange={(e) =>
                        setParsedDraft({
                          ...parsedDraft,
                          personal: { ...parsedDraft.personal, location: e.target.value },
                        })
                      }
                      placeholder="e.g. San Francisco, CA"
                      className="w-full text-xs px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-0.5">LinkedIn</label>
                    <input
                      type="text"
                      value={parsedDraft.personal.linkedin || ""}
                      onChange={(e) =>
                        setParsedDraft({
                          ...parsedDraft,
                          personal: { ...parsedDraft.personal, linkedin: e.target.value },
                        })
                      }
                      placeholder="https://linkedin.com/in/..."
                      className="w-full text-xs px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-0.5">GitHub</label>
                    <input
                      type="text"
                      value={parsedDraft.personal.github || ""}
                      onChange={(e) =>
                        setParsedDraft({
                          ...parsedDraft,
                          personal: { ...parsedDraft.personal, github: e.target.value },
                        })
                      }
                      placeholder="https://github.com/..."
                      className="w-full text-xs px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 mb-0.5">Portfolio / Website</label>
                    <input
                      type="text"
                      value={parsedDraft.personal.website || ""}
                      onChange={(e) =>
                        setParsedDraft({
                          ...parsedDraft,
                          personal: { ...parsedDraft.personal, website: e.target.value },
                        })
                      }
                      placeholder="https://..."
                      className="w-full text-xs px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                </div>
              </div>

              {/* Sections Review & Correction */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    Extracted Sections ({parsedDraft.sections.length})
                  </span>
                  <button
                    type="button"
                    onClick={addSection}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Section
                  </button>
                </div>

                {parsedDraft.sections.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic p-4 text-center border border-dashed rounded-xl">
                    No sections detected. Click &quot;Add Section&quot; to manually insert one.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {parsedDraft.sections.map((sec, sIdx) => {
                      const isExpanded = expandedSections[sec.id] ?? false;

                      return (
                        <div
                          key={sec.id}
                          className="border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 overflow-hidden"
                        >
                          {/* Section Header Controls */}
                          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 flex items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800">
                            <button
                              type="button"
                              onClick={() => toggleSectionExpand(sec.id)}
                              className="flex items-center gap-2 text-left flex-1"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-neutral-500" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-neutral-500" />
                              )}
                              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                                {sec.heading || "Untitled Section"}
                              </span>
                              <span className="text-[11px] text-neutral-400">
                                ({sec.items.length} {sec.items.length === 1 ? "item" : "items"})
                              </span>
                            </button>

                            <div className="flex items-center gap-2">
                              {/* Section Type Selector */}
                              <select
                                value={sec.type}
                                onChange={(e) =>
                                  updateSection(sIdx, { type: e.target.value as SectionType })
                                }
                                className="text-[11px] px-2 py-1 rounded bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium"
                              >
                                {SECTION_TYPE_OPTIONS.map((t) => (
                                  <option key={t} value={t}>
                                    {SECTION_META[t]?.label || t}
                                  </option>
                                ))}
                              </select>

                              {/* Column Toggle */}
                              <select
                                value={sec.column || "main"}
                                onChange={(e) =>
                                  updateSection(sIdx, { column: e.target.value as "main" | "side" })
                                }
                                className="text-[11px] px-2 py-1 rounded bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
                              >
                                <option value="main">Main Col</option>
                                <option value="side">Side Col</option>
                              </select>

                              {/* Delete Section */}
                              <button
                                type="button"
                                onClick={() => removeSection(sIdx)}
                                title="Remove section"
                                className="p-1 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Section Body (when expanded) */}
                          {isExpanded && (
                            <div className="p-4 space-y-4">
                              {/* Section Title Input */}
                              <div>
                                <label className="block text-[11px] font-medium text-neutral-500 mb-0.5">
                                  Section Heading Display
                                </label>
                                <input
                                  type="text"
                                  value={sec.heading}
                                  onChange={(e) => updateSection(sIdx, { heading: e.target.value })}
                                  className="w-full text-xs px-2.5 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                                />
                              </div>

                              {/* Items list */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
                                    Entries ({sec.items.length})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => addItem(sIdx)}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    <Plus className="w-3 h-3" /> Add Item
                                  </button>
                                </div>

                                {sec.items.length === 0 ? (
                                  <p className="text-xs text-neutral-400 italic">
                                    No items in this section.
                                  </p>
                                ) : (
                                  sec.items.map((it, iIdx) => (
                                    <div
                                      key={it.id || iIdx}
                                      className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40 space-y-2 relative"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-semibold text-neutral-500">
                                          Item #{iIdx + 1}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => removeItem(sIdx, iIdx)}
                                          className="text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5"
                                          title="Remove item"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                      {/* Fields depending on section type */}
                                      {sec.type === "summary" ? (
                                        <div>
                                          <label className="block text-[10px] font-medium text-neutral-400 mb-0.5">
                                            Summary Content
                                          </label>
                                          <textarea
                                            rows={3}
                                            value={
                                              it.description?.replace(/<\/?[^>]+(>|$)/g, "") || ""
                                            }
                                            onChange={(e) =>
                                              updateItem(sIdx, iIdx, {
                                                description: `<p>${e.target.value}</p>`,
                                              })
                                            }
                                            className="w-full text-xs p-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                                          />
                                        </div>
                                      ) : sec.type === "skills" ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <div>
                                            <label className="block text-[10px] font-medium text-neutral-400 mb-0.5">
                                              Skill Category / Group
                                            </label>
                                            <input
                                              type="text"
                                              value={it.title || ""}
                                              onChange={(e) =>
                                                updateItem(sIdx, iIdx, { title: e.target.value })
                                              }
                                              placeholder="e.g. Languages or Frontend"
                                              className="w-full text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[10px] font-medium text-neutral-400 mb-0.5">
                                              Skills (comma separated)
                                            </label>
                                            <input
                                              type="text"
                                              value={(it.tags || []).join(", ")}
                                              onChange={(e) =>
                                                updateItem(sIdx, iIdx, {
                                                  tags: e.target.value
                                                    .split(",")
                                                    .map((s) => s.trim())
                                                    .filter(Boolean),
                                                })
                                              }
                                              placeholder="TypeScript, React, Node.js"
                                              className="w-full text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div>
                                              <label className="block text-[10px] font-medium text-neutral-400 mb-0.5">
                                                {sec.type === "education" ? "Degree / Field" : "Title / Role"}
                                              </label>
                                              <input
                                                type="text"
                                                value={it.title || ""}
                                                onChange={(e) =>
                                                  updateItem(sIdx, iIdx, { title: e.target.value })
                                                }
                                                className="w-full text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                                              />
                                            </div>

                                            <div>
                                              <label className="block text-[10px] font-medium text-neutral-400 mb-0.5">
                                                {sec.type === "education" ? "School / University" : "Company / Organization"}
                                              </label>
                                              <input
                                                type="text"
                                                value={it.subtitle || ""}
                                                onChange={(e) =>
                                                  updateItem(sIdx, iIdx, { subtitle: e.target.value })
                                                }
                                                className="w-full text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                                              />
                                            </div>

                                            <div>
                                              <label className="block text-[10px] font-medium text-neutral-400 mb-0.5">
                                                Start Date
                                              </label>
                                              <input
                                                type="text"
                                                value={it.startDate || ""}
                                                onChange={(e) =>
                                                  updateItem(sIdx, iIdx, { startDate: e.target.value })
                                                }
                                                placeholder="e.g. 2021 or Jan 2021"
                                                className="w-full text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                                              />
                                            </div>

                                            <div>
                                              <label className="block text-[10px] font-medium text-neutral-400 mb-0.5">
                                                End Date
                                              </label>
                                              <input
                                                type="text"
                                                value={it.endDate || ""}
                                                onChange={(e) =>
                                                  updateItem(sIdx, iIdx, { endDate: e.target.value })
                                                }
                                                placeholder="e.g. Present or 2023"
                                                className="w-full text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                                              />
                                            </div>
                                          </div>

                                          <div>
                                            <label className="block text-[10px] font-medium text-neutral-400 mb-0.5">
                                              Description / Achievements
                                            </label>
                                            <textarea
                                              rows={2}
                                              value={
                                                it.description?.replace(/<\/?[^>]+(>|$)/g, "") || ""
                                              }
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                const html = val.includes("\n")
                                                  ? `<ul>${val.split("\n").map((b) => `<li>${b.replace(/^[•\-\*]\s*/, "")}</li>`).join("")}</ul>`
                                                  : `<p>${val}</p>`;
                                                updateItem(sIdx, iIdx, { description: html });
                                              }}
                                              placeholder="Key achievements or responsibilities..."
                                              className="w-full text-xs p-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                                            />
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-between shrink-0">
          {step === "input" ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {hasAiConfigured && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === "upload") handleStartFileParse(true);
                      else handleProcessText(pastedText, true);
                    }}
                    disabled={isLoading || (activeTab === "upload" && !selectedFile)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 text-neutral-800 dark:text-neutral-200 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Parse with AI
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === "upload") handleStartFileParse(false);
                    else handleProcessText(pastedText, false);
                  }}
                  disabled={isLoading || (activeTab === "upload" && !selectedFile)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      Parse & Review
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep("input")}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Back to Input
              </button>

              <button
                type="button"
                onClick={handleFinalizeImport}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
              >
                <Check className="w-4 h-4" />
                Confirm & Create Resume
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
