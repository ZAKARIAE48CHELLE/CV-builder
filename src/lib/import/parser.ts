import { PersonalInfo, Section, SectionItem, SectionType } from "../schema";

export interface ParsedResumeDraft {
  personal: PersonalInfo;
  sections: Section[];
}

export function parseTextHeuristically(rawText: string): ParsedResumeDraft {
  const allLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim());

  const personal: PersonalInfo = {
    fullName: "",
  };

  // 1. Extract email
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const emailMatch = rawText.match(emailRegex);
  if (emailMatch) personal.email = emailMatch[1];

  // 2. Extract phone
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/;
  const phoneMatch = rawText.match(phoneRegex);
  if (phoneMatch && phoneMatch[0].replace(/\D/g, "").length >= 7) {
    personal.phone = phoneMatch[0].trim();
  }

  // 3. Extract Links
  const linkedinMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  if (linkedinMatch) personal.linkedin = `https://linkedin.com/in/${linkedinMatch[1]}`;

  const githubMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
  if (githubMatch) personal.github = `https://github.com/${githubMatch[1]}`;

  const websiteMatch = rawText.match(/(?:https?:\/\/)([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/i);
  if (websiteMatch && !websiteMatch[0].includes("linkedin") && !websiteMatch[0].includes("github")) {
    personal.website = websiteMatch[0];
  }

  const nonEmptyLines = allLines.filter((l) => l.length > 0);

  // 4. Candidate Name: first clean line that isn't email, phone, or URL
  for (const line of nonEmptyLines.slice(0, 5)) {
    const cleanedLine = line.split(/[•·|\-–]/)[0].trim();
    const candidate = cleanedLine.length >= 2 && cleanedLine.length <= 40 ? cleanedLine : line;

    if (
      !candidate.includes("@") &&
      !candidate.match(phoneRegex) &&
      !candidate.startsWith("http") &&
      candidate.length >= 2 &&
      candidate.length <= 45 &&
      !/resume|curriculum|vitae|page|contact|profil|coordonn[eé]es/i.test(candidate)
    ) {
      personal.fullName = candidate;
      break;
    }
  }
  if (!personal.fullName) personal.fullName = "Applicant Name";

  // 5. Job Title guess
  const firstLine = nonEmptyLines[0] || "";
  if (firstLine.includes(personal.fullName) && firstLine.length > personal.fullName.length + 3) {
    const remainder = firstLine
      .replace(personal.fullName, "")
      .replace(/^[•·|\-–\s]+/, "")
      .trim();
    if (remainder.length > 3 && remainder.length < 80) {
      personal.jobTitle = remainder.split(/[•·|]/)[0].trim();
    }
  }

  if (!personal.jobTitle) {
    const nameIndex = nonEmptyLines.findIndex((l) => l.includes(personal.fullName));
    if (nameIndex >= 0 && nonEmptyLines[nameIndex + 1]) {
      const candidateTitle = nonEmptyLines[nameIndex + 1];
      if (
        candidateTitle.length < 80 &&
        !candidateTitle.includes("@") &&
        !candidateTitle.match(phoneRegex) &&
        !candidateTitle.startsWith("http")
      ) {
        personal.jobTitle = candidateTitle.split(/[•·|]/)[0].trim();
      }
    }
  }

  // 6. Section Partitioning keywords (English + French)
  const SECTION_KEYWORDS: Record<SectionType, RegExp> = {
    summary: /^(professional\s+summary|summary|profile|about\s+me|objective|profil|r[eé]sum[eé]|a\s+propos|objectif)\s*$/i,
    experience: /^(work\s+experience|experience|employment\s+history|professional\s+experience|exp[eé]riences?(\s+professionnelles?)?|stages?|parcours\s+professionnel)\s*$/i,
    education: /^(education|academic\s+background|qualifications|formations?|parcours\s+acad[eé]mique|[eé]tudes|dipl[oô]mes?)\s*$/i,
    skills: /^(skills|technical\s+skills|core\s+competencies|technologies|comp[eé]tences?(\s+techniques)?|outils|stack|technologies\s+&\s+outils)\s*$/i,
    projects: /^(projects|key\s+projects|personal\s+projects|projets?(\s+r[eé]alis[eé]s)?)\s*$/i,
    languages: /^(languages|language\s+proficiency|langues?)\s*$/i,
    certifications: /^(certifications|licenses|courses|certificats?|formations?\s+certifiantes?)\s*$/i,
    awards: /^(awards|honors|achievements|distinctions?|prix)\s*$/i,
    publications: /^(publications|papers|articles)\s*$/i,
    volunteering: /^(volunteering|community|volunteer\s+work|b[eé]n[eé]volat|engagements?)\s*$/i,
    interests: /^(interests|hobbies|centres?\s+d['’]int[eé]r[eê]ts?|loisirs)\s*$/i,
    references: /^(references|r[eé]f[eé]rences)\s*$/i,
    custom: /^(additional\s+information|other|divers|autres?)\s*$/i,
  };

  const DATE_REGEX = /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Janvier|F[eé]vrier|Mars|Avril|Mai|Juin|Juillet|Ao[uû]t|Septembre|Octobre|Novembre|D[eé]cembre)[a-z]*\s+\d{4}|\b\d{4})\s*(?:–|-|to|[aà])\s*(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Janvier|F[eé]vrier|Mars|Avril|Mai|Juin|Juillet|Ao[uû]t|Septembre|Octobre|Novembre|D[eé]cembre)[a-z]*\s+\d{4}|\b\d{4}|Present|Pr[eé]sent|Aujourd['’]hui)/i;

  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let currentRawLines: string[] = [];

  // Helper to flush parsed items into currentSection
  const flushSection = () => {
    if (!currentSection || currentRawLines.length === 0) return;
    const sType = currentSection.type;

    if (sType === "summary") {
      const summaryText = currentRawLines.filter(Boolean).join(" ");
      if (summaryText.trim()) {
        currentSection.items.push({
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          visible: true,
          description: `<p>${summaryText.trim()}</p>`,
        });
      }
    } else if (sType === "skills" || sType === "languages") {
      // Split skills by category if present (e.g. "Languages: Python, TS" or "Frontend: React, Vue")
      const catLines = currentRawLines.filter(Boolean);
      for (const line of catLines) {
        if (line.includes(":") && line.indexOf(":") < 30) {
          const [cat, itemsStr] = line.split(/:(.+)/);
          const tags = itemsStr
            .split(/[,•·|\/]/)
            .map((t) => t.trim())
            .filter((t) => t.length > 0 && t.length < 40);
          if (tags.length > 0) {
            currentSection.items.push({
              id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              visible: true,
              title: cat.trim(),
              tags,
            });
          }
        } else {
          const tags = line
            .split(/[,•·|\/]/)
            .map((t) => t.trim())
            .filter((t) => t.length > 0 && t.length < 40);
          if (tags.length > 0) {
            currentSection.items.push({
              id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              visible: true,
              title: sType === "languages" ? "Langues" : "Compétences",
              tags,
            });
          }
        }
      }
    } else {
      // Experience, Education, Projects, Certifications, etc.
      // Group lines into individual entries (split on empty lines OR new distinct entry headers)
      const entryGroups: string[][] = [];
      let currentGroup: string[] = [];

      for (let i = 0; i < currentRawLines.length; i++) {
        const line = currentRawLines[i];
        if (!line || line.trim().length === 0) {
          if (currentGroup.length > 0) {
            entryGroups.push(currentGroup);
            currentGroup = [];
          }
          continue;
        }

        const isBullet = /^[•·\-\*]/.test(line);
        const lineHasDate = DATE_REGEX.test(line);
        const prevLine = currentGroup[currentGroup.length - 1] || "";
        const prevIsBullet = /^[•·\-\*]/.test(prevLine);

        // If currentGroup has items, and:
        // 1. Previous line was a bullet and current line is not a bullet (indicates a new entry title), OR
        // 2. Current group already has a title and a date/subtitle, and current line is a new short non-bullet title
        if (
          currentGroup.length >= 2 &&
          !isBullet &&
          (prevIsBullet || (currentGroup.some((l) => DATE_REGEX.test(l)) && line.length < 60 && !lineHasDate))
        ) {
          entryGroups.push(currentGroup);
          currentGroup = [line];
        } else {
          currentGroup.push(line);
        }
      }
      if (currentGroup.length > 0) {
        entryGroups.push(currentGroup);
      }

      for (const grp of entryGroups) {
        if (grp.length === 0) continue;
        const blockText = grp.join("\n");
        const dateMatch = blockText.match(DATE_REGEX);

        const firstLine = grp[0] || "";
        const secondLine = grp[1] && !grp[1].startsWith("•") && !grp[1].startsWith("-") && grp[1].length < 60 ? grp[1] : "";

        // Extract bullets
        const bullets = grp
          .filter((l) => /^[•·\-\*]/.test(l) || (l !== firstLine && l !== secondLine && !DATE_REGEX.test(l) && l.length > 20))
          .map((l) => l.replace(/^[•·\-\*]\s*/, ""));

        // Extract clean title
        let cleanTitle = firstLine;
        if (dateMatch && cleanTitle.includes(dateMatch[0])) {
          cleanTitle = cleanTitle.replace(dateMatch[0], "").replace(/[–\-|,]+$/, "").trim();
        }

        currentSection.items.push({
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          visible: true,
          title: cleanTitle.slice(0, 70),
          subtitle: secondLine,
          startDate: dateMatch ? dateMatch[1] : undefined,
          endDate: dateMatch ? dateMatch[2] : undefined,
          description:
            bullets.length > 0
              ? `<ul>${bullets.map((b) => `<li>${b}</li>`).join("")}</ul>`
              : `<p>${blockText}</p>`,
        });
      }
    }

    currentRawLines = [];
  };

  for (const line of allLines) {
    let matchedType: SectionType | null = null;
    let matchedHeading = line;

    const normalizedLine = line.replace(/[:\-–—]/g, "").trim();
    if (normalizedLine.length > 0 && normalizedLine.length < 45) {
      for (const [type, regex] of Object.entries(SECTION_KEYWORDS) as [SectionType, RegExp][]) {
        if (regex.test(normalizedLine)) {
          matchedType = type;
          matchedHeading = normalizedLine;
          break;
        }
      }
    }

    if (matchedType) {
      flushSection();
      currentSection = {
        id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: matchedType,
        heading: matchedHeading,
        visible: true,
        column: matchedType === "skills" || matchedType === "languages" ? "side" : "main",
        items: [],
      };
      sections.push(currentSection);
    } else if (currentSection) {
      currentRawLines.push(line);
    }
  }

  flushSection();

  // If no sections were identified, put raw text in summary
  if (sections.length === 0 && rawText.trim()) {
    sections.push({
      id: `sec-imported`,
      type: "summary",
      heading: "Imported Overview",
      visible: true,
      column: "main",
      items: [
        {
          id: `item-imported`,
          visible: true,
          description: `<p>${rawText.slice(0, 1500)}</p>`,
        },
      ],
    });
  }

  return sanitizeAndValidateParsedDraft({ personal, sections });
}

/**
 * Validates and sanitizes a parsed draft (from either heuristic or AI extraction)
 * ensuring every section and item has unique IDs, valid types, and adheres to the schema.
 */
export function sanitizeAndValidateParsedDraft(rawDraft: any): ParsedResumeDraft {
  const VALID_SECTION_TYPES: SectionType[] = [
    "summary",
    "experience",
    "education",
    "skills",
    "projects",
    "languages",
    "certifications",
    "awards",
    "publications",
    "volunteering",
    "interests",
    "references",
    "custom",
  ];

  const rawPersonal = rawDraft?.personal || {};
  const personal: PersonalInfo = {
    fullName: String(rawPersonal.fullName || "").trim() || "Applicant Name",
    jobTitle: rawPersonal.jobTitle ? String(rawPersonal.jobTitle).trim() : undefined,
    email: rawPersonal.email ? String(rawPersonal.email).trim() : undefined,
    phone: rawPersonal.phone ? String(rawPersonal.phone).trim() : undefined,
    location: rawPersonal.location ? String(rawPersonal.location).trim() : undefined,
    website: rawPersonal.website ? String(rawPersonal.website).trim() : undefined,
    linkedin: rawPersonal.linkedin ? String(rawPersonal.linkedin).trim() : undefined,
    github: rawPersonal.github ? String(rawPersonal.github).trim() : undefined,
  };

  const rawSections = Array.isArray(rawDraft?.sections) ? rawDraft.sections : [];
  const sections: Section[] = [];

  for (let sIdx = 0; sIdx < rawSections.length; sIdx++) {
    const rawSec = rawSections[sIdx];
    if (!rawSec) continue;

    const rawType = String(rawSec.type || "custom").toLowerCase() as SectionType;
    const type: SectionType = VALID_SECTION_TYPES.includes(rawType) ? rawType : "custom";
    const heading = String(rawSec.heading || type.charAt(0).toUpperCase() + type.slice(1)).trim();
    const column: "main" | "side" = rawSec.column === "side" ? "side" : "main";
    const secId = rawSec.id && typeof rawSec.id === "string" ? rawSec.id : `sec-parsed-${Date.now()}-${sIdx}`;

    const rawItems = Array.isArray(rawSec.items) ? rawSec.items : [];
    const items: SectionItem[] = [];

    for (let iIdx = 0; iIdx < rawItems.length; iIdx++) {
      const it = rawItems[iIdx];
      if (!it) continue;

      let description = typeof it.description === "string" ? it.description.trim() : "";
      if (description && !description.startsWith("<") && !description.endsWith(">")) {
        // Wrap plain text in paragraph or bullets
        if (description.includes("\n•") || description.includes("\n-") || description.startsWith("•") || description.startsWith("-")) {
          const lines = description.split(/\r?\n/).map((l: string) => l.replace(/^[•\-\*·]\s*/, "").trim()).filter(Boolean);
          description = `<ul>${lines.map((l: string) => `<li>${l}</li>`).join("")}</ul>`;
        } else {
          description = `<p>${description}</p>`;
        }
      }

      const tags = Array.isArray(it.tags)
        ? it.tags.map((t: any) => String(t).trim()).filter(Boolean)
        : typeof it.tags === "string"
        ? it.tags.split(/[,•·|]/).map((t: string) => t.trim()).filter(Boolean)
        : undefined;

      items.push({
        id: it.id && typeof it.id === "string" ? it.id : `item-parsed-${Date.now()}-${sIdx}-${iIdx}`,
        visible: it.visible !== false,
        title: it.title ? String(it.title).trim() : undefined,
        subtitle: it.subtitle ? String(it.subtitle).trim() : undefined,
        location: it.location ? String(it.location).trim() : undefined,
        startDate: it.startDate ? String(it.startDate).trim() : undefined,
        endDate: it.endDate ? String(it.endDate).trim() : undefined,
        description: description || undefined,
        tags: tags && tags.length > 0 ? tags : undefined,
      });
    }

    sections.push({
      id: secId,
      type,
      heading,
      visible: rawSec.visible !== false,
      column,
      items,
    });
  }

  return { personal, sections };
}

export const MOCK_RESUME_JSON_TEMPLATE = {
  title: "Alex Rivera - Full-Stack Engineer Resume",
  personal: {
    fullName: "Alex Rivera",
    jobTitle: "Senior Full-Stack Engineer",
    email: "alex.rivera@example.com",
    phone: "+1 (555) 019-2834",
    location: "San Francisco, CA",
    website: "https://alexrivera.dev",
    linkedin: "https://linkedin.com/in/alexrivera",
    github: "https://github.com/alexrivera",
  },
  sections: [
    {
      id: "sec-summary",
      type: "summary",
      heading: "Professional Summary",
      visible: true,
      column: "main",
      items: [
        {
          id: "item-sum-1",
          visible: true,
          description:
            "<p>Versatile Full-Stack Engineer with 6+ years of experience architecting high-performance web applications, distributed microservices, and real-time cloud systems. Proficient in TypeScript, React, Next.js, Node.js, and PostgreSQL.</p>",
        },
      ],
    },
    {
      id: "sec-experience",
      type: "experience",
      heading: "Work Experience",
      visible: true,
      column: "main",
      items: [
        {
          id: "item-exp-1",
          visible: true,
          title: "Senior Full-Stack Engineer",
          subtitle: "Acme Cloud Technologies",
          location: "San Francisco, CA",
          startDate: "2022-03",
          endDate: "Present",
          description:
            "<ul><li>Architected micro-frontend architecture reducing bundle sizes by 42% across 3 core applications.</li><li>Engineered streaming API endpoints with Server-Sent Events (SSE) for low-latency live collaboration.</li><li>Mentored a distributed engineering team in modern TypeScript patterns and automated CI/CD testing.</li></ul>",
        },
        {
          id: "item-exp-2",
          visible: true,
          title: "Full-Stack Developer",
          subtitle: "Nexus Digital Labs",
          location: "New York, NY",
          startDate: "2019-06",
          endDate: "2022-02",
          description:
            "<ul><li>Built client-facing dashboards and RESTful APIs serving 250,000+ daily active users.</li><li>Optimized database queries and PostgreSQL indexing, cutting p95 response times from 340ms to 45ms.</li></ul>",
        },
      ],
    },
    {
      id: "sec-education",
      type: "education",
      heading: "Education",
      visible: true,
      column: "main",
      items: [
        {
          id: "item-edu-1",
          visible: true,
          title: "B.S. in Computer Science",
          subtitle: "University of California, Berkeley",
          startDate: "2015",
          endDate: "2019",
          description:
            "<p>Magna Cum Laude. Coursework in Distributed Systems, Algorithms, and Cloud Infrastructure.</p>",
        },
      ],
    },
    {
      id: "sec-skills",
      type: "skills",
      heading: "Skills & Technologies",
      visible: true,
      column: "main",
      items: [
        {
          id: "item-sk-1",
          visible: true,
          title: "Languages & Frameworks",
          tags: ["TypeScript", "JavaScript", "React", "Next.js", "Node.js", "Python", "Tailwind CSS"],
        },
        {
          id: "item-sk-2",
          visible: true,
          title: "Cloud & Infrastructure",
          tags: ["PostgreSQL", "Redis", "Docker", "AWS", "Supabase", "Git", "CI/CD"],
        },
      ],
    },
    {
      id: "sec-projects",
      type: "projects",
      heading: "Key Projects",
      visible: true,
      column: "main",
      items: [
        {
          id: "item-proj-1",
          visible: true,
          title: "Real-time Collaborative Canvas",
          subtitle: "Open Source Project",
          description:
            "<p>Built a WebSocket-powered multiplayer canvas supporting 100+ concurrent peers with CRDT state synchronization.</p>",
        },
      ],
    },
    {
      id: "sec-languages",
      type: "languages",
      heading: "Languages",
      visible: true,
      column: "side",
      items: [
        {
          id: "item-lang-1",
          visible: true,
          title: "English",
          subtitle: "Native / Bilingual",
        },
        {
          id: "item-lang-2",
          visible: true,
          title: "French",
          subtitle: "Professional Working Proficiency",
        },
      ],
    },
  ],
};

/**
 * Parses JSON input (either Folio Resume schema, JSON Resume schema, or general backup)
 * into a validated ParsedResumeDraft for the import review workflow.
 */
export function parseJsonResume(input: string | any): { draft: ParsedResumeDraft; title: string } {
  let data: any = input;
  if (typeof input === "string") {
    data = JSON.parse(input);
  }

  if (!data || typeof data !== "object") {
    throw new Error("Invalid JSON: input must be a JSON object or array.");
  }

  // Handle wraps: { resumes: [...] } or array of resumes [...]
  if (Array.isArray(data)) {
    data = data[0] || {};
  } else if (Array.isArray(data.resumes) && data.resumes.length > 0) {
    data = data.resumes[0];
  }

  // Check if it's standard JSON Resume format (has `basics`)
  if (data.basics && typeof data.basics === "object") {
    const basics = data.basics;
    const personal: PersonalInfo = {
      fullName: String(basics.name || "").trim() || "Applicant Name",
      jobTitle: basics.label ? String(basics.label).trim() : undefined,
      email: basics.email ? String(basics.email).trim() : undefined,
      phone: basics.phone ? String(basics.phone).trim() : undefined,
      website: basics.url ? String(basics.url).trim() : undefined,
    };

    if (basics.location) {
      if (typeof basics.location === "object") {
        personal.location = [
          basics.location.address,
          basics.location.city,
          basics.location.region,
          basics.location.countryCode,
        ]
          .filter(Boolean)
          .join(", ");
      } else {
        personal.location = String(basics.location);
      }
    }

    if (Array.isArray(basics.profiles)) {
      for (const p of basics.profiles) {
        const net = String(p.network || "").toLowerCase();
        const url = p.url || (p.username ? `https://${net}.com/${p.username}` : "");
        if (net.includes("linkedin")) personal.linkedin = url;
        else if (net.includes("github")) personal.github = url;
        else if (!personal.website) personal.website = url;
      }
    }

    const sections: Section[] = [];

    // Summary from basics
    if (basics.summary) {
      sections.push({
        id: `sec-summary-${Date.now()}`,
        type: "summary",
        heading: "Professional Summary",
        visible: true,
        column: "main",
        items: [
          {
            id: `item-summary-${Date.now()}`,
            visible: true,
            description: `<p>${String(basics.summary).trim()}</p>`,
          },
        ],
      });
    }

    // Work experience
    if (Array.isArray(data.work) && data.work.length > 0) {
      sections.push({
        id: `sec-exp-${Date.now()}`,
        type: "experience",
        heading: "Work Experience",
        visible: true,
        column: "main",
        items: data.work.map((w: any, idx: number) => {
          let desc = w.summary ? `<p>${w.summary}</p>` : "";
          if (Array.isArray(w.highlights) && w.highlights.length > 0) {
            desc += `<ul>${w.highlights.map((h: any) => `<li>${String(h).trim()}</li>`).join("")}</ul>`;
          }
          return {
            id: `item-exp-${Date.now()}-${idx}`,
            visible: true,
            title: w.position ? String(w.position).trim() : undefined,
            subtitle: w.name ? String(w.name).trim() : undefined,
            location: w.location ? String(w.location).trim() : undefined,
            startDate: w.startDate ? String(w.startDate).trim() : undefined,
            endDate: w.endDate ? String(w.endDate).trim() : undefined,
            description: desc || undefined,
          };
        }),
      });
    }

    // Education
    if (Array.isArray(data.education) && data.education.length > 0) {
      sections.push({
        id: `sec-edu-${Date.now()}`,
        type: "education",
        heading: "Education",
        visible: true,
        column: "main",
        items: data.education.map((e: any, idx: number) => {
          const title = [e.studyType, e.area].filter(Boolean).join(" in ");
          return {
            id: `item-edu-${Date.now()}-${idx}`,
            visible: true,
            title: title || undefined,
            subtitle: e.institution ? String(e.institution).trim() : undefined,
            startDate: e.startDate ? String(e.startDate).trim() : undefined,
            endDate: e.endDate ? String(e.endDate).trim() : undefined,
            description: e.score ? `<p>GPA / Grade: ${e.score}</p>` : undefined,
          };
        }),
      });
    }

    // Skills
    if (Array.isArray(data.skills) && data.skills.length > 0) {
      sections.push({
        id: `sec-skills-${Date.now()}`,
        type: "skills",
        heading: "Skills",
        visible: true,
        column: "main",
        items: data.skills.map((s: any, idx: number) => ({
          id: `item-sk-${Date.now()}-${idx}`,
          visible: true,
          title: s.name ? String(s.name).trim() : "Skills",
          tags: Array.isArray(s.keywords) ? s.keywords.map(String) : undefined,
        })),
      });
    }

    // Projects
    if (Array.isArray(data.projects) && data.projects.length > 0) {
      sections.push({
        id: `sec-proj-${Date.now()}`,
        type: "projects",
        heading: "Projects",
        visible: true,
        column: "main",
        items: data.projects.map((p: any, idx: number) => {
          let desc = p.description ? `<p>${p.description}</p>` : "";
          if (Array.isArray(p.highlights) && p.highlights.length > 0) {
            desc += `<ul>${p.highlights.map((h: any) => `<li>${String(h).trim()}</li>`).join("")}</ul>`;
          }
          return {
            id: `item-proj-${Date.now()}-${idx}`,
            visible: true,
            title: p.name ? String(p.name).trim() : undefined,
            subtitle: p.entity || p.type ? String(p.entity || p.type).trim() : undefined,
            startDate: p.startDate ? String(p.startDate).trim() : undefined,
            endDate: p.endDate ? String(p.endDate).trim() : undefined,
            description: desc || undefined,
            tags: Array.isArray(p.keywords) ? p.keywords.map(String) : undefined,
          };
        }),
      });
    }

    // Languages
    if (Array.isArray(data.languages) && data.languages.length > 0) {
      sections.push({
        id: `sec-lang-${Date.now()}`,
        type: "languages",
        heading: "Languages",
        visible: true,
        column: "side",
        items: data.languages.map((l: any, idx: number) => ({
          id: `item-lang-${Date.now()}-${idx}`,
          visible: true,
          title: l.language ? String(l.language).trim() : undefined,
          subtitle: l.fluency ? String(l.fluency).trim() : undefined,
        })),
      });
    }

    // Certifications
    const certs = data.certificates || data.certifications;
    if (Array.isArray(certs) && certs.length > 0) {
      sections.push({
        id: `sec-cert-${Date.now()}`,
        type: "certifications",
        heading: "Certifications",
        visible: true,
        column: "side",
        items: certs.map((c: any, idx: number) => ({
          id: `item-cert-${Date.now()}-${idx}`,
          visible: true,
          title: c.name ? String(c.name).trim() : undefined,
          subtitle: c.issuer ? String(c.issuer).trim() : undefined,
          startDate: c.date ? String(c.date).trim() : undefined,
        })),
      });
    }

    const draft = sanitizeAndValidateParsedDraft({ personal, sections });
    const title =
      data.title ||
      (draft.personal.jobTitle
        ? `${draft.personal.fullName} – ${draft.personal.jobTitle}`
        : `${draft.personal.fullName} Resume`);
    return { draft, title };
  }

  // Folio / Native format: { personal, sections, ... } or { personalInfo, ... }
  const rawPersonal = data.personal || data.personalInfo || data.profile || data.contact || {};
  const rawSections = data.sections || [];

  const rawDraft = {
    personal: rawPersonal,
    sections: rawSections,
  };

  const draft = sanitizeAndValidateParsedDraft(rawDraft);
  const title =
    data.title ||
    (draft.personal.jobTitle
      ? `${draft.personal.fullName} – ${draft.personal.jobTitle}`
      : `${draft.personal.fullName} Resume`);

  return { draft, title };
}
