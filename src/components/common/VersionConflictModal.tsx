"use client";

import React, { useState } from "react";
import { useFolioStore } from "@/lib/store";
import { AlertTriangle, Check, Copy, RefreshCw } from "lucide-react";

export function VersionConflictModal() {
  const conflictState = useFolioStore((s) => s.conflictState);
  const resolveConflict = useFolioStore((s) => s.resolveConflict);
  const [resolving, setResolving] = useState(false);

  if (!conflictState) return null;

  const handleChoice = async (choice: "keep_mine" | "load_latest" | "duplicate_mine") => {
    setResolving(true);
    try {
      await resolveConflict(choice);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-900 dark:text-zinc-100">
              Version Conflict Detected
            </h3>
            <p className="mt-1 text-xs text-stone-600 dark:text-zinc-400 leading-relaxed">
              This resume (<strong>{conflictState.localResume.title}</strong>) was updated in
              another tab or device (remote version v{conflictState.remoteVersion}). How would you
              like to resolve this?
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            disabled={resolving}
            onClick={() => handleChoice("keep_mine")}
            className="flex items-center justify-between w-full rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 px-4 py-2.5 text-left text-xs font-medium text-white transition-colors"
          >
            <span>
              <strong>Keep mine</strong> — Overwrite server with my current edits
            </span>
            <Check className="h-4 w-4 shrink-0" />
          </button>

          <button
            type="button"
            disabled={resolving}
            onClick={() => handleChoice("duplicate_mine")}
            className="flex items-center justify-between w-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 hover:bg-stone-100 dark:hover:bg-zinc-700 disabled:opacity-50 px-4 py-2.5 text-left text-xs font-medium text-stone-800 dark:text-zinc-200 transition-colors"
          >
            <span>
              <strong>Duplicate mine as a copy</strong> — Save mine separately &amp; load latest
            </span>
            <Copy className="h-4 w-4 shrink-0" />
          </button>

          <button
            type="button"
            disabled={resolving}
            onClick={() => handleChoice("load_latest")}
            className="flex items-center justify-between w-full rounded-xl border border-stone-200 dark:border-zinc-700 hover:bg-stone-100 dark:hover:bg-zinc-800 disabled:opacity-50 px-4 py-2.5 text-left text-xs font-medium text-stone-600 dark:text-zinc-400 transition-colors"
          >
            <span>
              <strong>Load latest</strong> — Discard local unsaved changes
            </span>
            <RefreshCw className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}

