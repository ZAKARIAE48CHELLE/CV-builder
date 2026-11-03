import { Resume, CoverLetter, JobApplication } from "../schema";
import { StylePreset } from "../design/presets";

export interface ResumeSummary {
  id: string;
  title: string;
  updatedAt: string;
  version: number;
}

export interface CoverLetterSummary {
  id: string;
  title: string;
  resumeId?: string | null;
  updatedAt: string;
  version: number;
}

export class VersionConflictError extends Error {
  public readonly latestResume?: Resume;
  public readonly latestVersion: number;

  constructor(message: string, latestVersion: number, latestResume?: Resume) {
    super(message);
    this.name = "VersionConflictError";
    this.latestVersion = latestVersion;
    this.latestResume = latestResume;
  }
}

export interface Repository {
  readonly mode: "local" | "supabase";

  // Resumes
  listResumes(): Promise<ResumeSummary[]>;
  listFullResumes(): Promise<{ resume: Resume; version: number }[]>;
  getResume(id: string): Promise<{ resume: Resume; version: number } | null>;
  createResume(r: Resume): Promise<{ resume: Resume; version: number }>;
  saveResume(r: Resume, expectedVersion: number, forceOverwrite?: boolean): Promise<{ version: number }>;
  deleteResume(id: string): Promise<void>;

  // Cover Letters
  listCoverLetters(): Promise<{ letter: CoverLetter; version: number }[]>;
  getCoverLetter(id: string): Promise<{ letter: CoverLetter; version: number } | null>;
  createCoverLetter(cl: CoverLetter): Promise<{ letter: CoverLetter; version: number }>;
  saveCoverLetter(cl: CoverLetter, expectedVersion?: number): Promise<{ version: number }>;
  deleteCoverLetter(id: string): Promise<void>;

  // Jobs
  listJobs(): Promise<JobApplication[]>;
  createJob(job: JobApplication, position?: number): Promise<JobApplication>;
  saveJob(job: JobApplication, position?: number): Promise<void>;
  deleteJob(id: string): Promise<void>;

  // Style Presets
  listPresets(): Promise<StylePreset[]>;
  savePreset(preset: StylePreset): Promise<StylePreset>;
  deletePreset(id: string): Promise<void>;
}

