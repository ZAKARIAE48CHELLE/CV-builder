import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  parseTextHeuristically,
  parseJsonResume,
  buildResumeFromSingleJson,
  MOCK_RESUME_JSON_TEMPLATE,
} from "../lib/import/parser";
import { ResumeSchema } from "../lib/schema";
import { createInitialState } from "../lib/migrations";

describe("Heuristic Resume Parser", () => {
  it("extracts candidate contact info and sections from raw text", () => {
    const rawResumeText = `
Jordan Belfort
Senior Sales Director
jordan@stratton.com
+1 (555) 987-6543
https://linkedin.com/in/jbelfort

Professional Summary
Dynamic, high-energy sales leader with proven history of scaling multi-million revenue operations.

Experience
Vice President of Global Sales
Stratton Oakmont, Inc.
Jan 2018 - Present
• Closed $45M in new enterprise accounts within 18 months.
• Managed a team of 45 account executives and SDRs.

Education
B.S. in Finance and Business
New York University
2012 - 2016

Skills
Enterprise Sales, Negotiation, CRM, Strategic Partnerships
    `;

    const parsed = parseTextHeuristically(rawResumeText);

    expect(parsed.personal.fullName).toBe("Jordan Belfort");
    expect(parsed.personal.email).toBe("jordan@stratton.com");
    expect(parsed.personal.phone).toContain("555");
    expect(parsed.personal.linkedin).toBe("https://linkedin.com/in/jbelfort");

    const sectionTypes = parsed.sections.map((s) => s.type);
    expect(sectionTypes).toContain("summary");
    expect(sectionTypes).toContain("experience");
    expect(sectionTypes).toContain("education");
    expect(sectionTypes).toContain("skills");
  });

  it("extracts multiple distinct projects and categorizes skills cleanly", () => {
    const resumeText = `
CHELLE ZAKARIAE
Élève Ingénieur en IA & Data Science
zakariaechelle2001@gmail.com
+212 700 271 534

PROJETS
Plateforme E-Commerce RAG & IA
Projet Académique
2024 - 2025
• Développé un système de recommandation multimodal.
• Intégration de LLMs avec LangChain et Pinecone.

Système Multi-Agents pour la Finance
Projet Personnel
2023 - 2024
• Implémentation d'agents autonomes avec CrewAI.
• Backtesting de stratégies de trading algorithmique.

COMPÉTENCES
Langages: Python, TypeScript, SQL, C++
Frameworks: React, Next.js, FastAPI, PyTorch
Bases de données: PostgreSQL, MongoDB, Pinecone
    `;

    const parsed = parseTextHeuristically(resumeText);
    expect(parsed.personal.fullName).toBe("CHELLE ZAKARIAE");
    expect(parsed.personal.jobTitle).toContain("IA & Data Science");

    const projectSec = parsed.sections.find((s) => s.type === "projects");
    expect(projectSec).toBeDefined();
    expect(projectSec?.items.length).toBe(2);
    expect(projectSec?.items[0].title).toContain("Plateforme E-Commerce");
    expect(projectSec?.items[1].title).toContain("Système Multi-Agents");

    const skillsSec = parsed.sections.find((s) => s.type === "skills");
    expect(skillsSec).toBeDefined();
    expect(skillsSec?.items.length).toBe(3);
    expect(skillsSec?.items[0].title).toBe("Langages");
    expect(skillsSec?.items[0].tags).toContain("Python");
    expect(skillsSec?.items[1].title).toBe("Frameworks");
    expect(skillsSec?.items[1].tags).toContain("React");
  });

  describe("parseJsonResume", () => {
    it("parses the mock JSON template accurately into a ParsedResumeDraft", () => {
      const { draft, title } = parseJsonResume(MOCK_RESUME_JSON_TEMPLATE);

      expect(title).toBe("Alex Rivera - Full-Stack Engineer Resume");
      expect(draft.personal.fullName).toBe("Alex Rivera");
      expect(draft.personal.jobTitle).toBe("Senior Full-Stack Engineer");
      expect(draft.personal.email).toBe("alex.rivera@example.com");
      expect(draft.personal.github).toBe("https://github.com/alexrivera");

      expect(draft.sections.length).toBe(6);
      const types = draft.sections.map((s) => s.type);
      expect(types).toContain("summary");
      expect(types).toContain("experience");
      expect(types).toContain("education");
      expect(types).toContain("skills");
      expect(types).toContain("projects");
      expect(types).toContain("languages");

      const exp = draft.sections.find((s) => s.type === "experience");
      expect(exp?.items.length).toBe(2);
      expect(exp?.items[0].title).toBe("Senior Full-Stack Engineer");
      expect(exp?.items[0].subtitle).toBe("Acme Cloud Technologies");

      const skills = draft.sections.find((s) => s.type === "skills");
      expect(skills?.items[0].tags).toContain("TypeScript");
    });

    it("parses standard JSON Resume format (with basics, work, education)", () => {
      const standardJsonResume = {
        basics: {
          name: "Sarah Connor",
          label: "DevOps Engineer",
          email: "sarah@cyberdyne.org",
          phone: "+1 555 123 4567",
          url: "https://sarahconnor.tech",
          summary: "Resilient systems architect and automation engineer.",
          location: {
            city: "Los Angeles",
            region: "CA",
          },
          profiles: [
            {
              network: "LinkedIn",
              url: "https://linkedin.com/in/sarah-connor",
            },
            {
              network: "GitHub",
              url: "https://github.com/sarahconnor",
            },
          ],
        },
        work: [
          {
            name: "Resistance Systems",
            position: "Lead Cloud Architect",
            startDate: "2021-01",
            endDate: "Present",
            summary: "Securing defense infrastructure against hostile networks.",
            highlights: ["Engineered air-gapped Kubernetes clusters.", "Cut incident time to zero."],
          },
        ],
        education: [
          {
            institution: "MIT",
            area: "Computer Systems",
            studyType: "B.S.",
            startDate: "2015",
            endDate: "2019",
          },
        ],
        skills: [
          {
            name: "Infrastructure",
            keywords: ["Kubernetes", "Terraform", "Rust", "Go"],
          },
        ],
      };

      const { draft, title } = parseJsonResume(standardJsonResume);
      expect(title).toContain("Sarah Connor");
      expect(draft.personal.fullName).toBe("Sarah Connor");
      expect(draft.personal.jobTitle).toBe("DevOps Engineer");
      expect(draft.personal.location).toContain("Los Angeles");
      expect(draft.personal.linkedin).toBe("https://linkedin.com/in/sarah-connor");
      expect(draft.personal.github).toBe("https://github.com/sarahconnor");

      const exp = draft.sections.find((s) => s.type === "experience");
      expect(exp).toBeDefined();
      expect(exp?.items[0].subtitle).toBe("Resistance Systems");
      expect(exp?.items[0].title).toBe("Lead Cloud Architect");
      expect(exp?.items[0].description).toContain("Kubernetes clusters");

      const skills = draft.sections.find((s) => s.type === "skills");
      expect(skills?.items[0].tags).toContain("Kubernetes");
    });

    it("parses JSON strings and nested backup wraps", () => {
      const wrapped = JSON.stringify({
        resumes: [
          {
            title: "Backup CV",
            personal: { fullName: "John Doe", email: "john@example.com" },
            sections: [],
          },
        ],
      });

      const { draft, title } = parseJsonResume(wrapped);
      expect(title).toBe("Backup CV");
      expect(draft.personal.fullName).toBe("John Doe");
      expect(draft.personal.email).toBe("john@example.com");
    });
  });

  describe("buildResumeFromSingleJson", () => {
    it("preserves full styling & extended fields on an exported Folio single CV JSON", () => {
      const base = createInitialState().resumes[0];
      const exportedSingle = {
        ...base,
        id: "old-export-id",
        templateId: "modern",
        personal: {
          ...base.personal,
          photo: "data:image/png;base64,AAA",
          extraLinks: [{ label: "Portfolio", url: "https://portfolio.dev" }],
        },
        headerDesign: { align: "center" as const },
        sectionDesigns: {
          "sec-exp": {
            heading: { style: "bar-left" as const },
          },
        },
        sections: base.sections.map((sec, sIdx) => ({
          ...sec,
          icon: sIdx === 0 ? "Sparkles" : undefined,
          items: sec.items.map((it, iIdx) => ({
            ...it,
            link: iIdx === 0 ? "https://example.com/item" : undefined,
            level: sec.type === "skills" ? 4 : undefined,
          })),
        })),
      };

      const res = buildResumeFromSingleJson(JSON.stringify(exportedSingle), {
        id: "new-uuid-123",
      });
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.resume.id).toBe("new-uuid-123");
      expect(res.resume.templateId).toBe("modern");
      expect(res.resume.personal.photo).toBe("data:image/png;base64,AAA");
      expect(res.resume.personal.extraLinks).toEqual([
        { label: "Portfolio", url: "https://portfolio.dev" },
      ]);
      expect(res.resume.headerDesign?.align).toBe("center");
      expect(res.resume.sectionDesigns?.["sec-exp"]?.heading?.style).toBe("bar-left");
      expect(res.resume.sections[0].icon).toBe("Sparkles");
      expect(res.resume.sections[0].items[0].link).toBe("https://example.com/item");
      expect(res.resume.sections.find((s) => s.type === "skills")?.items[0].level).toBe(4);
      expect(() => ResumeSchema.parse(res.resume)).not.toThrow();
    });

    it("normalizes a real-world resume exported from data/db.json into a valid Resume", () => {
      const dbPath = path.resolve(process.cwd(), "data/db.json");
      if (!fs.existsSync(dbPath)) return;
      const raw = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
      const singleResume = raw.folio_user_data_v1.resumes[0];

      const res = buildResumeFromSingleJson(singleResume, { id: "real-single-1" });
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.resume.id).toBe("real-single-1");
      expect(res.resume.title).toBe(singleResume.title);
      expect(() => ResumeSchema.parse(res.resume)).not.toThrow();
    });

    it("builds a complete schema-valid Resume from MOCK_RESUME_JSON_TEMPLATE with options", () => {
      const res = buildResumeFromSingleJson(MOCK_RESUME_JSON_TEMPLATE, {
        id: "mock-1",
        titleOverride: "Tailored Backend CV",
        templateId: "executive",
      });
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.resume.id).toBe("mock-1");
      expect(res.resume.title).toBe("Tailored Backend CV");
      expect(res.resume.templateId).toBe("executive");
      expect(res.resume.createdAt).toBeTruthy();
      expect(res.resume.updatedAt).toBeTruthy();
      expect(() => ResumeSchema.parse(res.resume)).not.toThrow();
    });

    it("builds a complete schema-valid Resume from standard JSON Resume format", () => {
      const standardJson = {
        basics: {
          name: "Ada Lovelace",
          label: "Principal Mathematician",
          email: "ada@analyticalengine.org",
          summary: "Pioneering computing architect.",
        },
        work: [
          {
            name: "Analytical Engine Lab",
            position: "Lead Programmer",
            startDate: "1842",
            endDate: "1843",
            highlights: ["Authored first published computer algorithm."],
          },
        ],
        skills: [{ name: "Mathematics", keywords: ["Calculus", "Logic"] }],
      };

      const res = buildResumeFromSingleJson(standardJson, { id: "std-1" });
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.resume.personal.fullName).toBe("Ada Lovelace");
      expect(res.resume.sections.some((s) => s.type === "experience")).toBe(true);
      expect(() => ResumeSchema.parse(res.resume)).not.toThrow();
    });

    it("rejects full workspace backups and multi-resume arrays cleanly", () => {
      const base = createInitialState().resumes[0];

      const fullBackup = {
        schemaVersion: 2,
        resumes: [base],
        coverLetters: [],
        jobs: [],
      };
      const res1 = buildResumeFromSingleJson(fullBackup, { id: "x" });
      expect(res1.ok).toBe(false);
      if (!res1.ok) expect(res1.isFullBackup).toBe(true);

      const wrappedDb = {
        folio_user_data_v1: { schemaVersion: 2, resumes: [base] },
      };
      const res2 = buildResumeFromSingleJson(wrappedDb, { id: "x" });
      expect(res2.ok).toBe(false);
      if (!res2.ok) expect(res2.isFullBackup).toBe(true);

      const multiArray = [base, { ...base, id: "second" }];
      const res3 = buildResumeFromSingleJson(multiArray, { id: "x" });
      expect(res3.ok).toBe(false);
      if (!res3.ok) expect(res3.isFullBackup).toBe(true);
    });

    it("rejects malformed JSON and unrecognized JSON shapes without marking as full backup", () => {
      const badJson = buildResumeFromSingleJson("{not valid json", { id: "x" });
      expect(badJson.ok).toBe(false);
      if (!badJson.ok) expect(badJson.isFullBackup).toBeFalsy();

      const unknownShape = buildResumeFromSingleJson({ foo: "bar" }, { id: "x" });
      expect(unknownShape.ok).toBe(false);
      if (!unknownShape.ok) expect(unknownShape.isFullBackup).toBeFalsy();
    });
  });
});
