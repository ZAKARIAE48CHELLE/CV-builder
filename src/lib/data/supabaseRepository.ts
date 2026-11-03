import { Repository, ResumeSummary, VersionConflictError } from "./repository";
import { getSupabaseBrowserClient } from "../supabase/client";
import { migrateState } from "../migrations";
import {
  Resume,
  CoverLetter,
  JobApplication,
  ResumeSchema,
  CoverLetterSchema,
  JobApplicationSchema,
} from "../schema";
import { StylePreset } from "../design/presets";
import { SCHEMA_VERSION } from "@/config";
import { sanitizeRichHtml } from "../security/sanitize";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ensureUuid(id?: string): string {
  if (id && UUID_REGEX.test(id)) return id;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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

function migrateSingleResume(rawResume: unknown, rowSchemaVersion: number): Resume {
  const migrated = migrateState({
    schemaVersion: rowSchemaVersion,
    resumes: [rawResume as Resume],
    coverLetters: [],
    jobs: [],
  });
  const res = migrated.resumes[0];
  return ResumeSchema.parse(sanitizeResumeHtml(res));
}

export class SupabaseRepository implements Repository {
  public readonly mode = "supabase" as const;

  private getClient() {
    const client = getSupabaseBrowserClient();
    if (!client) {
      throw new Error("Supabase client is not configured.");
    }
    return client;
  }

  private async getUserId(): Promise<string> {
    const supabase = this.getClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw new Error("Not authenticated");
    }
    return data.user.id;
  }

  async listResumes(): Promise<ResumeSummary[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("resumes")
      .select("id, title, updated_at, version")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      updatedAt: row.updated_at,
      version: row.version ?? 1,
    }));
  }

  async listFullResumes(): Promise<{ resume: Resume; version: number }[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("resumes")
      .select("id, title, data, schema_version, version, updated_at")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const results: { resume: Resume; version: number }[] = [];
    for (const row of data || []) {
      try {
        const migrated = migrateSingleResume(
          { ...(row.data || {}), id: row.id, title: row.title, updatedAt: row.updated_at },
          row.schema_version ?? 1
        );
        results.push({ resume: migrated, version: row.version ?? 1 });

        // Auto-save upgraded schemaVersion in background if needed
        if ((row.schema_version ?? 1) < SCHEMA_VERSION) {
          this.saveResume(migrated, row.version ?? 1).catch(() => {});
        }
      } catch (e) {
        console.warn("Skipping invalid resume row:", row.id, e);
      }
    }
    return results;
  }

  async getResume(id: string): Promise<{ resume: Resume; version: number } | null> {
    if (!UUID_REGEX.test(id)) return null;
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("resumes")
      .select("id, title, data, schema_version, version, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const migrated = migrateSingleResume(
      { ...(data.data || {}), id: data.id, title: data.title, updatedAt: data.updated_at },
      data.schema_version ?? 1
    );

    if ((data.schema_version ?? 1) < SCHEMA_VERSION) {
      this.saveResume(migrated, data.version ?? 1).catch(() => {});
    }

    return {
      resume: migrated,
      version: data.version ?? 1,
    };
  }

  async createResume(r: Resume): Promise<{ resume: Resume; version: number }> {
    const supabase = this.getClient();
    const ownerId = await this.getUserId();
    const validId = ensureUuid(r.id);
    const cleaned = ResumeSchema.parse(
      sanitizeResumeHtml({
        ...r,
        id: validId,
        updatedAt: new Date().toISOString(),
      })
    );

    const { data, error } = await supabase
      .from("resumes")
      .insert({
        id: validId,
        owner_id: ownerId,
        title: cleaned.title,
        data: cleaned,
        schema_version: SCHEMA_VERSION,
        version: 1,
      })
      .select("version")
      .single();

    if (error) throw error;
    return { resume: cleaned, version: data?.version ?? 1 };
  }

  async saveResume(
    r: Resume,
    expectedVersion: number,
    forceOverwrite = false
  ): Promise<{ version: number }> {
    const supabase = this.getClient();
    const ownerId = await this.getUserId();
    const validId = ensureUuid(r.id);
    const cleaned = ResumeSchema.parse(
      sanitizeResumeHtml({
        ...r,
        id: validId,
        updatedAt: new Date().toISOString(),
      })
    );

    if (forceOverwrite) {
      // Fetch current version and overwrite
      const current = await this.getResume(validId);
      const nextVersion = (current?.version ?? expectedVersion) + 1;
      const { error } = await supabase
        .from("resumes")
        .upsert({
          id: validId,
          owner_id: ownerId,
          title: cleaned.title,
          data: cleaned,
          schema_version: SCHEMA_VERSION,
          version: nextVersion,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      return { version: nextVersion };
    }

    const nextVersion = (expectedVersion || 1) + 1;
    const { data, error } = await supabase
      .from("resumes")
      .update({
        title: cleaned.title,
        data: cleaned,
        schema_version: SCHEMA_VERSION,
        version: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", validId)
      .eq("version", expectedVersion)
      .select("version");

    if (error) throw error;

    if (!data || data.length === 0) {
      // Check if row doesn't exist yet or if version mismatched
      const latest = await this.getResume(validId);
      if (!latest) {
        // Row was not yet inserted; insert it now
        const created = await this.createResume(cleaned);
        return { version: created.version };
      }
      throw new VersionConflictError(
        "This resume was modified in another tab or device.",
        latest.version,
        latest.resume
      );
    }

    return { version: nextVersion };
  }

  async deleteResume(id: string): Promise<void> {
    if (!UUID_REGEX.test(id)) return;
    const supabase = this.getClient();
    const { error } = await supabase.from("resumes").delete().eq("id", id);
    if (error) throw error;
  }

  async listCoverLetters(): Promise<{ letter: CoverLetter; version: number }[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("cover_letters")
      .select("id, resume_id, title, data, schema_version, version, updated_at")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    const results: { letter: CoverLetter; version: number }[] = [];
    for (const row of data || []) {
      try {
        const parsed = CoverLetterSchema.parse(
          sanitizeLetterHtml({
            ...(row.data || {}),
            id: row.id,
            title: row.title,
            linkedResumeId: row.resume_id || row.data?.linkedResumeId,
          })
        );
        results.push({ letter: parsed, version: row.version ?? 1 });
      } catch (e) {
        console.warn("Skipping invalid cover letter row:", row.id, e);
      }
    }
    return results;
  }

  async getCoverLetter(id: string): Promise<{ letter: CoverLetter; version: number } | null> {
    if (!UUID_REGEX.test(id)) return null;
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("cover_letters")
      .select("id, resume_id, title, data, schema_version, version")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const parsed = CoverLetterSchema.parse(
      sanitizeLetterHtml({
        ...(data.data || {}),
        id: data.id,
        title: data.title,
        linkedResumeId: data.resume_id || data.data?.linkedResumeId,
      })
    );
    return { letter: parsed, version: data.version ?? 1 };
  }

  async createCoverLetter(cl: CoverLetter): Promise<{ letter: CoverLetter; version: number }> {
    const supabase = this.getClient();
    const ownerId = await this.getUserId();
    const validId = ensureUuid(cl.id);
    const validResumeId =
      cl.linkedResumeId && UUID_REGEX.test(cl.linkedResumeId) ? cl.linkedResumeId : null;

    const cleaned = CoverLetterSchema.parse(
      sanitizeLetterHtml({
        ...cl,
        id: validId,
        linkedResumeId: validResumeId || undefined,
      })
    );

    const { data, error } = await supabase
      .from("cover_letters")
      .insert({
        id: validId,
        owner_id: ownerId,
        resume_id: validResumeId,
        title: cleaned.title,
        data: cleaned,
        schema_version: SCHEMA_VERSION,
        version: 1,
      })
      .select("version")
      .single();

    if (error) throw error;
    return { letter: cleaned, version: data?.version ?? 1 };
  }

  async saveCoverLetter(cl: CoverLetter, expectedVersion = 1): Promise<{ version: number }> {
    const supabase = this.getClient();
    const ownerId = await this.getUserId();
    const validId = ensureUuid(cl.id);
    const validResumeId =
      cl.linkedResumeId && UUID_REGEX.test(cl.linkedResumeId) ? cl.linkedResumeId : null;

    const cleaned = CoverLetterSchema.parse(
      sanitizeLetterHtml({
        ...cl,
        id: validId,
        linkedResumeId: validResumeId || undefined,
      })
    );

    const nextVersion = expectedVersion + 1;
    const { error } = await supabase.from("cover_letters").upsert({
      id: validId,
      owner_id: ownerId,
      resume_id: validResumeId,
      title: cleaned.title,
      data: cleaned,
      schema_version: SCHEMA_VERSION,
      version: nextVersion,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return { version: nextVersion };
  }

  async deleteCoverLetter(id: string): Promise<void> {
    if (!UUID_REGEX.test(id)) return;
    const supabase = this.getClient();
    const { error } = await supabase.from("cover_letters").delete().eq("id", id);
    if (error) throw error;
  }

  async listJobs(): Promise<JobApplication[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("jobs")
      .select("id, data, status, position, updated_at")
      .order("position", { ascending: true })
      .order("updated_at", { ascending: false });

    if (error) throw error;
    const jobs: JobApplication[] = [];
    for (const row of data || []) {
      try {
        const parsed = JobApplicationSchema.parse({
          ...(row.data || {}),
          id: row.id,
          stage: row.status || row.data?.stage || "wishlist",
        });
        jobs.push(parsed);
      } catch (e) {
        console.warn("Skipping invalid job row:", row.id, e);
      }
    }
    return jobs;
  }

  async createJob(job: JobApplication, position = 0): Promise<JobApplication> {
    const supabase = this.getClient();
    const ownerId = await this.getUserId();
    const validId = ensureUuid(job.id);
    const cleaned = JobApplicationSchema.parse({
      ...job,
      id: validId,
    });

    const { error } = await supabase.from("jobs").insert({
      id: validId,
      owner_id: ownerId,
      data: cleaned,
      status: cleaned.stage,
      position,
    });

    if (error) throw error;
    return cleaned;
  }

  async saveJob(job: JobApplication, position = 0): Promise<void> {
    const supabase = this.getClient();
    const ownerId = await this.getUserId();
    const validId = ensureUuid(job.id);
    const cleaned = JobApplicationSchema.parse({
      ...job,
      id: validId,
    });

    const { error } = await supabase.from("jobs").upsert({
      id: validId,
      owner_id: ownerId,
      data: cleaned,
      status: cleaned.stage,
      position,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  }

  async deleteJob(id: string): Promise<void> {
    if (!UUID_REGEX.test(id)) return;
    const supabase = this.getClient();
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) throw error;
  }

  async listPresets(): Promise<StylePreset[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("style_presets")
      .select("id, name, section_type, data")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      applicableTypes: row.section_type ? [row.section_type] : row.data?.applicableTypes || [],
      overrides: row.data?.overrides || row.data || {},
    }));
  }

  async savePreset(preset: StylePreset): Promise<StylePreset> {
    const supabase = this.getClient();
    const ownerId = await this.getUserId();
    const validId = ensureUuid(preset.id);
    const saved: StylePreset = {
      ...preset,
      id: validId,
    };

    const { error } = await supabase.from("style_presets").upsert({
      id: validId,
      owner_id: ownerId,
      name: saved.name,
      section_type: saved.applicableTypes?.[0] || null,
      data: {
        applicableTypes: saved.applicableTypes,
        overrides: saved.overrides,
      },
    });

    if (error) throw error;
    return saved;
  }

  async deletePreset(id: string): Promise<void> {
    if (!UUID_REGEX.test(id)) return;
    const supabase = this.getClient();
    const { error } = await supabase.from("style_presets").delete().eq("id", id);
    if (error) throw error;
  }
}

