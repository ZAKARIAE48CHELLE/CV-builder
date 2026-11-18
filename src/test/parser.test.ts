import { describe, it, expect } from "vitest";
import {
  parseTextHeuristically,
  parseJsonResume,
  MOCK_RESUME_JSON_TEMPLATE,
} from "../lib/import/parser";

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
});
