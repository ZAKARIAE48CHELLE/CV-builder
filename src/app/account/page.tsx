"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/common/Navbar";
import { useFolioStore } from "@/lib/store";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SCHEMA_VERSION } from "@/config";
import {
  User,
  Lock,
  KeyRound,
  Download,
  Trash2,
  Check,
  AlertTriangle,
  Loader2,
  Sparkles,
  UploadCloud,
  FileText,
  Mail,
  Briefcase,
} from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const {
    isHydrated,
    initStore,
    userProfile,
    refreshUserProfile,
    settings,
    updateSettings,
    resumes,
    coverLetters,
    jobs,
    customPresets,
    importBackupJson,
  } = useFolioStore();

  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  // JSON Import state
  const [importJsonText, setImportJsonText] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{
    resumes: number;
    coverLetters: number;
    jobs: number;
    stylePresets: number;
    accountEmail?: string;
    exportedAt?: string;
  } | null>(null);
  const [importingData, setImportingData] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);

  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated) {
      initStore();
    }
  }, [isHydrated, initStore]);

  useEffect(() => {
    if (userProfile?.display_name) {
      setDisplayName(userProfile.display_name);
    }
  }, [userProfile?.display_name]);

  const handleUpdateDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !userProfile) return;

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() })
        .eq("id", userProfile.id);

      if (error) {
        setProfileMsg(`Error: ${error.message}`);
      } else {
        await refreshUserProfile();
        setProfileMsg("Display name updated.");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 8) {
      setPasswordMsg("Error: Password must be at least 8 characters.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordMsg(`Error: ${error.message}`);
      } else {
        setNewPassword("");
        setPasswordMsg("Password updated successfully.");
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const handleExportAllMyData = () => {
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      account: userProfile
        ? {
            email: userProfile.email,
            displayName: userProfile.display_name,
          }
        : undefined,
      resumes,
      coverLetters,
      jobs,
      stylePresets: customPresets,
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `folio_account_export_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportSuccessMsg(null);
    setImportErrorMsg(null);
    setImportFileName(file.name);

    try {
      const text = await file.text();
      setImportJsonText(text);

      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        setImportErrorMsg("The selected file is not a valid JSON document.");
        setImportPreview(null);
        return;
      }

      let target = parsed;
      if (target.folio_user_data_v1) {
        try {
          target =
            typeof target.folio_user_data_v1 === "string"
              ? JSON.parse(target.folio_user_data_v1)
              : target.folio_user_data_v1;
        } catch {}
      }
      if (target.state && typeof target.state === "object") {
        target = target.state;
      }

      let resumesList: any[] = [];
      if (Array.isArray(target.resumes)) {
        resumesList = target.resumes;
      } else if (Array.isArray(target)) {
        resumesList = target;
      } else if (target && target.sections && (target.personal || target.title)) {
        resumesList = [target];
      }

      const lettersList = Array.isArray(target.coverLetters) ? target.coverLetters : [];
      const jobsList = Array.isArray(target.jobs) ? target.jobs : [];
      const presetsList = Array.isArray(target.stylePresets)
        ? target.stylePresets
        : Array.isArray(target.customPresets)
        ? target.customPresets
        : Array.isArray(target.presets)
        ? target.presets
        : [];

      if (
        resumesList.length === 0 &&
        lettersList.length === 0 &&
        jobsList.length === 0 &&
        presetsList.length === 0
      ) {
        setImportErrorMsg("No resumes, cover letters, jobs, or style presets found in this file.");
        setImportPreview(null);
        return;
      }

      setImportPreview({
        resumes: resumesList.length,
        coverLetters: lettersList.length,
        jobs: jobsList.length,
        stylePresets: presetsList.length,
        accountEmail: target.account?.email || target.email,
        exportedAt: target.exportedAt,
      });
    } catch (err: any) {
      setImportErrorMsg(err?.message || "Failed to read JSON file.");
      setImportPreview(null);
    }
  };

  const handleExecuteImport = async () => {
    if (!importJsonText) return;
    setImportingData(true);
    setImportErrorMsg(null);
    setImportSuccessMsg(null);

    try {
      const res = await importBackupJson(importJsonText);
      if (res.success) {
        const parts: string[] = [];
        if (res.resumesCount > 0)
          parts.push(`${res.resumesCount} resume${res.resumesCount > 1 ? "s" : ""}`);
        if (res.coverLettersCount > 0)
          parts.push(
            `${res.coverLettersCount} cover letter${res.coverLettersCount > 1 ? "s" : ""}`
          );
        if (res.jobsCount > 0)
          parts.push(`${res.jobsCount} job application${res.jobsCount > 1 ? "s" : ""}`);
        if (res.presetsCount > 0)
          parts.push(`${res.presetsCount} style preset${res.presetsCount > 1 ? "s" : ""}`);
        setImportSuccessMsg(`Successfully imported ${parts.join(", ")}!`);
        setImportPreview(null);
        setImportJsonText(null);
        setImportFileName(null);
      } else {
        setImportErrorMsg(res.error || "Failed to import JSON data.");
      }
    } catch (err: any) {
      setImportErrorMsg(err?.message || "An unexpected error occurred during import.");
    } finally {
      setImportingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userProfile || confirmEmail.trim().toLowerCase() !== userProfile.email.toLowerCase()) {
      setDeleteError("Please type your exact account email address to confirm.");
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      router.push("/login");
      router.refresh();
    } catch (err: any) {
      setDeleteError(err?.message || "Account deletion failed.");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-zinc-950 flex flex-col text-stone-900 dark:text-zinc-100">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Account &amp; Privacy</h1>
          <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">
            Manage your profile, personal AI key, full data export, and account lifecycle.
          </p>
        </div>

        {/* Profile & Display Name */}
        {isSupabaseConfigured() && userProfile && (
          <section className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Profile Details</h2>
                <p className="text-xs text-stone-500 dark:text-zinc-400">
                  Signed in as <strong>{userProfile.email}</strong> ({userProfile.role})
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateDisplayName} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Display Name"
                className="flex-1 rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 dark:bg-amber-500 text-white dark:text-zinc-950 px-4 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Name
              </button>
            </form>
            {profileMsg && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">{profileMsg}</p>
            )}
          </section>
        )}

        {/* Change Password */}
        {isSupabaseConfigured() && userProfile && (
          <section className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Change Password</h2>
                <p className="text-xs text-stone-500 dark:text-zinc-400">
                  Update your account password (minimum 8 characters)
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="flex flex-col sm:flex-row gap-3">
              <input
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (8+ chars)"
                className="flex-1 rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
              <button
                type="submit"
                disabled={savingPassword || !newPassword}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 dark:bg-amber-500 text-white dark:text-zinc-950 px-4 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {savingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Update Password
              </button>
            </form>
            {passwordMsg && (
              <p className="text-xs text-amber-600 dark:text-amber-400">{passwordMsg}</p>
            )}
          </section>
        )}

        {/* Personal AI Key (Browser-Only BYOK) */}
        <section className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Personal AI Key (Browser-Only BYOK)</h2>
                <p className="text-xs text-stone-500 dark:text-zinc-400">
                  Stored strictly in this browser&apos;s localStorage — never saved to the database.
                </p>
              </div>
            </div>
            {userProfile?.ai_shared_key_allowed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <Sparkles className="w-3 h-3" /> Shared AI Key Active
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-zinc-400 mb-1">
                AI Provider
              </label>
              <select
                value={settings.aiProvider}
                onChange={(e) => updateSettings({ aiProvider: e.target.value as any })}
                className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-3 py-2 text-xs"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="ollama">Local Ollama</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-zinc-400 mb-1">
                Model Name
              </label>
              <input
                type="text"
                value={settings.aiModel || ""}
                onChange={(e) => updateSettings({ aiModel: e.target.value })}
                placeholder="e.g. gemini-2.0-flash"
                className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 dark:text-zinc-400 mb-1">
              Personal API Key (do not save on shared computers)
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={settings.aiApiKey || ""}
                onChange={(e) => updateSettings({ aiApiKey: e.target.value })}
                placeholder="Paste your API key here…"
                className="flex-1 rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-3.5 py-2 text-xs font-mono"
              />
              {settings.aiApiKey && (
                <button
                  type="button"
                  onClick={() => updateSettings({ aiApiKey: "" })}
                  className="rounded-xl border border-stone-200 dark:border-zinc-700 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  Forget Key
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Export All My Data */}
        <section className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold">Export All My Data (JSON)</h2>
            <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
              Download all of your resumes ({resumes.length}), cover letters ({coverLetters.length}
              ), job applications ({jobs.length}), and style presets ({customPresets.length}) as a
              portable JSON file.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportAllMyData}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-300 dark:border-zinc-700 hover:bg-stone-100 dark:hover:bg-zinc-800 px-4 py-2.5 text-xs font-semibold shrink-0"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Export all my data (JSON)
          </button>
        </section>

        {/* Import My Data (JSON) */}
        <section className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-zinc-800/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-bold">Import Data (JSON)</h2>
              </div>
              <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
                Restore or import a JSON file exported from Folio (account export, backup, or single resume).
              </p>
            </div>

            <label className="inline-flex items-center gap-2 rounded-xl bg-stone-900 dark:bg-amber-500 hover:bg-stone-800 dark:hover:bg-amber-400 text-white dark:text-zinc-950 px-4 py-2.5 text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-2xs">
              <UploadCloud className="w-4 h-4" />
              <span>{importFileName ? "Choose another file" : "Select JSON File"}</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {importErrorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3.5 text-xs text-red-700 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{importErrorMsg}</span>
            </div>
          )}

          {importSuccessMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-700 dark:text-emerald-300">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{importSuccessMsg}</span>
            </div>
          )}

          {importPreview && (
            <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-800/40 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="font-semibold text-stone-800 dark:text-zinc-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-stone-500" />
                  <span>{importFileName}</span>
                </div>
                {importPreview.exportedAt && (
                  <span className="text-[11px] text-stone-500 dark:text-zinc-400">
                    Exported: {new Date(importPreview.exportedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {importPreview.accountEmail && (
                <div className="text-[11px] text-stone-500 dark:text-zinc-400">
                  Original Account:{" "}
                  <span className="font-mono text-stone-700 dark:text-zinc-300">
                    {importPreview.accountEmail}
                  </span>
                </div>
              )}

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {importPreview.resumes > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                    <FileText className="w-3.5 h-3.5" />
                    {importPreview.resumes} Resume{importPreview.resumes > 1 ? "s" : ""}
                  </span>
                )}
                {importPreview.coverLetters > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                    <Mail className="w-3.5 h-3.5" />
                    {importPreview.coverLetters} Cover Letter
                    {importPreview.coverLetters > 1 ? "s" : ""}
                  </span>
                )}
                {importPreview.jobs > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                    <Briefcase className="w-3.5 h-3.5" />
                    {importPreview.jobs} Job Application{importPreview.jobs > 1 ? "s" : ""}
                  </span>
                )}
                {importPreview.stylePresets > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    {importPreview.stylePresets} Style Preset
                    {importPreview.stylePresets > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={importingData}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {importingData ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Import to My Account
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportPreview(null);
                    setImportJsonText(null);
                    setImportFileName(null);
                  }}
                  disabled={importingData}
                  className="rounded-xl border border-stone-200 dark:border-zinc-700 px-3 py-2 text-xs text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Delete My Account */}
        {isSupabaseConfigured() && userProfile && (
          <section className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-red-900 dark:text-red-200">
                  Delete My Account
                </h2>
                <p className="text-xs text-red-700/80 dark:text-red-300/80 mt-0.5">
                  Permanently deletes your account, all uploaded photos/files in storage, and all
                  resumes, cover letters, jobs, and presets. This action cannot be undone.
                </p>
              </div>
            </div>

            {deleteError && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">{deleteError}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={`Type "${userProfile.email}" to confirm`}
                className="flex-1 rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs"
              />
              <button
                type="button"
                disabled={
                  deleting ||
                  confirmEmail.trim().toLowerCase() !== userProfile.email.toLowerCase()
                }
                onClick={handleDeleteAccount}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-4 py-2 text-xs font-semibold transition-colors"
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete my account
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

