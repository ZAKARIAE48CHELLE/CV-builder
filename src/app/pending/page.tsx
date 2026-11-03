"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/config";
import { Clock, RefreshCw, LogOut, CheckCircle2 } from "lucide-react";

export default function PendingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setChecking(true);
    setStatusMessage(null);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profile?.status === "approved") {
        router.push("/");
        router.refresh();
      } else if (profile?.status === "blocked") {
        router.push("/blocked");
      } else {
        setStatusMessage("Your account is still awaiting admin approval.");
      }
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-[#FAF8F5] dark:bg-zinc-950 text-stone-900 dark:text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-stone-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-6 h-6" />
        </div>

        <h1 className="text-lg font-bold tracking-tight">Waiting for Approval</h1>
        <p className="mt-2 text-xs text-stone-600 dark:text-zinc-400 leading-relaxed">
          Your {APP_NAME} account has been created and is currently waiting for an administrator to
          approve your access. Once approved, you&apos;ll have your own private workspace.
        </p>

        {statusMessage && (
          <div className="mt-4 rounded-xl bg-stone-100 dark:bg-zinc-800 p-3 text-xs text-stone-700 dark:text-zinc-300 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            disabled={checking}
            onClick={handleCheckStatus}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 dark:bg-amber-500 hover:bg-stone-800 dark:hover:bg-amber-400 text-white dark:text-zinc-950 font-semibold text-xs py-2.5 px-4 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking status…" : "Refresh Approval Status"}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-zinc-700 hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300 font-medium text-xs py-2.5 px-4 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

