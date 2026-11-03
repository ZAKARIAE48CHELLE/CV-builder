"use client";

import React, { useState } from "react";
import { AtsCheckResult } from "@/lib/pdf/atsChecker";
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  X,
  FileSearch,
  Sparkles,
} from "lucide-react";

interface AtsCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AtsCheckResult | null;
  isLoading: boolean;
}

export const AtsCheckModal: React.FC<AtsCheckModalProps> = ({
  isOpen,
  onClose,
  result,
  isLoading,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!result?.rawText) return;
    navigator.clipboard.writeText(result.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                ATS Machine Readability Inspector
              </h3>
              <p className="text-xs text-neutral-500">
                See exactly what Applicant Tracking Systems extract from your document.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-neutral-300 border-t-neutral-900 animate-spin" />
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Extracting PDF text layer via parser engine...
              </p>
            </div>
          ) : result ? (
            <>
              {/* Score bar */}
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                    Readability Score
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                      {result.overallScore}%
                    </span>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {result.overallScore >= 80 ? "Optimal ATS Safe" : "Needs Review"}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                    Extracted Word Count
                  </span>
                  <span className="text-xl font-bold text-neutral-800 dark:text-neutral-200 font-mono mt-0.5 block">
                    {result.wordCount} words
                  </span>
                </div>
              </div>

              {/* Checks checklist */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                  Automated Parsing Checks
                </h4>
                <div className="space-y-1.5">
                  {result.checks.map((check, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs bg-white dark:bg-neutral-900"
                    >
                      {check.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {check.label}
                        </span>
                        <p className="text-neutral-500 mt-0.5">{check.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw Parsed Stream */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    Raw ATS Text Stream
                  </h4>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Text Stream
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950 text-neutral-200 font-mono text-xs max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-neutral-800 select-all">
                  {result.rawText}
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-xs text-neutral-500">
              No audit data available.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
