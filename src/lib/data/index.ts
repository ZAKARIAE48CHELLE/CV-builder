import { get, set, del } from "idb-keyval";
import { Resume } from "../schema";
import { Repository } from "./repository";
import { LocalRepository } from "./localRepository";
import { SupabaseRepository } from "./supabaseRepository";
import { isSupabaseConfigured } from "../supabase/client";

const UNSAVED_EDITS_KEY = "folio_unsaved_edits_v1";

export interface UnsavedResumeEntry {
  resume: Resume;
  expectedVersion: number;
  timestamp: string;
}

const localRepoInstance = new LocalRepository();
const supabaseRepoInstance = new SupabaseRepository();

export function getActiveRepository(): Repository {
  if (isSupabaseConfigured()) {
    return supabaseRepoInstance;
  }
  return localRepoInstance;
}

export function getLocalRepository(): LocalRepository {
  return localRepoInstance;
}

export async function cacheUnsavedEdit(
  resume: Resume,
  expectedVersion: number
): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    const current = (await get<Record<string, UnsavedResumeEntry>>(UNSAVED_EDITS_KEY)) || {};
    current[resume.id] = {
      resume,
      expectedVersion,
      timestamp: new Date().toISOString(),
    };
    await set(UNSAVED_EDITS_KEY, current);
  } catch (e) {
    console.warn("Failed to cache unsaved edit:", e);
  }
}

export async function clearUnsavedEdit(resumeId: string): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    const current = (await get<Record<string, UnsavedResumeEntry>>(UNSAVED_EDITS_KEY)) || {};
    if (current[resumeId]) {
      delete current[resumeId];
      await set(UNSAVED_EDITS_KEY, current);
    }
  } catch {}
}

export async function getUnsavedEdits(): Promise<Record<string, UnsavedResumeEntry>> {
  if (typeof window === "undefined" || !window.indexedDB) return {};
  try {
    return (await get<Record<string, UnsavedResumeEntry>>(UNSAVED_EDITS_KEY)) || {};
  } catch {
    return {};
  }
}

export async function clearAllUnsavedEdits(): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    await del(UNSAVED_EDITS_KEY);
  } catch {}
}

