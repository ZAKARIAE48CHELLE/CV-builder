"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/config";
import { ShieldAlert, LogOut } from "lucide-react";

export default function BlockedPage() {
  const router = useRouter();

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
        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h1 className="text-lg font-bold tracking-tight">Account Blocked</h1>
        <p className="mt-2 text-xs text-stone-600 dark:text-zinc-400 leading-relaxed">
          Your access to this {APP_NAME} instance has been suspended by an administrator. If you
          believe this is a mistake, please contact the workspace owner.
        </p>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-zinc-700 hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-700 dark:text-zinc-200 font-medium text-xs py-2.5 px-4 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

