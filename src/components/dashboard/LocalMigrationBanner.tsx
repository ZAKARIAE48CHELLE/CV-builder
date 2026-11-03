"use client";

import React, { useState } from "react";
import { useFolioStore } from "@/lib/store";
import { CloudUpload, X, CheckCircle2, Loader2 } from "lucide-react";

export function LocalMigrationBanner() {
  const hasLocalDataToImport = useFolioStore((s) => s.hasLocalDataToImport);
  const importLocalDataToAccount = useFolioStore((s) => s.importLocalDataToAccount);
  const dismissLocalImportBanner = useFolioStore((s) => s.dismissLocalImportBanner);

  const [importing, setImporting] = useState(false);
  const [clearAfter, setClearAfter] = useState(false);
  const [importedSuccess, setImportedSuccess] = useState(false);

  if (!hasLocalDataToImport && !importedSuccess) return null;

  if (importedSuccess) {
    return (
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-emerald-950/30 px-5 py-3.5 text-sm text-emerald-800 dark:text-emerald-200">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Your local resumes, cover letters, jobs, and presets have been imported into your account!</span>
        </div>
        <button
          type="button"
          onClick={() => setImportedSuccess(false)}
          className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const handleImport = async () => {
    setImporting(true);
    try {
      const ok = await importLocalDataToAccount(clearAfter);
      if (ok) {
        setImportedSuccess(true);
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <CloudUpload className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
              Local resumes found on this browser
            </h3>
            <p className="mt-0.5 text-xs text-stone-600 dark:text-zinc-400">
              You have existing local resumes stored in this browser. Would you like to import them
              into your private cloud account?
            </p>
            <label className="mt-2.5 inline-flex items-center gap-2 text-xs text-stone-600 dark:text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={clearAfter}
                onChange={(e) => setClearAfter(e.target.checked)}
                className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              Clear local browser copy after importing
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            disabled={importing}
            onClick={handleImport}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
          >
            {importing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <CloudUpload className="h-3.5 w-3.5" />
                Import my local resumes into my account
              </>
            )}
          </button>
          <button
            type="button"
            disabled={importing}
            onClick={dismissLocalImportBanner}
            className="rounded-xl p-2 text-stone-400 hover:text-stone-600 dark:hover:text-zinc-300"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

