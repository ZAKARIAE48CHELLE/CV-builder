"use client";

import React, { useEffect, useState, useRef } from "react";
import { Navbar } from "@/components/common/Navbar";
import { useFolioStore } from "@/lib/store";
import { APP_NAME } from "@/config";
import {
  Key,
  Shield,
  Download,
  Upload,
  Trash2,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  AlertTriangle,
  Globe,
  Calendar,
  Layers,
  CheckCircle,
} from "lucide-react";

export default function SettingsPage() {
  const {
    isHydrated,
    initStore,
    settings,
    updateSettings,
    exportBackupJson,
    importBackupJson,
    clearAllData,
  } = useFolioStore();

  const [aiKeyInput, setAiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isHydrated) {
      initStore();
    }
  }, [isHydrated, initStore]);

  useEffect(() => {
    if (settings) {
      setAiKeyInput(settings.aiApiKey || "");
    }
  }, [settings?.aiApiKey]);

  const handleSaveAi = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ aiApiKey: aiKeyInput.trim() });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleExportBackup = () => {
    const jsonStr = exportBackupJson();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `folio_backup_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const ok = importBackupJson(content);
      if (ok) {
        alert("Backup restored successfully!");
      } else {
        alert("Failed to restore backup. Invalid JSON file format.");
      }
    };
    reader.readAsText(file);
  };

  const handleDangerClear = async () => {
    if (
      window.confirm(
        "WARNING: This will permanently erase all local resumes, cover letters, and tracked applications on this device. Proceed?"
      )
    ) {
      if (window.confirm("Are you completely sure? This action cannot be undone.")) {
        await clearAllData();
        alert("All local data has been reset to defaults.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 flex flex-col text-neutral-900 dark:text-neutral-100">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Settings & Local Storage
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Configure BYOK AI credentials, default typography and page presets, and data export.
          </p>
        </div>

        {/* 1. Bring-Your-Own-Key AI Settings */}
        <section className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  AI Assistance (Bring-Your-Own-Key)
                </h3>
                <p className="text-xs text-neutral-500">
                  Optional. If configured, unlocks bullet point enhancement, summary generation, and tailoring.
                </p>
              </div>
            </div>

            {settings.aiApiKey ? (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <Check className="w-3 h-3" /> Key active
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                AI disabled
              </span>
            )}
          </div>

          <form onSubmit={handleSaveAi} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  AI Provider
                </label>
                <select
                  value={settings.aiProvider}
                  onChange={(e) => updateSettings({ aiProvider: e.target.value as any })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                >
                  <option value="gemini">Google Gemini (Default)</option>
                  <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                  <option value="groq">Groq (Ultra-fast Llama 3)</option>
                  <option value="ollama">Ollama / Local Endpoint</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Model Identifier
                </label>
                <input
                  type="text"
                  value={settings.aiModel}
                  onChange={(e) => updateSettings({ aiModel: e.target.value })}
                  placeholder={
                    settings.aiProvider === "gemini"
                      ? "gemini-2.0-flash"
                      : settings.aiProvider === "ollama"
                      ? "llama3.2"
                      : settings.aiProvider === "groq"
                      ? "llama-3.3-70b-versatile"
                      : "gpt-4o-mini"
                  }
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono"
                />
              </div>
            </div>

            {/* Custom / Ollama Endpoint */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center justify-between">
                <span>
                  {settings.aiProvider === "ollama" ? "Ollama API Endpoint" : "Custom API Endpoint URL (Optional)"}
                </span>
                {settings.aiProvider === "ollama" && (
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                    OpenAI-compatible format
                  </span>
                )}
              </label>
              <input
                type="text"
                value={settings.aiCustomEndpoint || ""}
                onChange={(e) => updateSettings({ aiCustomEndpoint: e.target.value })}
                placeholder={
                  settings.aiProvider === "ollama"
                    ? "http://localhost:11434"
                    : "https://api.openai.com/v1/chat/completions"
                }
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                {settings.aiProvider === "ollama"
                  ? "Default: http://localhost:11434 (Auto-connects to Ollama API)"
                  : "Leave blank to use the official provider endpoint."}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center justify-between">
                <span>
                  {settings.aiProvider === "ollama"
                    ? "API Key (Optional for Ollama)"
                    : "API Key (Stored locally in IndexedDB, never leaves your machine)"}
                </span>
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={aiKeyInput}
                  onChange={(e) => setAiKeyInput(e.target.value)}
                  placeholder={
                    settings.aiProvider === "ollama"
                      ? "Optional - can leave blank for Ollama"
                      : "Paste your API key..."
                  }
                  className="w-full text-xs px-3 py-2 pr-10 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-2 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-neutral-500">
                Calls proxy through a local API route without exposing keys to client bundles.
              </span>

              <div className="flex items-center gap-2">
                {isSaved && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Saved!
                  </span>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90"
                >
                  Save Credentials
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* 2. Defaults */}
        <section className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Default Preferences
              </h3>
              <p className="text-xs text-neutral-500">
                Default page sizing and date conventions applied to new resumes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Default Page Size
              </label>
              <select
                value={settings.defaultPageSize}
                onChange={(e) => updateSettings({ defaultPageSize: e.target.value as any })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
              >
                <option value="A4">A4 (210 × 297 mm) — Standard International</option>
                <option value="Letter">US Letter (8.5 × 11 in) — North America</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Default Date Format
              </label>
              <select
                value={settings.defaultDateFormat}
                onChange={(e) => updateSettings({ defaultDateFormat: e.target.value as any })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
              >
                <option value="MMM YYYY">MMM YYYY (e.g. Oct 2024)</option>
                <option value="MM/YYYY">MM/YYYY (e.g. 10/2024)</option>
                <option value="YYYY">YYYY (e.g. 2024)</option>
              </select>
            </div>
          </div>
        </section>

        {/* 3. Backup & Restore */}
        <section className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Backup & Data Portability
              </h3>
              <p className="text-xs text-neutral-500">
                Export all resumes, cover letters, and applications to a single JSON archive.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleExportBackup}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90"
            >
              <Download className="w-3.5 h-3.5" />
              Export All Data (JSON)
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Backup Archive
            </button>
          </div>
        </section>

        {/* 4. Danger Zone */}
        <section className="bg-rose-50/40 dark:bg-rose-950/20 p-6 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-sm font-bold">Danger Zone</h3>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Permanently clear all stored resumes, cover letters, applications, and settings from this browser.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={handleDangerClear}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All Local Data
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
