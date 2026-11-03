import { describe, it, expect } from "vitest";
import { parseTextHeuristically } from "../lib/import/parser";

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
});
