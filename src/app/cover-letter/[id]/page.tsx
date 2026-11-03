"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useFolioStore } from "@/lib/store";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { sanitizeFilename } from "@/lib/utils";
import { sanitizeRichHtml } from "@/lib/security/sanitize";
import {
  Document,
  Page,
  View,
  Text,
  Link as PdfLink,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import {
  ArrowLeft,
  CheckCircle,
  Download,
  Link2,
  Trash2,
  Loader2,
  ZoomIn,
  ZoomOut,
  Mail,
  User,
  Building,
  MapPin,
  Calendar,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/components/common/ThemeProvider";

function CoverLetterEditorContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    isHydrated,
    initStore,
    coverLetters,
    resumes,
    updateCoverLetter,
    deleteCoverLetter,
  } = useFolioStore();

  const [zoom, setZoom] = useState(85);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (!isHydrated) {
      initStore();
    }
  }, [isHydrated, initStore]);

  const letter = coverLetters.find((c) => c.id === params?.id);
  const linkedResume = letter?.linkedResumeId
    ? resumes.find((r) => r.id === letter.linkedResumeId)
    : undefined;

  useEffect(() => {
    if (letter) {
      setTitleInput(letter.title);
    }
  }, [letter?.title]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!letter) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-950 text-center">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Cover Letter Not Found
        </h2>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  // Personal details either from linked resume or fallback
  const personal = linkedResume?.personal || {
    fullName: "Alex Rivera",
    jobTitle: "Senior Software Engineer",
    email: "alex.rivera@example.com",
    phone: "+1 (555) 234-5678",
    location: "San Francisco, CA",
  };

  const accentColor = linkedResume?.design.accentColor || letter.design.accentColor || "#0f172a";
  const fontFamily = linkedResume?.design.fontFamily || letter.design.fontFamily || "inter";

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && titleInput !== letter.title) {
      updateCoverLetter(letter.id, { title: titleInput.trim() });
    } else {
      setTitleInput(letter.title);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      const doc = (
        <Document title={letter.title} author={personal.fullName}>
          <Page size="A4" style={{ padding: 40, fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.4, color: "#1f2937" }}>
            {/* Header */}
            <View style={{ borderBottomWidth: 1.5, borderBottomColor: accentColor, paddingBottom: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: accentColor }}>{personal.fullName}</Text>
              {personal.jobTitle && <Text style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>{personal.jobTitle}</Text>}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4, fontSize: 8.5, color: "#6b7280" }}>
                {personal.email && <Text>{personal.email}</Text>}
                {personal.phone && <Text>{personal.phone}</Text>}
                {personal.location && <Text>{personal.location}</Text>}
              </View>
            </View>

            {/* Date & Recipient */}
            <Text style={{ fontSize: 9.5, color: "#4b5563", marginBottom: 12 }}>{letter.date}</Text>
            <View style={{ marginBottom: 16 }}>
              {letter.recipient.name && <Text style={{ fontWeight: "bold" }}>{letter.recipient.name}</Text>}
              {letter.recipient.company && <Text>{letter.recipient.company}</Text>}
              {letter.recipient.address && <Text style={{ color: "#6b7280" }}>{letter.recipient.address}</Text>}
            </View>

            {/* Body */}
            <View>
              {letter.body
                .replace(/<[^>]+>/g, "\n")
                .split("\n")
                .filter((line) => line.trim().length > 0)
                .map((paragraph, idx) => (
                  <Text key={idx} style={{ marginBottom: 8, fontSize: 10, color: "#374151" }}>
                    {paragraph}
                  </Text>
                ))}
            </View>
          </Page>
        </Document>
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sanitizeFilename(personal.fullName)}_${sanitizeFilename(letter.title)}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Cover letter PDF generation failed:", e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-neutral-950">
      {/* Top Bar */}
      <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

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
                  setTitleInput(letter.title);
                }
              }}
              className="text-sm font-bold px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950"
            />
          ) : (
            <div className="flex items-center gap-2">
              <span
                onClick={() => setIsEditingTitle(true)}
                className="text-sm font-bold text-neutral-900 dark:text-neutral-100 cursor-pointer hover:underline"
              >
                {letter.title}
              </span>
              <span className="text-[10px] text-neutral-400">·</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Saved locally
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 disabled:opacity-50 shadow-xs"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download PDF
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Toggle light / dark mode"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete cover letter "${letter.title}"?`)) {
                deleteCoverLetter(letter.id);
                router.push("/");
              }
            }}
            className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Form Editor */}
        <div className="w-full md:w-[48%] lg:w-[44%] h-1/2 md:h-full overflow-y-auto p-5 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-4">
          {/* Linked Resume */}
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-blue-600" />
              Link Resume (Syncs Header & Design)
            </label>
            <select
              value={letter.linkedResumeId || ""}
              onChange={(e) => updateCoverLetter(letter.id, { linkedResumeId: e.target.value || undefined })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
            >
              <option value="">None (Use standalone details)</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.personal.fullName || "Candidate"})
                </option>
              ))}
            </select>
          </div>

          {/* Recipient info */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
              Recipient & Application Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                  Recipient Name / Hiring Manager
                </label>
                <input
                  type="text"
                  value={letter.recipient.name || ""}
                  onChange={(e) =>
                    updateCoverLetter(letter.id, {
                      recipient: { ...letter.recipient, name: e.target.value },
                    })
                  }
                  placeholder="e.g. Jane Doe or Hiring Committee"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={letter.recipient.company || ""}
                  onChange={(e) =>
                    updateCoverLetter(letter.id, {
                      recipient: { ...letter.recipient, company: e.target.value },
                    })
                  }
                  placeholder="e.g. Stripe, Inc."
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                  Company Address / Location
                </label>
                <input
                  type="text"
                  value={letter.recipient.address || ""}
                  onChange={(e) =>
                    updateCoverLetter(letter.id, {
                      recipient: { ...letter.recipient, address: e.target.value },
                    })
                  }
                  placeholder="e.g. 510 Townsend St, San Francisco, CA"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-500 mb-1">Date</label>
                <input
                  type="text"
                  value={letter.date}
                  onChange={(e) => updateCoverLetter(letter.id, { date: e.target.value })}
                  placeholder="October 23, 2026"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </div>
          </div>

          {/* Letter Body Editor */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-2">
            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
              Letter Content & Body
            </h4>
            <RichTextEditor
              value={letter.body}
              onChange={(html) => updateCoverLetter(letter.id, { body: html })}
              placeholder="Dear Hiring Manager..."
              minHeight="220px"
            />
          </div>
        </div>

        {/* Right Live Preview */}
        <div className="flex-1 h-1/2 md:h-full bg-neutral-100 dark:bg-neutral-950 overflow-auto flex flex-col">
          {/* Zoom Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-sm shrink-0">
            <span className="text-xs font-semibold text-neutral-500 uppercase">
              Cover Letter Preview
            </span>
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5 border border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(z - 10, 40))}
                className="p-1 text-neutral-600 dark:text-neutral-300"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-1.5">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(z + 10, 140))}
                className="p-1 text-neutral-600 dark:text-neutral-300"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Rendered Sheet */}
          <div className="flex-1 overflow-auto p-8 flex justify-center items-start">
            <div
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
                width: "210mm",
                minHeight: "297mm",
                boxSizing: "border-box",
                padding: "20mm",
              }}
              className="bg-white text-neutral-900 shadow-2xl rounded-sm transition-transform leading-relaxed text-sm"
            >
              {/* Header */}
              <div
                className="pb-4 mb-6"
                style={{ borderBottom: `2px solid ${accentColor}` }}
              >
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: accentColor }}>
                  {personal.fullName}
                </h1>
                {personal.jobTitle && (
                  <p className="text-neutral-600 font-medium text-sm mt-0.5">
                    {personal.jobTitle}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 mt-2">
                  {personal.email && <span>{personal.email}</span>}
                  {personal.phone && <span>{personal.phone}</span>}
                  {personal.location && <span>{personal.location}</span>}
                </div>
              </div>

              {/* Date & Recipient */}
              <div className="mb-6 text-xs text-neutral-700">
                <p className="font-medium text-neutral-500 mb-3">{letter.date}</p>
                {letter.recipient.name && <p className="font-bold text-neutral-900">{letter.recipient.name}</p>}
                {letter.recipient.company && <p className="font-semibold">{letter.recipient.company}</p>}
                {letter.recipient.address && <p className="text-neutral-500">{letter.recipient.address}</p>}
              </div>

              {/* Body */}
              <div
                className="space-y-3 text-neutral-800 text-justify text-sm leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(letter.body) }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CoverLetterEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
            <p className="text-sm font-medium text-neutral-500">Loading Cover Letter...</p>
          </div>
        </div>
      }
    >
      <CoverLetterEditorContent />
    </Suspense>
  );
}
