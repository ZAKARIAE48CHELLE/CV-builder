"use client";

import React, { useState } from "react";
import { Resume } from "@/lib/schema";
import { HtmlRenderer } from "@/templates/renderers/HtmlRenderer";
import { AtsCheckModal } from "./AtsCheckModal";
import { checkAtsReadabilityFromPdfBuffer, AtsCheckResult } from "@/lib/pdf/atsChecker";
import { sanitizeFilename } from "@/lib/utils";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileSearch,
  Download,
  Loader2,
  FileText,
} from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { PdfResumeDocument } from "@/templates/renderers/PdfRenderer";
import { resolvePhotoBytesForPdf } from "@/lib/storage/userFiles";

import { useFolioStore } from "@/lib/store";

interface PreviewPanelProps {
  resume: Resume;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ resume }) => {
  const [zoom, setZoom] = useState(85);
  const [isExporting, setIsExporting] = useState(false);
  const [isCheckingAts, setIsCheckingAts] = useState(false);
  const [atsModalOpen, setAtsModalOpen] = useState(false);
  const [atsResult, setAtsResult] = useState<AtsCheckResult | null>(null);

  const { selectedDesignTarget, setSelectedDesignTarget } = useFolioStore();

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 40));
  const handleResetZoom = () => setZoom(85);

  const prepareResumeForPdf = async (source: Resume): Promise<Resume> => {
    if (!source.personal.photo) return source;
    const embeddedPhoto = await resolvePhotoBytesForPdf(source.personal.photo);
    return {
      ...source,
      personal: {
        ...source.personal,
        photo: embeddedPhoto,
      },
    };
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      const pdfResume = await prepareResumeForPdf(resume);
      const blob = await pdf(<PdfResumeDocument resume={pdfResume} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const name = resume.personal.fullName || "Candidate";
      const title = resume.title || "Resume";
      link.href = url;
      link.download = `${sanitizeFilename(name)}_${sanitizeFilename(title)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF. Check console for details.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCheckAts = async () => {
    setAtsModalOpen(true);
    setIsCheckingAts(true);
    try {
      const pdfResume = await prepareResumeForPdf(resume);
      const blob = await pdf(<PdfResumeDocument resume={pdfResume} />).toBlob();
      const arrayBuffer = await blob.arrayBuffer();
      const result = await checkAtsReadabilityFromPdfBuffer(arrayBuffer, resume);
      setAtsResult(result);
    } catch (err) {
      console.error("ATS check error:", err);
    } finally {
      setIsCheckingAts(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-100 dark:bg-neutral-950 overflow-hidden relative">
      {/* Floating Preview Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Live Preview ({resume.design.pageSize})
          </span>
        </div>

        {/* Zoom controls & Actions */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5 border border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 rounded"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span
              onClick={handleResetZoom}
              className="text-[11px] font-mono px-1.5 cursor-pointer text-neutral-700 dark:text-neutral-300 hover:underline select-none"
              title="Click to reset zoom"
            >
              {zoom}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 rounded"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ATS Inspector Button */}
          <button
            type="button"
            onClick={handleCheckAts}
            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors shadow-2xs"
            title="Inspect ATS machine readable text output"
          >
            <FileSearch className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Check ATS</span>
          </button>

          {/* Download PDF button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 transition-opacity shadow-xs disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preview Canvas Container */}
      <div className="flex-1 overflow-auto p-8 flex justify-center items-start">
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            transition: "transform 0.15s ease-out",
          }}
          className="shadow-2xl rounded-sm transition-transform"
        >
          <HtmlRenderer
            resume={resume}
            selectedTarget={selectedDesignTarget}
            onSelectTarget={setSelectedDesignTarget}
          />
        </div>
      </div>

      {/* ATS Readability Inspection Modal */}
      <AtsCheckModal
        isOpen={atsModalOpen}
        onClose={() => setAtsModalOpen(false)}
        result={atsResult}
        isLoading={isCheckingAts}
      />
    </div>
  );
};
