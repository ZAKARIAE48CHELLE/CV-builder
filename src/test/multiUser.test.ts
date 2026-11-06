import { describe, it, expect, beforeEach } from "vitest";
import { sanitizeRichHtml } from "@/lib/security/sanitize";
import { ensureUuid } from "@/lib/data/supabaseRepository";
import { VersionConflictError } from "@/lib/data/repository";
import { LocalRepository } from "@/lib/data/localRepository";
import {
  checkAiPayloadSize,
  checkPerUserRateLimit,
  checkDailySharedQuota,
  resetRateLimitForTest,
} from "@/lib/ai/quota";
import { isStoragePath, extractStorageObjectPath, STORAGE_PATH_PREFIX } from "@/lib/storage/userFiles";
import { createInitialState } from "@/lib/migrations";
import { ResumeSchema } from "@/lib/schema";
import { useFolioStore } from "@/lib/store";
import fs from "node:fs";

describe("Multi-User Security & Data Layer", () => {
  describe("HTML Sanitizer (sanitizeRichHtml)", () => {
    it("strips script, style, iframe, and event handlers", () => {
      const dirty = `<p onclick="alert(1)">Hello</p><script>evil()</script><img src=x onerror="alert(2)" /><style>body{display:none}</style>`;
      const clean = sanitizeRichHtml(dirty);
      expect(clean).not.toContain("<script");
      expect(clean).not.toContain("evil()");
      expect(clean).not.toContain("onclick");
      expect(clean).not.toContain("onerror");
      expect(clean).not.toContain("<style");
      expect(clean).toContain("<p>Hello</p>");
    });

    it("blocks javascript: and data: href attributes on links", () => {
      const dirty = `<p><a href="javascript:alert(1)">Click</a> and <a href="data:text/html,<script>alert(1)</script>">Data</a></p>`;
      const clean = sanitizeRichHtml(dirty);
      expect(clean).not.toContain("javascript:");
      expect(clean).not.toContain("data:text/html");
      expect(clean).toContain("<a>Click</a>");
    });

    it("preserves safe formatting tags and adds rel=noopener noreferrer to valid links", () => {
      const valid = `<p><strong>Bold</strong> and <em>italic</em></p><ul><li><a href="https://github.com/example">Repo</a></li></ul>`;
      const clean = sanitizeRichHtml(valid);
      expect(clean).toContain("<strong>Bold</strong>");
      expect(clean).toContain("<em>italic</em>");
      expect(clean).toContain('href="https://github.com/example"');
      expect(clean).toContain('rel="noopener noreferrer"');
    });
  });

  describe("UUID & Version Conflict Handling", () => {
    it("generates a valid v4 UUID when non-UUID id is passed", () => {
      const converted = ensureUuid("res-12345");
      expect(converted).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );

      const alreadyValid = "550e8400-e29b-41d4-a716-446655440000";
      expect(ensureUuid(alreadyValid)).toBe(alreadyValid);
    });

    it("preserves latestVersion and latestResume on VersionConflictError", () => {
      const sampleResume = createInitialState().resumes[0];
      const err = new VersionConflictError("Conflict!", 5, sampleResume);
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe("VersionConflictError");
      expect(err.latestVersion).toBe(5);
      expect(err.latestResume?.id).toBe(sampleResume.id);
    });
  });

  describe("LocalRepository", () => {
    it("lists, saves, and increments resume versions cleanly", async () => {
      const repo = new LocalRepository();
      const initial = createInitialState().resumes[0];
      const created = await repo.createResume({
        ...initial,
        id: "test-local-res-1",
        title: "First Version",
      });
      expect(created.version).toBe(1);

      const saved = await repo.saveResume(
        { ...created.resume, title: "Second Version" },
        1
      );
      expect(saved.version).toBe(2);

      const fetched = await repo.getResume("test-local-res-1");
      expect(fetched?.resume.title).toBe("Second Version");
    });
  });

  describe("Storage Path Helpers", () => {
    it("detects and extracts storage://user-files/ object paths", () => {
      const ref = `${STORAGE_PATH_PREFIX}user-123/photos/avatar.png`;
      expect(isStoragePath(ref)).toBe(true);
      expect(extractStorageObjectPath(ref)).toBe("user-123/photos/avatar.png");
      expect(isStoragePath("data:image/png;base64,abc")).toBe(false);
    });
  });

  describe("AI Quota, Payload Cap & Per-User Rate Limiting", () => {
    beforeEach(() => {
      resetRateLimitForTest();
    });

    it("rejects AI payloads larger than 30 KB", () => {
      const small = checkAiPayloadSize("Short resume", "Short JD");
      expect(small.allowed).toBe(true);

      const huge = "x".repeat(35 * 1024);
      const result = checkAiPayloadSize(huge, "");
      expect(result.allowed).toBe(false);
      expect(result.error).toContain("exceeds the 30 KB limit");
    });

    it("enforces per-user rate limit of 10 calls per minute", () => {
      const now = 1_700_000_000_000;
      for (let i = 0; i < 10; i++) {
        const res = checkPerUserRateLimit("user-abc", now + i * 100);
        expect(res.allowed).toBe(true);
      }

      // 11th call within the same minute window must be blocked
      const eleventh = checkPerUserRateLimit("user-abc", now + 2000);
      expect(eleventh.allowed).toBe(false);
      expect(eleventh.error).toContain("Rate limit exceeded");

      // Another user is unaffected
      const otherUser = checkPerUserRateLimit("user-xyz", now + 2000);
      expect(otherUser.allowed).toBe(true);

      // After 61 seconds, window slides and user-abc is allowed again
      const afterWindow = checkPerUserRateLimit("user-abc", now + 61_000);
      expect(afterWindow.allowed).toBe(true);
    });

    it("enforces daily shared AI key quota", () => {
      expect(checkDailySharedQuota(1, 30).allowed).toBe(true);
      expect(checkDailySharedQuota(30, 30).allowed).toBe(true);
      const exceeded = checkDailySharedQuota(31, 30);
      expect(exceeded.allowed).toBe(false);
      expect(exceeded.error).toContain("Daily shared AI limit");
    });

    it("parses CHELLE ZAKARIAE Resume from local db.json", () => {
      if (fs.existsSync("data/db.json")) {
        const raw = JSON.parse(fs.readFileSync("data/db.json", "utf8")).folio_user_data_v1;
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        const state = parsed.state || parsed;
        const res = ResumeSchema.safeParse(state.resumes[0]);
        if (!res.success) {
          console.error("ZOD ERROR:", res.error.issues);
        }
        expect(res.success).toBe(true);
      }
    });
  });

  describe("JSON Import (Same format as Export)", () => {
    it("imports account export JSON payload successfully", async () => {
      const store = useFolioStore.getState();
      const exportPayload = {
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        account: {
          email: "user@example.com",
          displayName: "Alex Test",
        },
        resumes: [
          {
            id: "old-res-1",
            title: "Frontend Engineer Resume",
            personal: { fullName: "Alex Test", email: "alex@example.com" },
            sections: [
              {
                id: "sec-1",
                type: "experience",
                heading: "Experience",
                items: [
                  {
                    id: "it-1",
                    title: "Lead Engineer",
                    subtitle: "Acme Corp",
                    description: "<p>Built scalable web apps</p>",
                  },
                ],
              },
            ],
          },
        ],
        coverLetters: [
          {
            id: "old-cl-1",
            title: "Acme Cover Letter",
            linkedResumeId: "old-res-1",
            recipient: { name: "Hiring Manager" },
            body: "<p>Dear Team...</p>",
          },
        ],
        jobs: [
          {
            id: "old-job-1",
            company: "Acme Corp",
            role: "Lead Engineer",
            stage: "applied",
            linkedResumeId: "old-res-1",
          },
        ],
        stylePresets: [
          {
            id: "preset-1",
            name: "Modern Minimalist",
            applicableTypes: ["experience"],
            overrides: {},
          },
        ],
      };

      const result = await store.importBackupJson(JSON.stringify(exportPayload));
      expect(result.success).toBe(true);
      expect(result.resumesCount).toBe(1);
      expect(result.coverLettersCount).toBe(1);
      expect(result.jobsCount).toBe(1);
      expect(result.presetsCount).toBe(1);

      // Verify state was populated
      const state = useFolioStore.getState();
      const importedResume = state.resumes.find((r) => r.title === "Frontend Engineer Resume");
      expect(importedResume).toBeDefined();
      expect(importedResume?.id).not.toBe("old-res-1"); // ID was remapped

      const importedLetter = state.coverLetters.find((c) => c.title === "Acme Cover Letter");
      expect(importedLetter).toBeDefined();
      expect(importedLetter?.linkedResumeId).toBe(importedResume?.id); // Link preserved!

      const importedJob = state.jobs.find((j) => j.company === "Acme Corp");
      expect(importedJob).toBeDefined();
      expect(importedJob?.linkedResumeId).toBe(importedResume?.id); // Link preserved!
    });

    it("imports single resume JSON directly", async () => {
      const store = useFolioStore.getState();
      const singleResume = {
        id: "single-1",
        title: "Single Resume Import",
        personal: { fullName: "Sarah Connor" },
        sections: [],
      };

      const result = await store.importBackupJson(JSON.stringify(singleResume));
      expect(result.success).toBe(true);
      expect(result.resumesCount).toBe(1);
      expect(result.firstResumeId).toBeDefined();

      const state = useFolioStore.getState();
      const found = state.resumes.find((r) => r.title === "Single Resume Import");
      expect(found).toBeDefined();
    });

    it("returns error for invalid JSON or empty structure", async () => {
      const store = useFolioStore.getState();
      const resBad = await store.importBackupJson("not valid json");
      expect(resBad.success).toBe(false);
      expect(resBad.error).toContain("Invalid JSON format");

      const resEmpty = await store.importBackupJson(JSON.stringify({ someKey: 123 }));
      expect(resEmpty.success).toBe(false);
      expect(resEmpty.error).toContain("No valid resumes");
    });
  });
});

