"use client";

import { create } from "zustand";
import { storageAdapter } from "./storage";
import { migrateState, createInitialState, PersistedState } from "./migrations";
import {
  Resume,
  CoverLetter,
  JobApplication,
  AppSettings,
  GlobalDesign,
  SectionDesign,
  HeaderDesign,
  PersonalInfo,
  Section,
  SectionItem,
  SectionType,
  SECTION_META,
  JobStage,
} from "./schema";
import { DEFAULT_DESIGN, SCHEMA_VERSION } from "../config";
import { DEFAULT_GLOBAL_DESIGN } from "./design/defaults";
import {
  StylePreset,
  getCustomPresets,
  saveCustomPreset as saveLocalCustomPreset,
  deleteCustomPreset as deleteLocalCustomPreset,
} from "./design/presets";
import {
  getActiveRepository,
  cacheUnsavedEdit,
  clearUnsavedEdit,
  getUnsavedEdits,
} from "./data";
import { VersionConflictError } from "./data/repository";
import { ensureUuid } from "./data/supabaseRepository";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase/client";
import { uploadDataUrlPhotoToStorage } from "./storage/userFiles";

const STORAGE_KEY = "folio_user_data_v1";
const BYOK_AI_SETTINGS_KEY = "folio_byok_ai_settings_v1";
const LOCAL_IMPORT_DISMISSED_KEY = "folio_local_import_dismissed_v1";
const MAX_UNDO_STACK = 50;

interface ResumeHistory {
  past: Resume[];
  future: Resume[];
}

export interface UserProfileInfo {
  id: string;
  email: string;
  display_name: string | null;
  status: "pending" | "approved" | "blocked";
  role: "user" | "admin";
  ai_shared_key_allowed: boolean;
}

export interface ConflictState {
  resumeId: string;
  localResume: Resume;
  remoteResume: Resume;
  remoteVersion: number;
}

export type SaveStatus = "saved" | "saving" | "offline" | "error";

function loadByokSettings(): Partial<AppSettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(BYOK_AI_SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveByokSettings(settings: AppSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      BYOK_AI_SETTINGS_KEY,
      JSON.stringify({
        aiProvider: settings.aiProvider,
        aiApiKey: settings.aiApiKey,
        aiModel: settings.aiModel,
        aiCustomEndpoint: settings.aiCustomEndpoint,
        defaultPageSize: settings.defaultPageSize,
        defaultDateFormat: settings.defaultDateFormat,
        language: settings.language,
        theme: settings.theme,
      })
    );
  } catch {
    // Ignore storage quota / private mode errors
  }
}

function newDocId(prefix: string): string {
  if (isSupabaseConfigured()) {
    return ensureUuid();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface FolioStoreState {
  isHydrated: boolean;
  resumes: Resume[];
  coverLetters: CoverLetter[];
  jobs: JobApplication[];
  customPresets: StylePreset[];
  settings: AppSettings;
  activeResumeId: string | null;

  // Multi-user / Supabase state
  userProfile: UserProfileInfo | null;
  pendingCount: number;
  resumeVersions: Record<string, number>;
  coverLetterVersions: Record<string, number>;
  saveStatus: SaveStatus;
  conflictState: ConflictState | null;
  hasLocalDataToImport: boolean;

  // Conflict & Offline sync actions
  resolveConflict: (choice: "keep_mine" | "load_latest" | "duplicate_mine") => Promise<void>;
  dismissConflict: () => void;
  retrySave: () => Promise<void>;
  importLocalDataToAccount: (clearAfter?: boolean) => Promise<boolean>;
  dismissLocalImportBanner: () => void;
  refreshUserProfile: () => Promise<void>;

  // Custom Style Presets
  saveCustomPresetAction: (preset: StylePreset) => Promise<void>;
  deleteCustomPresetAction: (presetId: string) => Promise<void>;

  // Style clipboard for copy / paste style
  copyStyleClipboard: Partial<SectionDesign> | null;
  setCopyStyleClipboard: (style: Partial<SectionDesign> | null) => void;

  // Active section selection (for preview click-to-select)
  selectedDesignTarget: { type: "header" } | { type: "section"; sectionId: string } | null;
  setSelectedDesignTarget: (target: { type: "header" } | { type: "section"; sectionId: string } | null) => void;

  // Undo / Redo stacks for the current active resume
  history: Record<string, ResumeHistory>;

  // Lifecycle
  initStore: () => Promise<void>;
  saveToStorage: (dirtyResumeId?: string) => Promise<void>;

  // Resume CRUD
  createResume: (title?: string, templateId?: string) => string;
  duplicateResume: (id: string) => string;
  renameResume: (id: string, newTitle: string) => void;
  deleteResume: (id: string) => void;
  updateResume: (id: string, updater: (draft: Resume) => Resume, recordHistory?: boolean) => void;
  updatePersonalInfo: (id: string, personal: Partial<PersonalInfo>) => void;
  updateDesign: (id: string, design: Partial<GlobalDesign>) => void;
  updateSectionDefaults: (id: string, patch: Partial<SectionDesign>) => void;
  updateHeaderDesign: (id: string, patch: Partial<HeaderDesign>) => void;
  resetHeaderDesign: (id: string) => void;
  updateSectionDesign: (id: string, sectionId: string, patch: Partial<SectionDesign>) => void;
  resetSectionDesign: (id: string, sectionId: string) => void;
  resetSectionDesignGroup: (id: string, sectionId: string, groupKey: keyof SectionDesign) => void;
  applySectionDesignToType: (id: string, sectionType: SectionType, design: Partial<SectionDesign>) => void;
  promoteSectionDesignToGlobal: (id: string, sectionId: string) => void;
  resetDesignToDefaults: (id: string) => void;

  // Resume Sections & Items
  addSection: (resumeId: string, type: SectionType, customHeading?: string) => void;
  removeSection: (resumeId: string, sectionId: string) => void;
  updateSectionHeading: (resumeId: string, sectionId: string, heading: string) => void;
  updateSectionIcon: (resumeId: string, sectionId: string, icon?: string) => void;
  toggleSectionVisibility: (resumeId: string, sectionId: string) => void;
  reorderSections: (resumeId: string, newSectionIds: string[]) => void;
  moveSectionColumn: (resumeId: string, sectionId: string, column: "main" | "side") => void;

  addItem: (resumeId: string, sectionId: string, item?: Partial<SectionItem>) => void;
  updateItem: (resumeId: string, sectionId: string, itemId: string, patch: Partial<SectionItem>) => void;
  removeItem: (resumeId: string, sectionId: string, itemId: string) => void;
  duplicateItem: (resumeId: string, sectionId: string, itemId: string) => void;
  toggleItemVisibility: (resumeId: string, sectionId: string, itemId: string) => void;
  reorderItems: (resumeId: string, sectionId: string, newItemIds: string[]) => void;

  // Undo / Redo
  undo: (resumeId: string) => void;
  redo: (resumeId: string) => void;
  canUndo: (resumeId: string) => boolean;
  canRedo: (resumeId: string) => boolean;

  // Cover Letters
  createCoverLetter: (title?: string, linkedResumeId?: string) => string;
  updateCoverLetter: (id: string, patch: Partial<CoverLetter>) => void;
  duplicateCoverLetter: (id: string) => string;
  deleteCoverLetter: (id: string) => void;

  // Job Tracker
  addJob: (job: Omit<JobApplication, "id">) => string;
  updateJob: (id: string, patch: Partial<JobApplication>) => void;
  updateJobStage: (id: string, stage: JobStage) => void;
  deleteJob: (id: string) => void;

  // Global Settings & Backup
  updateSettings: (patch: Partial<AppSettings>) => void;
  exportBackupJson: () => string;
  importBackupJson: (jsonString: string) => boolean;
  clearAllData: () => Promise<void>;
  hardSave: () => Promise<boolean>;
}

// Debounce timer for persistent saving
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const pendingDirtyResumeIds = new Set<string>();

function debouncedSave(state: FolioStoreState, dirtyResumeId?: string) {
  if (dirtyResumeId) {
    pendingDirtyResumeIds.add(dirtyResumeId);
  }
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const ids = Array.from(pendingDirtyResumeIds);
    pendingDirtyResumeIds.clear();
    state.saveToStorage(ids[0]);
  }, 500);
}

let networkListenersRegistered = false;

export const useFolioStore = create<FolioStoreState>((set, get) => ({
  isHydrated: false,
  resumes: [],
  coverLetters: [],
  jobs: [],
  customPresets: [],
  settings: {
    aiProvider: "gemini",
    aiApiKey: "",
    aiModel: "gemini-2.0-flash",
    defaultPageSize: "A4",
    defaultDateFormat: "MMM YYYY",
    language: "en",
    theme: "system",
  },
  activeResumeId: null,
  userProfile: null,
  pendingCount: 0,
  resumeVersions: {},
  coverLetterVersions: {},
  saveStatus: "saved",
  conflictState: null,
  hasLocalDataToImport: false,

  copyStyleClipboard: null,
  setCopyStyleClipboard: (style) => set({ copyStyleClipboard: style }),
  selectedDesignTarget: null,
  setSelectedDesignTarget: (target) => set({ selectedDesignTarget: target }),
  history: {},

  refreshUserProfile: async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        set({ userProfile: null, pendingCount: 0 });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, display_name, status, role, ai_shared_key_allowed")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profile) {
        set({ userProfile: profile as UserProfileInfo });
        if (profile.role === "admin") {
          const { count } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending");
          set({ pendingCount: count ?? 0 });
        }
      }
    } catch (e) {
      console.warn("Could not refresh user profile:", e);
    }
  },

  initStore: async () => {
    // Register online/offline listeners once in the browser
    if (typeof window !== "undefined" && !networkListenersRegistered) {
      networkListenersRegistered = true;
      window.addEventListener("online", () => {
        get().retrySave().catch(() => {});
      });
      window.addEventListener("offline", () => {
        set({ saveStatus: "offline" });
      });
    }

    const byok = loadByokSettings();

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          if (authData.user) {
            await get().refreshUserProfile();
            const profile = get().userProfile;

            if (profile && profile.status === "approved") {
              const repo = getActiveRepository();
              const [resumeRows, letterRows, jobs, presets] = await Promise.all([
                repo.listFullResumes(),
                repo.listCoverLetters(),
                repo.listJobs(),
                repo.listPresets(),
              ]);

              const resumeVersions: Record<string, number> = {};
              const resumes: Resume[] = resumeRows.map((r) => {
                resumeVersions[r.resume.id] = r.version;
                return r.resume;
              });

              const coverLetterVersions: Record<string, number> = {};
              const coverLetters: CoverLetter[] = letterRows.map((c) => {
                coverLetterVersions[c.letter.id] = c.version;
                return c.letter;
              });

              // Check if there are cached unsaved edits from offline mode
              const unsaved = await getUnsavedEdits();
              for (const [resId, entry] of Object.entries(unsaved)) {
                const idx = resumes.findIndex((r) => r.id === resId);
                if (idx >= 0) {
                  resumes[idx] = entry.resume;
                } else {
                  resumes.unshift(entry.resume);
                }
              }

              // Check if local IndexedDB has un-imported resumes
              let hasLocalDataToImport = false;
              try {
                const dismissed =
                  typeof window !== "undefined" &&
                  window.localStorage.getItem(LOCAL_IMPORT_DISMISSED_KEY) === "true";
                if (!dismissed) {
                  const localPersisted = await storageAdapter.getItem<PersistedState>(STORAGE_KEY);
                  if (
                    localPersisted &&
                    Array.isArray(localPersisted.resumes) &&
                    localPersisted.resumes.length > 0
                  ) {
                    hasLocalDataToImport = true;
                  }
                }
              } catch {}

              set((state) => ({
                resumes,
                coverLetters,
                jobs,
                customPresets: presets,
                resumeVersions,
                coverLetterVersions,
                hasLocalDataToImport,
                settings: {
                  ...state.settings,
                  ...byok,
                },
                isHydrated: true,
              }));

              // Flush any cached offline edits in background
              if (Object.keys(unsaved).length > 0) {
                get().retrySave().catch(() => {});
              }
              return;
            }
          }
        } catch (e) {
          console.warn("Supabase initStore fallback to local:", e);
        }
      }
    }

    // Local mode (or unauthenticated public preview)
    try {
      const persisted = await storageAdapter.getItem<PersistedState>(STORAGE_KEY);
      const migrated = migrateState(persisted);
      const mergedSettings: AppSettings = {
        ...migrated.settings,
        ...byok,
      };
      const resumeVersions: Record<string, number> = {};
      for (const r of migrated.resumes) {
        resumeVersions[r.id] = 1;
      }
      set({
        resumes: migrated.resumes,
        coverLetters: migratedCoverLettersFallback(migrated),
        jobs: migrated.jobs,
        customPresets: getCustomPresets(),
        settings: mergedSettings,
        resumeVersions,
        isHydrated: true,
      });
    } catch (e) {
      console.error("Failed to load persisted state, using initial sample:", e);
      const initial = createInitialState();
      set({
        ...initial,
        customPresets: getCustomPresets(),
        settings: { ...initial.settings, ...byok },
        isHydrated: true,
      });
    }
  },

  saveToStorage: async (dirtyResumeId?: string) => {
    const {
      resumes,
      coverLetters,
      jobs,
      settings,
      userProfile,
      resumeVersions,
    } = get();

    // Always keep BYOK AI settings in browser localStorage only
    saveByokSettings(settings);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      set({ saveStatus: "offline" });
      if (dirtyResumeId) {
        const target = resumes.find((r) => r.id === dirtyResumeId);
        if (target) {
          await cacheUnsavedEdit(target, resumeVersions[dirtyResumeId] ?? 1);
        }
      }
      return;
    }

    set({ saveStatus: "saving" });

    // Supabase mode when user is authenticated & approved
    if (isSupabaseConfigured() && userProfile && userProfile.status === "approved") {
      const repo = getActiveRepository();
      try {
        if (dirtyResumeId) {
          const target = resumes.find((r) => r.id === dirtyResumeId);
          if (target) {
            const expectedVersion = resumeVersions[dirtyResumeId] ?? 1;
            await cacheUnsavedEdit(target, expectedVersion);
            const { version: newVersion } = await repo.saveResume(target, expectedVersion);
            await clearUnsavedEdit(dirtyResumeId);
            set((state) => ({
              resumeVersions: { ...state.resumeVersions, [dirtyResumeId]: newVersion },
              saveStatus: "saved",
            }));
            return;
          }
        }

        // Save all resumes if no specific dirtyResumeId was provided
        const nextVersions = { ...resumeVersions };
        for (const r of resumes) {
          const exp = nextVersions[r.id] ?? 1;
          const { version } = await repo.saveResume(r, exp);
          nextVersions[r.id] = version;
          await clearUnsavedEdit(r.id);
        }
        set({ resumeVersions: nextVersions, saveStatus: "saved" });
        return;
      } catch (err) {
        if (err instanceof VersionConflictError && dirtyResumeId) {
          const localResume = resumes.find((r) => r.id === dirtyResumeId);
          if (localResume) {
            set({
              saveStatus: "error",
              conflictState: {
                resumeId: dirtyResumeId,
                localResume,
                remoteResume: err.latestResume || localResume,
                remoteVersion: err.latestVersion,
              },
            });
            return;
          }
        }
        console.error("Failed to save to Supabase:", err);
        set({
          saveStatus:
            typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error",
        });
        return;
      }
    }

    // Local mode persistence (strip aiApiKey from server file payload if desired, though localStorage has it)
    try {
      const dataToPersist: PersistedState = {
        schemaVersion: SCHEMA_VERSION,
        resumes,
        coverLetters,
        jobs,
        settings,
      };
      await storageAdapter.setItem(STORAGE_KEY, dataToPersist);
      set({ saveStatus: "saved" });
    } catch (e) {
      console.error("Local save error:", e);
      set({ saveStatus: "error" });
    }
  },

  retrySave: async () => {
    const unsaved = await getUnsavedEdits();
    const entries = Object.values(unsaved);
    if (entries.length > 0 && isSupabaseConfigured() && get().userProfile?.status === "approved") {
      const repo = getActiveRepository();
      set({ saveStatus: "saving" });
      try {
        for (const entry of entries) {
          const currentLocal = get().resumes.find((r) => r.id === entry.resume.id) || entry.resume;
          const expectedVer = get().resumeVersions[currentLocal.id] ?? entry.expectedVersion;
          const { version } = await repo.saveResume(currentLocal, expectedVer);
          await clearUnsavedEdit(currentLocal.id);
          set((state) => ({
            resumeVersions: { ...state.resumeVersions, [currentLocal.id]: version },
          }));
        }
        set({ saveStatus: "saved" });
        return;
      } catch (err) {
        if (err instanceof VersionConflictError && entries[0]) {
          const rid = entries[0].resume.id;
          const localResume = get().resumes.find((r) => r.id === rid) || entries[0].resume;
          set({
            saveStatus: "error",
            conflictState: {
              resumeId: rid,
              localResume,
              remoteResume: err.latestResume || localResume,
              remoteVersion: err.latestVersion,
            },
          });
          return;
        }
        set({ saveStatus: "error" });
        return;
      }
    }

    await get().saveToStorage(get().activeResumeId || undefined);
  },

  resolveConflict: async (choice) => {
    const conflict = get().conflictState;
    if (!conflict) return;
    const repo = getActiveRepository();
    const { resumeId, localResume, remoteResume, remoteVersion } = conflict;

    set({ saveStatus: "saving" });
    try {
      if (choice === "keep_mine") {
        const { version } = await repo.saveResume(localResume, remoteVersion, true);
        await clearUnsavedEdit(resumeId);
        set((state) => ({
          resumes: state.resumes.map((r) => (r.id === resumeId ? localResume : r)),
          resumeVersions: { ...state.resumeVersions, [resumeId]: version },
          conflictState: null,
          saveStatus: "saved",
        }));
      } else if (choice === "load_latest") {
        await clearUnsavedEdit(resumeId);
        set((state) => ({
          resumes: state.resumes.map((r) => (r.id === resumeId ? remoteResume : r)),
          resumeVersions: { ...state.resumeVersions, [resumeId]: remoteVersion },
          conflictState: null,
          saveStatus: "saved",
        }));
      } else if (choice === "duplicate_mine") {
        const copyId = ensureUuid();
        const copyResume: Resume = {
          ...JSON.parse(JSON.stringify(localResume)),
          id: copyId,
          title: `${localResume.title} (Conflicted Copy)`,
          updatedAt: new Date().toISOString(),
        };
        const created = await repo.createResume(copyResume);
        await clearUnsavedEdit(resumeId);
        set((state) => ({
          resumes: [
            created.resume,
            ...state.resumes.map((r) => (r.id === resumeId ? remoteResume : r)),
          ],
          resumeVersions: {
            ...state.resumeVersions,
            [resumeId]: remoteVersion,
            [created.resume.id]: created.version,
          },
          conflictState: null,
          saveStatus: "saved",
        }));
      }
    } catch (e) {
      console.error("Conflict resolution failed:", e);
      set({ saveStatus: "error" });
    }
  },

  dismissConflict: () => set({ conflictState: null }),

  importLocalDataToAccount: async (clearAfter = false) => {
    if (!isSupabaseConfigured()) return false;
    const repo = getActiveRepository();
    try {
      const localPersisted = await storageAdapter.getItem<PersistedState>(STORAGE_KEY);
      if (!localPersisted) return false;
      const migrated = migrateState(localPersisted);

      const idMap = new Map<string, string>();
      const importedResumes: Resume[] = [];
      const newResumeVersions: Record<string, number> = { ...get().resumeVersions };

      for (const localRes of migrated.resumes) {
        const newId = ensureUuid();
        idMap.set(localRes.id, newId);

        let photoRef = localRes.personal?.photo;
        if (photoRef && photoRef.startsWith("data:image/")) {
          photoRef = await uploadDataUrlPhotoToStorage(photoRef);
        }

        const resumeToCreate: Resume = {
          ...localRes,
          id: newId,
          personal: {
            ...localRes.personal,
            photo: photoRef || undefined,
          },
          updatedAt: new Date().toISOString(),
        };

        const created = await repo.createResume(resumeToCreate);
        importedResumes.push(created.resume);
        newResumeVersions[created.resume.id] = created.version;
      }

      const importedLetters: CoverLetter[] = [];
      const newLetterVersions: Record<string, number> = { ...get().coverLetterVersions };
      for (const localCl of migrated.coverLetters || []) {
        const newClId = ensureUuid();
        const mappedResumeId = localCl.linkedResumeId
          ? idMap.get(localCl.linkedResumeId)
          : undefined;
        const createdCl = await repo.createCoverLetter({
          ...localCl,
          id: newClId,
          linkedResumeId: mappedResumeId,
        });
        importedLetters.push(createdCl.letter);
        newLetterVersions[createdCl.letter.id] = createdCl.version;
      }

      const importedJobs: JobApplication[] = [];
      for (let i = 0; i < (migrated.jobs || []).length; i++) {
        const localJob = migrated.jobs[i];
        const mappedResumeId = localJob.linkedResumeId ? idMap.get(localJob.linkedResumeId) : undefined;
        const createdJob = await repo.createJob(
          {
            ...localJob,
            id: ensureUuid(),
            linkedResumeId: mappedResumeId,
          },
          i
        );
        importedJobs.push(createdJob);
      }

      const localPresets = getCustomPresets();
      const importedPresets: StylePreset[] = [];
      for (const preset of localPresets) {
        const savedPreset = await repo.savePreset({
          ...preset,
          id: ensureUuid(),
        });
        importedPresets.push(savedPreset);
      }

      if (clearAfter) {
        await storageAdapter.clearAll();
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LOCAL_IMPORT_DISMISSED_KEY, "true");
      }

      set((state) => ({
        resumes: [...importedResumes, ...state.resumes],
        coverLetters: [...importedLetters, ...state.coverLetters],
        jobs: [...importedJobs, ...state.jobs],
        customPresets: [...importedPresets, ...state.customPresets],
        resumeVersions: newResumeVersions,
        coverLetterVersions: newLetterVersions,
        hasLocalDataToImport: false,
      }));

      return true;
    } catch (e) {
      console.error("Failed to import local data into account:", e);
      return false;
    }
  },

  dismissLocalImportBanner: () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LOCAL_IMPORT_DISMISSED_KEY, "true");
      } catch {}
    }
    set({ hasLocalDataToImport: false });
  },

  saveCustomPresetAction: async (preset: StylePreset) => {
    if (isSupabaseConfigured() && get().userProfile?.status === "approved") {
      const repo = getActiveRepository();
      const saved = await repo.savePreset(preset);
      set((state) => ({
        customPresets: [saved, ...state.customPresets.filter((p) => p.id !== saved.id)],
      }));
    } else {
      saveLocalCustomPreset(preset);
      set({ customPresets: getCustomPresets() });
    }
  },

  deleteCustomPresetAction: async (presetId: string) => {
    if (isSupabaseConfigured() && get().userProfile?.status === "approved") {
      const repo = getActiveRepository();
      await repo.deletePreset(presetId);
      set((state) => ({
        customPresets: state.customPresets.filter((p) => p.id !== presetId),
      }));
    } else {
      deleteLocalCustomPreset(presetId);
      set({ customPresets: getCustomPresets() });
    }
  },

  hardSave: async () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    const { resumes, coverLetters, jobs, settings, userProfile, resumeVersions } = get();

    // 1. Deduplicate Resumes by ID
    const seenResumeIds = new Set<string>();
    const cleanedResumes: Resume[] = [];

    for (const res of resumes) {
      if (!res.id || seenResumeIds.has(res.id)) continue;
      seenResumeIds.add(res.id);

      // Deduplicate Sections in resume by ID
      const seenSectionIds = new Set<string>();
      const cleanedSections = (res.sections || [])
        .filter((sec) => {
          if (!sec.id || seenSectionIds.has(sec.id)) return false;
          seenSectionIds.add(sec.id);
          return true;
        })
        .map((sec) => {
          // Deduplicate Items in section by ID and identity
          const seenItemKeys = new Set<string>();
          const cleanedItems = (sec.items || [])
            .filter((item) => {
              if (!item.id) return false;
              const contentKey = `${item.title || ""}_${item.subtitle || ""}_${item.startDate || ""}_${item.endDate || ""}`;
              if (
                seenItemKeys.has(item.id) ||
                (contentKey !== "___" && seenItemKeys.has(contentKey))
              ) {
                return false;
              }
              seenItemKeys.add(item.id);
              if (contentKey !== "___") seenItemKeys.add(contentKey);
              return true;
            })
            .map((item) => {
              if (Array.isArray(item.tags)) {
                return {
                  ...item,
                  tags: Array.from(new Set(item.tags.filter(Boolean))),
                };
              }
              return item;
            });

          return {
            ...sec,
            items: cleanedItems,
          };
        });

      cleanedResumes.push({
        ...res,
        updatedAt: new Date().toISOString(),
        sections: cleanedSections,
      });
    }

    // Deduplicate Cover Letters
    const seenCoverIds = new Set<string>();
    const cleanedCoverLetters = (coverLetters || []).filter((cl) => {
      if (!cl.id || seenCoverIds.has(cl.id)) return false;
      seenCoverIds.add(cl.id);
      return true;
    });

    // Deduplicate Jobs
    const seenJobIds = new Set<string>();
    const cleanedJobs = (jobs || []).filter((j) => {
      if (!j.id || seenJobIds.has(j.id)) return false;
      seenJobIds.add(j.id);
      return true;
    });

    set({
      resumes: cleanedResumes,
      coverLetters: cleanedCoverLetters,
      jobs: cleanedJobs,
      saveStatus: "saving",
    });

    saveByokSettings(settings);

    if (isSupabaseConfigured() && userProfile?.status === "approved") {
      try {
        const repo = getActiveRepository();
        const nextVersions = { ...resumeVersions };
        for (const r of cleanedResumes) {
          const expected = nextVersions[r.id] ?? 1;
          const { version } = await repo.saveResume(r, expected);
          nextVersions[r.id] = version;
          await clearUnsavedEdit(r.id);
        }
        set({ resumeVersions: nextVersions, saveStatus: "saved" });
        return true;
      } catch (err) {
        console.error("Supabase hardSave error:", err);
        set({ saveStatus: "error" });
        return false;
      }
    }

    const payload: PersistedState = {
      schemaVersion: SCHEMA_VERSION,
      resumes: cleanedResumes,
      coverLetters: cleanedCoverLetters,
      jobs: cleanedJobs,
      settings,
    };

    try {
      await storageAdapter.setItem(STORAGE_KEY, payload);
      set({ saveStatus: "saved" });
      return true;
    } catch (err) {
      console.error("Hard save error:", err);
      set({ saveStatus: "error" });
      return false;
    }
  },

  createResume: (title = "Untitled Resume", templateId = "plain") => {
    const id = newDocId("res");
    const newResume: Resume = {
      id,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      templateId,
      design: { ...DEFAULT_GLOBAL_DESIGN },
      headerDesign: {},
      sectionDesigns: {},
      personal: {
        fullName: "Your Name",
        jobTitle: "Your Professional Title",
        email: "you@example.com",
        phone: "+1 234 567 890",
        location: "City, Country",
      },
      sections: [
        {
          id: `sec-${Date.now()}-1`,
          type: "summary",
          heading: "Professional Summary",
          visible: true,
          column: "main",
          items: [
            {
              id: `item-${Date.now()}-1`,
              visible: true,
              description: "<p>Experienced and driven professional with a proven track record...</p>",
            },
          ],
        },
        {
          id: `sec-${Date.now()}-2`,
          type: "experience",
          heading: "Experience",
          visible: true,
          column: "main",
          items: [
            {
              id: `item-${Date.now()}-2`,
              visible: true,
              title: "Job Title",
              subtitle: "Company Name",
              location: "Location",
              startDate: "2022-01",
              endDate: "Present",
              description: "<ul><li>Key accomplishment or quantifiable project delivery.</li></ul>",
              tags: ["Leadership", "Project Management"],
            },
          ],
        },
        {
          id: `sec-${Date.now()}-3`,
          type: "education",
          heading: "Education",
          visible: true,
          column: "main",
          items: [
            {
              id: `item-${Date.now()}-3`,
              visible: true,
              title: "Degree or Major",
              subtitle: "University / Institution",
              startDate: "2018",
              endDate: "2022",
            },
          ],
        },
        {
          id: `sec-${Date.now()}-4`,
          type: "skills",
          heading: "Skills",
          visible: true,
          column: "side",
          items: [
            {
              id: `item-${Date.now()}-4`,
              visible: true,
              title: "Technical",
              tags: ["Skill 1", "Skill 2", "Skill 3"],
            },
          ],
        },
      ],
    };

    set((state) => ({
      resumes: [newResume, ...state.resumes],
      resumeVersions: { ...state.resumeVersions, [id]: 1 },
    }));

    if (isSupabaseConfigured() && get().userProfile?.status === "approved") {
      getActiveRepository()
        .createResume(newResume)
        .then(({ version }) => {
          set((state) => ({
            resumeVersions: { ...state.resumeVersions, [id]: version },
            saveStatus: "saved",
          }));
        })
        .catch(() => {
          debouncedSave(get(), id);
        });
    } else {
      debouncedSave(get(), id);
    }
    return id;
  },

  duplicateResume: (id: string) => {
    const { resumes } = get();
    const target = resumes.find((r) => r.id === id);
    if (!target) return "";

    const newId = newDocId("res");
    const duplicated: Resume = JSON.parse(JSON.stringify(target));
    duplicated.id = newId;
    duplicated.title = `${target.title} (Copy)`;
    duplicated.createdAt = new Date().toISOString();
    duplicated.updatedAt = new Date().toISOString();

    const newSectionDesigns: Record<string, any> = {};
    duplicated.sections = (duplicated.sections || []).map((sec, idx) => {
      const newSecId = `sec-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
      if (duplicated.sectionDesigns?.[sec.id]) {
        newSectionDesigns[newSecId] = duplicated.sectionDesigns[sec.id];
      }
      return {
        ...sec,
        id: newSecId,
        items: (sec.items || []).map((item, itemIdx) => ({
          ...item,
          id: `item-${Date.now()}-${itemIdx}-${Math.random().toString(36).slice(2, 6)}`,
        })),
      };
    });
    duplicated.sectionDesigns = newSectionDesigns;

    set((state) => ({
      resumes: [duplicated, ...state.resumes],
      resumeVersions: { ...state.resumeVersions, [newId]: 1 },
    }));

    if (isSupabaseConfigured() && get().userProfile?.status === "approved") {
      getActiveRepository()
        .createResume(duplicated)
        .then(({ version }) => {
          set((state) => ({
            resumeVersions: { ...state.resumeVersions, [newId]: version },
            saveStatus: "saved",
          }));
        })
        .catch(() => debouncedSave(get(), newId));
    } else {
      debouncedSave(get(), newId);
    }
    return newId;
  },

  renameResume: (id: string, newTitle: string) => {
    set((state) => ({
      resumes: state.resumes.map((r) =>
        r.id === id ? { ...r, title: newTitle, updatedAt: new Date().toISOString() } : r
      ),
    }));
    debouncedSave(get(), id);
  },

  deleteResume: (id: string) => {
    set((state) => ({
      resumes: state.resumes.filter((r) => r.id !== id),
    }));
    if (isSupabaseConfigured() && get().userProfile?.status === "approved") {
      getActiveRepository()
        .deleteResume(id)
        .catch((e) => console.error("Failed to delete resume:", e));
    } else {
      debouncedSave(get());
    }
  },

  updateResume: (id: string, updater: (draft: Resume) => Resume, recordHistory = true) => {
    const current = get().resumes.find((r) => r.id === id);
    if (!current) return;

    if (recordHistory) {
      const hist = get().history[id] || { past: [], future: [] };
      const newPast = [...hist.past, JSON.parse(JSON.stringify(current))].slice(-MAX_UNDO_STACK);
      set((state) => ({
        history: {
          ...state.history,
          [id]: { past: newPast, future: [] },
        },
      }));
    }

    const updated = updater(JSON.parse(JSON.stringify(current)));
    updated.updatedAt = new Date().toISOString();

    set((state) => ({
      resumes: state.resumes.map((r) => (r.id === id ? updated : r)),
    }));
    debouncedSave(get(), id);
  },

  updatePersonalInfo: (id: string, patch: Partial<PersonalInfo>) => {
    get().updateResume(id, (draft) => {
      draft.personal = { ...draft.personal, ...patch };
      return draft;
    });
  },

  updateDesign: (id: string, patch: Partial<GlobalDesign>) => {
    get().updateResume(id, (draft) => {
      draft.design = { ...draft.design, ...patch };
      return draft;
    });
  },

  updateSectionDefaults: (id: string, patch: Partial<SectionDesign>) => {
    get().updateResume(id, (draft) => {
      draft.design.sectionDefaults = {
        ...draft.design.sectionDefaults,
        ...patch,
        heading:
          patch.heading !== undefined
            ? { ...(draft.design.sectionDefaults.heading || {}), ...patch.heading }
            : draft.design.sectionDefaults.heading,
        arrangement:
          patch.arrangement !== undefined
            ? { ...(draft.design.sectionDefaults.arrangement || {}), ...patch.arrangement }
            : draft.design.sectionDefaults.arrangement,
        entry:
          patch.entry !== undefined
            ? { ...(draft.design.sectionDefaults.entry || {}), ...patch.entry }
            : draft.design.sectionDefaults.entry,
        description:
          patch.description !== undefined
            ? { ...(draft.design.sectionDefaults.description || {}), ...patch.description }
            : draft.design.sectionDefaults.description,
        level:
          patch.level !== undefined
            ? { ...(draft.design.sectionDefaults.level || {}), ...patch.level }
            : draft.design.sectionDefaults.level,
        spacing:
          patch.spacing !== undefined
            ? { ...(draft.design.sectionDefaults.spacing || {}), ...patch.spacing }
            : draft.design.sectionDefaults.spacing,
        typography:
          patch.typography !== undefined
            ? { ...(draft.design.sectionDefaults.typography || {}), ...patch.typography }
            : draft.design.sectionDefaults.typography,
        container:
          patch.container !== undefined
            ? { ...(draft.design.sectionDefaults.container || {}), ...patch.container }
            : draft.design.sectionDefaults.container,
        placement:
          patch.placement !== undefined
            ? { ...(draft.design.sectionDefaults.placement || {}), ...patch.placement }
            : draft.design.sectionDefaults.placement,
        dates:
          patch.dates !== undefined
            ? { ...(draft.design.sectionDefaults.dates || {}), ...patch.dates }
            : draft.design.sectionDefaults.dates,
      };
      return draft;
    });
  },

  updateHeaderDesign: (id: string, patch: Partial<HeaderDesign>) => {
    get().updateResume(id, (draft) => {
      draft.headerDesign = {
        ...(draft.headerDesign || {}),
        ...patch,
        photo:
          patch.photo !== undefined
            ? { ...(draft.headerDesign?.photo || {}), ...patch.photo }
            : draft.headerDesign?.photo,
      };
      return draft;
    });
  },

  resetHeaderDesign: (id: string) => {
    get().updateResume(id, (draft) => {
      draft.headerDesign = {};
      return draft;
    });
  },

  updateSectionDesign: (id: string, sectionId: string, patch: Partial<SectionDesign>) => {
    get().updateResume(id, (draft) => {
      if (!draft.sectionDesigns) draft.sectionDesigns = {};
      const current = draft.sectionDesigns[sectionId] || {};
      draft.sectionDesigns[sectionId] = {
        ...current,
        ...patch,
        heading:
          patch.heading !== undefined ? { ...(current.heading || {}), ...patch.heading } : current.heading,
        arrangement:
          patch.arrangement !== undefined
            ? { ...(current.arrangement || {}), ...patch.arrangement }
            : current.arrangement,
        entry:
          patch.entry !== undefined ? { ...(current.entry || {}), ...patch.entry } : current.entry,
        description:
          patch.description !== undefined
            ? { ...(current.description || {}), ...patch.description }
            : current.description,
        level:
          patch.level !== undefined ? { ...(current.level || {}), ...patch.level } : current.level,
        spacing:
          patch.spacing !== undefined ? { ...(current.spacing || {}), ...patch.spacing } : current.spacing,
        typography:
          patch.typography !== undefined
            ? { ...(current.typography || {}), ...patch.typography }
            : current.typography,
        container:
          patch.container !== undefined
            ? { ...(current.container || {}), ...patch.container }
            : current.container,
        placement:
          patch.placement !== undefined
            ? { ...(current.placement || {}), ...patch.placement }
            : current.placement,
        dates:
          patch.dates !== undefined ? { ...(current.dates || {}), ...patch.dates } : current.dates,
      };
      return draft;
    });
  },

  resetSectionDesign: (id: string, sectionId: string) => {
    get().updateResume(id, (draft) => {
      if (draft.sectionDesigns) {
        delete draft.sectionDesigns[sectionId];
      }
      return draft;
    });
  },

  resetSectionDesignGroup: (id: string, sectionId: string, groupKey: keyof SectionDesign) => {
    get().updateResume(id, (draft) => {
      if (draft.sectionDesigns?.[sectionId]) {
        delete (draft.sectionDesigns[sectionId] as any)[groupKey];
      }
      return draft;
    });
  },

  applySectionDesignToType: (id: string, sectionType: SectionType, design: Partial<SectionDesign>) => {
    get().updateResume(id, (draft) => {
      if (!draft.sectionDesigns) draft.sectionDesigns = {};
      for (const sec of draft.sections) {
        if (sec.type === sectionType) {
          draft.sectionDesigns[sec.id] = JSON.parse(JSON.stringify(design));
        }
      }
      return draft;
    });
  },

  promoteSectionDesignToGlobal: (id: string, sectionId: string) => {
    get().updateResume(id, (draft) => {
      const overrides = draft.sectionDesigns?.[sectionId];
      if (overrides) {
        draft.design.sectionDefaults = {
          ...draft.design.sectionDefaults,
          ...overrides,
          heading: { ...draft.design.sectionDefaults.heading, ...(overrides.heading || {}) },
          arrangement: {
            ...draft.design.sectionDefaults.arrangement,
            ...(overrides.arrangement || {}),
          },
          entry: { ...draft.design.sectionDefaults.entry, ...(overrides.entry || {}) },
          description: {
            ...draft.design.sectionDefaults.description,
            ...(overrides.description || {}),
          },
          level: { ...draft.design.sectionDefaults.level, ...(overrides.level || {}) },
          spacing: { ...draft.design.sectionDefaults.spacing, ...(overrides.spacing || {}) },
          typography: {
            ...draft.design.sectionDefaults.typography,
            ...(overrides.typography || {}),
          },
          container: { ...draft.design.sectionDefaults.container, ...(overrides.container || {}) },
          placement: { ...draft.design.sectionDefaults.placement, ...(overrides.placement || {}) },
          dates: { ...draft.design.sectionDefaults.dates, ...(overrides.dates || {}) },
        };
        delete draft.sectionDesigns[sectionId];
      }
      return draft;
    });
  },

  resetDesignToDefaults: (id: string) => {
    get().updateResume(id, (draft) => {
      draft.design = { ...DEFAULT_GLOBAL_DESIGN };
      draft.headerDesign = {};
      draft.sectionDesigns = {};
      return draft;
    });
  },

  addSection: (resumeId: string, type: SectionType, customHeading?: string) => {
    const meta = SECTION_META[type];
    const newSection: Section = {
      id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      heading: customHeading || meta?.defaultHeading || "New Section",
      visible: true,
      column: type === "skills" || type === "languages" || type === "interests" ? "side" : "main",
      icon: meta?.iconName,
      items: [
        {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          visible: true,
          title: type === "skills" ? "Core Skills" : type === "experience" ? "Role Title" : "",
          description: "",
          tags: type === "skills" ? ["New Skill"] : undefined,
        },
      ],
    };

    get().updateResume(resumeId, (draft) => {
      draft.sections.push(newSection);
      return draft;
    });
  },

  removeSection: (resumeId: string, sectionId: string) => {
    get().updateResume(resumeId, (draft) => {
      draft.sections = draft.sections.filter((s) => s.id !== sectionId);
      if (draft.sectionDesigns && draft.sectionDesigns[sectionId]) {
        delete draft.sectionDesigns[sectionId];
      }
      return draft;
    });
  },

  updateSectionHeading: (resumeId: string, sectionId: string, heading: string) => {
    get().updateResume(resumeId, (draft) => {
      const sec = draft.sections.find((s) => s.id === sectionId);
      if (sec) sec.heading = heading;
      return draft;
    });
  },

  updateSectionIcon: (resumeId: string, sectionId: string, icon?: string) => {
    get().updateResume(resumeId, (draft) => {
      const sec = draft.sections.find((s) => s.id === sectionId);
      if (sec) sec.icon = icon;
      return draft;
    });
  },

  toggleSectionVisibility: (resumeId: string, sectionId: string) => {
    get().updateResume(resumeId, (draft) => {
      const sec = draft.sections.find((s) => s.id === sectionId);
      if (sec) sec.visible = !sec.visible;
      return draft;
    });
  },

  reorderSections: (resumeId: string, newSectionIds: string[]) => {
    get().updateResume(resumeId, (draft) => {
      const map = new Map(draft.sections.map((s) => [s.id, s]));
      const ordered: Section[] = [];
      for (const id of newSectionIds) {
        const item = map.get(id);
        if (item) ordered.push(item);
      }
      draft.sections = ordered;
      return draft;
    });
  },

  moveSectionColumn: (resumeId: string, sectionId: string, column: "main" | "side") => {
    get().updateResume(resumeId, (draft) => {
      const sec = draft.sections.find((s) => s.id === sectionId);
      if (sec) sec.column = column;
      return draft;
    });
  },

  addItem: (resumeId: string, sectionId: string, itemPatch?: Partial<SectionItem>) => {
    const newItem: SectionItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      visible: true,
      title: "",
      subtitle: "",
      description: "",
      ...itemPatch,
    };

    get().updateResume(resumeId, (draft) => {
      const sec = draft.sections.find((s) => s.id === sectionId);
      if (sec) {
        sec.items.push(newItem);
      }
      return draft;
    });
  },

  updateItem: (resumeId: string, sectionId: string, itemId: string, patch: Partial<SectionItem>) => {
    get().updateResume(resumeId, (draft) => {
      const sec = draft.sections.find((s) => s.id === sectionId);
      if (sec) {
        sec.items = sec.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i));
      }
      return draft;
    });
  },

  removeItem: (resumeId: string, sectionId: string, itemId: string) => {
    get().updateResume(resumeId, (draft) => {
      const sec = draft.sections.find((s) => s.id === sectionId);
      if (sec) {
        sec.items = sec.items.filter((i) => i.id !== itemId);
      }
      return draft;
    });
  },

  duplicateItem: (resumeId: string, sectionId: string, itemId: string) => {
    get().updateResume(resumeId, (draft) => {
      const sec = draft.sections.find((s) => s.id === sectionId);
      if (sec) {
        const itemIndex = sec.items.findIndex((i) => i.id === itemId);
        if (itemIndex >= 0) {
          const original = sec.items[itemIndex];
          const cloned: SectionItem = {
            ...JSON.parse(JSON.stringify(original)),
            id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title: original.title ? `${original.title} (Copy)` : "",
          };
          sec.items.splice(itemIndex + 1, 0, cloned);
        }
      }
      return draft;
    });
  },

  toggleItemVisibility: (resumeId: string, sectionId: string, itemId: string) => {
    get().updateResume(resumeId, (draft) => {
      const sec = draft.sections.find((s) => s.id === sectionId);
      if (sec) {
        const it = sec.items.find((i) => i.id === itemId);
        if (it) it.visible = !it.visible;
      }
      return draft;
    });
  },

  reorderItems: (resumeId: string, sectionId: string, newItemIds: string[]) => {
    get().updateResume(resumeId, (draft) => {
      const sec = draft.sections.find((s) => s.id === sectionId);
      if (sec) {
        const map = new Map(sec.items.map((it) => [it.id, it]));
        const ordered: SectionItem[] = [];
        for (const id of newItemIds) {
          const it = map.get(id);
          if (it) ordered.push(it);
        }
        sec.items = ordered;
      }
      return draft;
    });
  },

  undo: (resumeId: string) => {
    const hist = get().history[resumeId];
    if (!hist || hist.past.length === 0) return;

    const current = get().resumes.find((r) => r.id === resumeId);
    if (!current) return;

    const previous = hist.past[hist.past.length - 1];
    const newPast = hist.past.slice(0, hist.past.length - 1);
    const newFuture = [JSON.parse(JSON.stringify(current)), ...hist.future];

    set((state) => ({
      resumes: state.resumes.map((r) => (r.id === resumeId ? previous : r)),
      history: {
        ...state.history,
        [resumeId]: { past: newPast, future: newFuture },
      },
    }));
    debouncedSave(get(), resumeId);
  },

  redo: (resumeId: string) => {
    const hist = get().history[resumeId];
    if (!hist || hist.future.length === 0) return;

    const current = get().resumes.find((r) => r.id === resumeId);
    if (!current) return;

    const next = hist.future[0];
    const newFuture = hist.future.slice(1);
    const newPast = [...hist.past, JSON.parse(JSON.stringify(current))];

    set((state) => ({
      resumes: state.resumes.map((r) => (r.id === resumeId ? next : r)),
      history: {
        ...state.history,
        [resumeId]: { past: newPast, future: newFuture },
      },
    }));
    debouncedSave(get(), resumeId);
  },

  canUndo: (resumeId: string) => {
    const hist = get().history[resumeId];
    return !!(hist && hist.past.length > 0);
  },

  canRedo: (resumeId: string) => {
    const hist = get().history[resumeId];
    return !!(hist && hist.future.length > 0);
  },

  // Cover Letter CRUD
  createCoverLetter: (title = "Untitled Cover Letter", linkedResumeId?: string) => {
    const id = newDocId("cl");
    const newLetter: CoverLetter = {
      id,
      title,
      linkedResumeId,
      recipient: {
        name: "Hiring Manager",
        company: "Target Company",
        address: "Company Address",
      },
      date: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      body: `<p>Dear Hiring Manager,</p><p>I am writing to express my eager interest in the open role at your organization...</p><p>Thank you for your consideration.</p><p>Sincerely,<br />Your Name</p>`,
      design: { ...DEFAULT_DESIGN },
    };

    set((state) => ({
      coverLetters: [newLetter, ...state.coverLetters],
      coverLetterVersions: { ...state.coverLetterVersions, [id]: 1 },
    }));

    if (isSupabaseConfigured() && get().userProfile?.status === "approved") {
      getActiveRepository()
        .createCoverLetter(newLetter)
        .then(({ version }) => {
          set((state) => ({
            coverLetterVersions: { ...state.coverLetterVersions, [id]: version },
            saveStatus: "saved",
          }));
        })
        .catch((e) => console.error("Failed to create cover letter:", e));
    } else {
      debouncedSave(get());
    }
    return id;
  },

  updateCoverLetter: (id: string, patch: Partial<CoverLetter>) => {
    set((state) => ({
      coverLetters: state.coverLetters.map((cl) => (cl.id === id ? { ...cl, ...patch } : cl)),
    }));
    if (isSupabaseConfigured() && get().userProfile?.status === "approved") {
      const updated = get().coverLetters.find((cl) => cl.id === id);
      if (updated) {
        const expected = get().coverLetterVersions[id] ?? 1;
        set({ saveStatus: "saving" });
        getActiveRepository()
          .saveCoverLetter(updated, expected)
          .then(({ version }) => {
            set((state) => ({
              coverLetterVersions: { ...state.coverLetterVersions, [id]: version },
              saveStatus: "saved",
            }));
          })
          .catch(() => set({ saveStatus: "error" }));
      }
    } else {
      debouncedSave(get());
    }
  },

  duplicateCoverLetter: (id: string) => {
    const target = get().coverLetters.find((c) => c.id === id);
    if (!target) return "";
    const newId = newDocId("cl");
    const duplicated: CoverLetter = {
      ...JSON.parse(JSON.stringify(target)),
      id: newId,
      title: `${target.title} (Copy)`,
    };
    set((state) => ({
      coverLetters: [duplicated, ...state.coverLetters],
      coverLetterVersions: { ...state.coverLetterVersions, [newId]: 1 },
    }));

    if (isSupabaseConfigured() && get().userProfile?.status === "approved") {
      getActiveRepository()
        .createCoverLetter(duplicated)
        .then(({ version }) => {
          set((state) => ({
            coverLetterVersions: { ...state.coverLetterVersions, [newId]: version },
            saveStatus: "saved",
          }));
        })
        .catch(() => {});
    } else {
      debouncedSave(get());
    }
    return newId;
  },

  deleteCoverLetter: (id: string) => {
    set((state) => ({
      coverLetters: state.coverLetters.filter((cl) => cl.id !== id),
    }));
    if (isSupabaseConfigured() && get().userProfile?.status === "approved") {
      getActiveRepository()
        .deleteCoverLetter(id)
        .catch((e) => console.error("Failed to delete cover letter:", e));
    } else {
      debouncedSave(get());
    }
  },

  // Job Tracker
  addJob: (jobData: Omit<JobApplication, "id">) => {
    const id = newDocId("job");
    const newJob: JobApplication = {
      ...jobData,
      id,
    };
    set((state) => ({
      jobs: [newJob, ...state.jobs],
    }));

    if (isSupabaseConfigured() && get().userProfile?.status === "approved") {
      getActiveRepository()
        .createJob(newJob, 0)
        .catch((e) => console.error("Failed to create job:", e));
    } else {
      debouncedSave(get());
    }
    return id;
  },

  updateJob: (id: string, patch: Partial<JobApplication>) => {
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
    }));
    if (isSupabaseConfigured() && get().userProfile?.status === "approved") {
      const updated = get().jobs.find((j) => j.id === id);
      if (updated) {
        getActiveRepository()
          .saveJob(updated)
          .catch((e) => console.error("Failed to update job:", e));
      }
    } else {
      debouncedSave(get());
    }
  },

  updateJobStage: (id: string, stage: JobStage) => {
    get().updateJob(id, { stage });
  },

  deleteJob: (id: string) => {
    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== id),
    }));
    if (isSupabaseConfigured() && get().userProfile?.status === "approved") {
      getActiveRepository()
        .deleteJob(id)
        .catch((e) => console.error("Failed to delete job:", e));
    } else {
      debouncedSave(get());
    }
  },

  // Settings & Storage
  updateSettings: (patch: Partial<AppSettings>) => {
    set((state) => {
      const next = { ...state.settings, ...patch };
      saveByokSettings(next);
      return { settings: next };
    });
    if (!isSupabaseConfigured()) {
      debouncedSave(get());
    }
  },

  exportBackupJson: () => {
    const { resumes, coverLetters, jobs, settings } = get();
    // Never include personal AI API key in exported JSON backup
    const safeSettings: AppSettings = {
      ...settings,
      aiApiKey: "",
    };
    const backup: PersistedState = {
      schemaVersion: SCHEMA_VERSION,
      resumes,
      coverLetters,
      jobs,
      settings: safeSettings,
    };
    return JSON.stringify(backup, null, 2);
  },

  importBackupJson: (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      const migrated = migrateState(parsed);

      // Remap IDs so importing a backup creates fresh documents without ID collisions
      const idMap = new Map<string, string>();
      const remappedResumes: Resume[] = migrated.resumes.map((r) => {
        const newId = newDocId("res");
        idMap.set(r.id, newId);
        return {
          ...r,
          id: newId,
          updatedAt: new Date().toISOString(),
        };
      });

      const remappedLetters: CoverLetter[] = (migrated.coverLetters || []).map((cl) => ({
        ...cl,
        id: newDocId("cl"),
        linkedResumeId: cl.linkedResumeId ? idMap.get(cl.linkedResumeId) || cl.linkedResumeId : undefined,
      }));

      const remappedJobs: JobApplication[] = (migrated.jobs || []).map((j) => ({
        ...j,
        id: newDocId("job"),
        linkedResumeId: j.linkedResumeId ? idMap.get(j.linkedResumeId) || j.linkedResumeId : undefined,
      }));

      if (isSupabaseConfigured() && get().userProfile?.status === "approved") {
        const repo = getActiveRepository();
        Promise.all([
          ...remappedResumes.map((r) => repo.createResume(r)),
          ...remappedLetters.map((cl) => repo.createCoverLetter(cl)),
          ...remappedJobs.map((j, idx) => repo.createJob(j, idx)),
        ]).catch((e) => console.error("Failed to sync imported backup to Supabase:", e));

        set((state) => ({
          resumes: [...remappedResumes, ...state.resumes],
          coverLetters: [...remappedLetters, ...state.coverLetters],
          jobs: [...remappedJobs, ...state.jobs],
        }));
      } else {
        set({
          resumes: remappedResumes,
          coverLetters: remappedLetters,
          jobs: remappedJobs,
          settings: { ...migrated.settings, ...loadByokSettings() },
        });
        get().saveToStorage();
      }
      return true;
    } catch (e) {
      console.error("Failed to parse or restore backup:", e);
      return false;
    }
  },

  clearAllData: async () => {
    await storageAdapter.clearAll();
    const initial = createInitialState();
    set({
      resumes: initial.resumes,
      coverLetters: initial.coverLetters,
      jobs: initial.jobs,
      settings: initial.settings,
      history: {},
    });
  },
}));

function migratedCoverLettersFallback(migrated: PersistedState): CoverLetter[] {
  if (migrated.coverLetters && migrated.coverLetters.length > 0) {
    return migrated.coverLetters;
  }
  return createInitialState().coverLetters;
}
