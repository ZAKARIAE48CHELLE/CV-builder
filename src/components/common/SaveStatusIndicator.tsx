"use client";

import React from "react";
import { useFolioStore } from "@/lib/store";
import { Check, Loader2, WifiOff, AlertCircle } from "lucide-react";

export function SaveStatusIndicator() {
  const saveStatus = useFolioStore((s) => s.saveStatus);
  const retrySave = useFolioStore((s) => s.retrySave);

  if (saveStatus === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-stone-500 dark:text-zinc-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
        Saving…
      </span>
    );
  }

  if (saveStatus === "offline") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
        <WifiOff className="h-3 w-3" />
        Offline – changes kept on this device
      </span>
    );
  }

  if (saveStatus === "error") {
    return (
      <button
        type="button"
        onClick={() => retrySave()}
        className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
      >
        <AlertCircle className="h-3 w-3" />
        Couldn&apos;t save – retry
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-stone-400 dark:text-zinc-500">
      <Check className="h-3.5 w-3.5 text-emerald-500" />
      Saved
    </span>
  );
}

