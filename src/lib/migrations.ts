import { SCHEMA_VERSION, DEFAULT_DESIGN } from "../config";
import { Resume, CoverLetter, AppSettings, JobApplication } from "./schema";
import { DEFAULT_GLOBAL_DESIGN, DEFAULT_SECTION_DESIGN } from "./design/defaults";

export interface PersistedState {
  schemaVersion: number;
  resumes: Resume[];
  coverLetters: CoverLetter[];
  jobs: JobApplication[];
  settings: AppSettings;
}

export function migrateState(rawState: unknown): PersistedState {
  if (!rawState || typeof rawState !== "object") {
    return createInitialState();
  }

  let unwrapped: any = rawState;
  if (unwrapped.folio_user_data_v1) {
    try {
      unwrapped =
        typeof unwrapped.folio_user_data_v1 === "string"
          ? JSON.parse(unwrapped.folio_user_data_v1)
          : unwrapped.folio_user_data_v1;
    } catch {}
  }
  if (unwrapped.state && typeof unwrapped.state === "object") {
    unwrapped = unwrapped.state;
  }

  // Handle single resume JSON
  if (
    !Array.isArray(unwrapped.resumes) &&
    unwrapped.sections &&
    (unwrapped.personal || unwrapped.title)
  ) {
    unwrapped = { ...unwrapped, resumes: [unwrapped] };
  } else if (Array.isArray(unwrapped)) {
    unwrapped = { resumes: unwrapped };
  }

  const state = unwrapped as Partial<PersistedState> & { version?: number };
  const currentVersion = state.schemaVersion ?? state.version ?? 0;

  let migratedResumes: Resume[] = Array.isArray(state.resumes) ? (state.resumes as Resume[]) : [];
  let migratedCoverLetters: CoverLetter[] = Array.isArray(state.coverLetters) ? state.coverLetters : [];
  let migratedJobs: JobApplication[] = Array.isArray(state.jobs) ? state.jobs : [];
  let migratedSettings: AppSettings = state.settings ?? {
    aiProvider: "gemini",
    aiApiKey: "",
    aiModel: "gemini-2.0-flash",
    defaultPageSize: "A4",
    defaultDateFormat: "MMM YYYY",
    language: "en",
    theme: "system",
  };

  if (currentVersion < 1) {
    // Migration to v1: ensure each resume has design with full fields, sections, etc.
    migratedResumes = migratedResumes.map((r) => ({
      ...r,
      templateId: r.templateId || "plain",
      design: { ...DEFAULT_GLOBAL_DESIGN, ...(r.design || {}) },
      personal: {
        ...(r.personal || {}),
        fullName: r.personal?.fullName || "Your Name",
      },
      sections: Array.isArray(r.sections)
        ? r.sections.map((s, idx) => ({
            ...s,
            id: s.id || `section-${idx}-${Date.now()}`,
            column: s.column || "main",
            items: Array.isArray(s.items)
              ? s.items.map((item, itemIdx) => ({
                  ...item,
                  id: item.id || `item-${itemIdx}-${Date.now()}`,
                  visible: item.visible !== false,
                }))
              : [],
          }))
        : [],
    }));
  }

  if (currentVersion < 2) {
    // Migration to v2: Per-section & header design controls
    migratedResumes = migratedResumes.map((r) => {
      const existingDesign = (r.design as any) || {};
      const sectionDefaults = {
        ...DEFAULT_SECTION_DESIGN,
        ...(existingDesign.sectionDefaults || {}),
        heading: {
          ...DEFAULT_SECTION_DESIGN.heading,
          style: (existingDesign.headingStyle === "bar"
            ? "bar-left"
            : existingDesign.headingStyle === "caps"
            ? "full-rule"
            : existingDesign.headingStyle || "underline") as any,
          ...(existingDesign.sectionDefaults?.heading || {}),
        },
      };

      const globalDesign = {
        ...DEFAULT_GLOBAL_DESIGN,
        ...existingDesign,
        sectionDefaults,
      };

      return {
        ...r,
        design: globalDesign,
        headerDesign: r.headerDesign || {},
        sectionDesigns: r.sectionDesigns || {},
      };
    });
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    resumes: migratedResumes,
    coverLetters: migratedCoverLetters,
    jobs: migratedJobs,
    settings: migratedSettings,
  };
}

export function createInitialState(): PersistedState {
  const sampleResume: Resume = {
    id: "sample-resume",
    title: "Software Engineer",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateId: "plain",
    design: { ...DEFAULT_GLOBAL_DESIGN },
    headerDesign: {},
    sectionDesigns: {},
    personal: {
      fullName: "Alex Rivera",
      jobTitle: "Senior Full-Stack Engineer",
      email: "alex.rivera@example.com",
      phone: "+1 (555) 234-5678",
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
            id: "sum-1",
            visible: true,
            description:
              "<p>High-impact Full-Stack Engineer with 6+ years of experience designing scalable distributed systems and delightful web applications. Specialized in TypeScript, React, Next.js, and cloud architectures with proven track record of reducing latency by 40% and mentoring 10+ engineers.</p>",
          },
        ],
      },
      {
        id: "sec-exp",
        type: "experience",
        heading: "Work Experience",
        visible: true,
        column: "main",
        items: [
          {
            id: "exp-1",
            visible: true,
            title: "Senior Full-Stack Engineer",
            subtitle: "Vanguard Tech Labs",
            location: "San Francisco, CA",
            startDate: "2022-03",
            endDate: "Present",
            description:
              "<ul><li>Architected and delivered mission-critical real-time analytics pipeline processing 15M+ events daily with 99.99% uptime.</li><li>Spearheaded migration of legacy monolith to modern Next.js micro-frontends, cutting initial load time by 48%.</li><li>Established CI/CD pipelines, automated testing coverage from 52% to 91%, eliminating production deployment regressions.</li></ul>",
            tags: ["TypeScript", "Next.js", "PostgreSQL", "Docker", "AWS"],
          },
          {
            id: "exp-2",
            visible: true,
            title: "Software Engineer",
            subtitle: "Horizon Cloud Systems",
            location: "Austin, TX",
            startDate: "2019-06",
            endDate: "2022-02",
            description:
              "<ul><li>Engineered customer-facing collaborative dashboards using React, WebSockets, and Redis.</li><li>Optimized database queries and API endpoints, decreasing median response times from 350ms to 65ms.</li><li>Collaborated closely with product designers to build accessible, WCAG AA compliant UI design system.</li></ul>",
            tags: ["React", "Node.js", "Redis", "GraphQL"],
          },
        ],
      },
      {
        id: "sec-edu",
        type: "education",
        heading: "Education",
        visible: true,
        column: "main",
        items: [
          {
            id: "edu-1",
            visible: true,
            title: "B.S. in Computer Science",
            subtitle: "University of California, Berkeley",
            location: "Berkeley, CA",
            startDate: "2015-08",
            endDate: "2019-05",
            description: "<p>Dean's Honor List, Magna Cum Laude. Coursework in Distributed Systems, Algorithms, Machine Learning.</p>",
          },
        ],
      },
      {
        id: "sec-skills",
        type: "skills",
        heading: "Technical Skills",
        visible: true,
        column: "side",
        items: [
          {
            id: "sk-1",
            visible: true,
            title: "Languages",
            tags: ["TypeScript", "JavaScript", "Python", "Go", "SQL", "HTML/CSS"],
          },
          {
            id: "sk-2",
            visible: true,
            title: "Frameworks & Tools",
            tags: ["React", "Next.js", "Node.js", "Tailwind CSS", "Zustand", "PostgreSQL", "Redis", "Git", "Docker"],
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
            id: "proj-1",
            visible: true,
            title: "CloudPulse",
            subtitle: "Open Source Observability Tool",
            link: "https://github.com/alexrivera/cloudpulse",
            startDate: "2023",
            endDate: "2024",
            description:
              "<ul><li>Created an ultra-lightweight distributed tracing visualizer with 2,400+ GitHub stars.</li><li>Published zero-dependency npm package downloaded 40,000+ times per month.</li></ul>",
            tags: ["TypeScript", "Canvas", "Web Workers"],
          },
        ],
      },
    ],
  };

  const sampleCoverLetter: CoverLetter = {
    id: "sample-letter",
    title: "Staff Engineer Application",
    linkedResumeId: "sample-resume",
    recipient: {
      name: "Engineering Hiring Committee",
      company: "Acme Innovations",
      address: "100 Market St, Suite 400, San Francisco, CA",
    },
    date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    body: `<p>Dear Hiring Team,</p>
<p>I am writing to express my strong enthusiasm for the Senior / Staff Full-Stack Engineer role at Acme Innovations. Having followed your groundbreaking work in real-time collaborative software, I am excited by the prospect of contributing my expertise in high-throughput systems, TypeScript, and modern frontend engineering.</p>
<p>In my recent role at Vanguard Tech Labs, I architected a real-time event analytics engine processing over 15 million daily events while spearheading our transition to Next.js. I have continually bridged product intuition with robust engineering rigor, driving latency down by 48% while maintaining 99.99% service reliability.</p>
<p>I would welcome the opportunity to discuss how my technical background and leadership experience can accelerate Acme's product vision. Thank you for your time and consideration.</p>
<p>Warm regards,<br />Alex Rivera</p>`,
    design: { ...DEFAULT_DESIGN },
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    resumes: [sampleResume],
    coverLetters: [sampleCoverLetter],
    jobs: [
      {
        id: "job-1",
        company: "Stripe",
        role: "Staff Infrastructure Engineer",
        link: "https://stripe.com/jobs",
        date: new Date().toISOString().slice(0, 10),
        stage: "interview",
        notes: "Technical deep-dive scheduled for next Tuesday. Review distributed systems notes.",
        linkedResumeId: "sample-resume",
        salary: "$210k - $240k",
        location: "Remote / SF",
      },
      {
        id: "job-2",
        company: "Vercel",
        role: "Senior DX Engineer",
        link: "https://vercel.com/careers",
        date: new Date().toISOString().slice(0, 10),
        stage: "applied",
        notes: "Submitted tailored resume and cover letter via referral.",
        linkedResumeId: "sample-resume",
        salary: "$195k - $225k",
        location: "Remote",
      },
    ],
    settings: {
      aiProvider: "gemini",
      aiApiKey: "",
      aiModel: "gemini-2.0-flash",
      defaultPageSize: "A4",
      defaultDateFormat: "MMM YYYY",
      language: "en",
      theme: "system",
    },
  };
}
