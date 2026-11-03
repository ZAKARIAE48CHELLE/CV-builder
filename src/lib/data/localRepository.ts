import { Repository, ResumeSummary } from "./repository";
import { storageAdapter } from "../storage";
import { migrateState, createInitialState, PersistedState } from "../migrations";
import { Resume, CoverLetter, JobApplication, ResumeSchema, CoverLetterSchema, JobApplicationSchema } from "../schema";
import { StylePreset, getCustomPresets, saveCustomPreset, deleteCustomPreset } from "../design/presets";
import { SCHEMA_VERSION } from "@/config";
import { sanitizeRichHtml } from "../security/sanitize";

const STORAGE_KEY = "folio_user_data_v1";

function sanitizeResumeHtml(resume: Resume): Resume {
  const cloned: Resume = JSON.parse(JSON.stringify(resume));
  cloned.sections = (cloned.sections || []).map((sec) => ({
    ...sec,
    items: (sec.items || []).map((it) => ({
      ...it,
      description: it.description ? sanitizeRichHtml(it.description) : it.description,
    })),
  }));
  return cloned;
}

function sanitizeLetterHtml(letter: CoverLetter): CoverLetter {
  return {
    ...letter,
    body: letter.body ? sanitizeRichHtml(letter.body) : letter.body,
  };
}

export class LocalRepository implements Repository {
  public readonly mode = "local" as const;

  private async loadState(): Promise<PersistedState> {
    const raw = await storageAdapter.getItem<PersistedState>(STORAGE_KEY);
    if (!raw) {
      return createInitialState();
    }
    return migrateState(raw);
  }

  private async saveState(state: PersistedState): Promise<void> {
    await storageAdapter.setItem(STORAGE_KEY, {
      ...state,
      schemaVersion: SCHEMA_VERSION,
    });
  }

  async getRawLocalData(): Promise<PersistedState | null> {
    const raw = await storageAdapter.getItem<PersistedState>(STORAGE_KEY);
    if (!raw) return null;
    return migrateState(raw);
  }

  async listResumes(): Promise<ResumeSummary[]> {
    const state = await this.loadState();
    return state.resumes.map((r) => ({
      id: r.id,
      title: r.title,
      updatedAt: r.updatedAt,
      version: 1,
    }));
  }

  async listFullResumes(): Promise<{ resume: Resume; version: number }[]> {
    const state = await this.loadState();
    return state.resumes.map((r) => ({
      resume: sanitizeResumeHtml(r),
      version: 1,
    }));
  }

  async getResume(id: string): Promise<{ resume: Resume; version: number } | null> {
    const state = await this.loadState();
    const found = state.resumes.find((r) => r.id === id);
    if (!found) return null;
    return { resume: sanitizeResumeHtml(found), version: 1 };
  }

  async createResume(r: Resume): Promise<{ resume: Resume; version: number }> {
    const parsed = ResumeSchema.parse(sanitizeResumeHtml(r));
    const state = await this.loadState();
    state.resumes = [parsed, ...state.resumes.filter((x) => x.id !== parsed.id)];
    await this.saveState(state);
    return { resume: parsed, version: 1 };
  }

  async saveResume(r: Resume, expectedVersion: number): Promise<{ version: number }> {
    const parsed = ResumeSchema.parse(sanitizeResumeHtml(r));
    const state = await this.loadState();
    const exists = state.resumes.some((x) => x.id === parsed.id);
    if (exists) {
      state.resumes = state.resumes.map((x) => (x.id === parsed.id ? parsed : x));
    } else {
      state.resumes = [parsed, ...state.resumes];
    }
    await this.saveState(state);
    return { version: (expectedVersion || 1) + 1 };
  }

  async deleteResume(id: string): Promise<void> {
    const state = await this.loadState();
    state.resumes = state.resumes.filter((r) => r.id !== id);
    await this.saveState(state);
  }

  async listCoverLetters(): Promise<{ letter: CoverLetter; version: number }[]> {
    const state = await this.loadState();
    return state.coverLetters.map((cl) => ({
      letter: sanitizeLetterHtml(cl),
      version: 1,
    }));
  }

  async getCoverLetter(id: string): Promise<{ letter: CoverLetter; version: number } | null> {
    const state = await this.loadState();
    const found = state.coverLetters.find((cl) => cl.id === id);
    if (!found) return null;
    return { letter: sanitizeLetterHtml(found), version: 1 };
  }

  async createCoverLetter(cl: CoverLetter): Promise<{ letter: CoverLetter; version: number }> {
    const parsed = CoverLetterSchema.parse(sanitizeLetterHtml(cl));
    const state = await this.loadState();
    state.coverLetters = [parsed, ...state.coverLetters.filter((x) => x.id !== parsed.id)];
    await this.saveState(state);
    return { letter: parsed, version: 1 };
  }

  async saveCoverLetter(cl: CoverLetter, expectedVersion = 1): Promise<{ version: number }> {
    const parsed = CoverLetterSchema.parse(sanitizeLetterHtml(cl));
    const state = await this.loadState();
    const exists = state.coverLetters.some((x) => x.id === parsed.id);
    if (exists) {
      state.coverLetters = state.coverLetters.map((x) => (x.id === parsed.id ? parsed : x));
    } else {
      state.coverLetters = [parsed, ...state.coverLetters];
    }
    await this.saveState(state);
    return { version: expectedVersion + 1 };
  }

  async deleteCoverLetter(id: string): Promise<void> {
    const state = await this.loadState();
    state.coverLetters = state.coverLetters.filter((cl) => cl.id !== id);
    await this.saveState(state);
  }

  async listJobs(): Promise<JobApplication[]> {
    const state = await this.loadState();
    return state.jobs;
  }

  async createJob(job: JobApplication): Promise<JobApplication> {
    const parsed = JobApplicationSchema.parse(job);
    const state = await this.loadState();
    state.jobs = [parsed, ...state.jobs.filter((x) => x.id !== parsed.id)];
    await this.saveState(state);
    return parsed;
  }

  async saveJob(job: JobApplication): Promise<void> {
    const parsed = JobApplicationSchema.parse(job);
    const state = await this.loadState();
    const exists = state.jobs.some((x) => x.id === parsed.id);
    if (exists) {
      state.jobs = state.jobs.map((x) => (x.id === parsed.id ? parsed : x));
    } else {
      state.jobs = [parsed, ...state.jobs];
    }
    await this.saveState(state);
  }

  async deleteJob(id: string): Promise<void> {
    const state = await this.loadState();
    state.jobs = state.jobs.filter((j) => j.id !== id);
    await this.saveState(state);
  }

  async listPresets(): Promise<StylePreset[]> {
    return getCustomPresets();
  }

  async savePreset(preset: StylePreset): Promise<StylePreset> {
    saveCustomPreset(preset);
    return preset;
  }

  async deletePreset(id: string): Promise<void> {
    deleteCustomPreset(id);
  }
}

