import { z } from "zod";

export const PersonalInfoSchema = z.object({
  fullName: z.string().default(""),
  jobTitle: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  photo: z.string().optional(), // base64 / data URL
  extraLinks: z
    .array(
      z.object({
        label: z.string(),
        url: z.string(),
      })
    )
    .optional(),
});

export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;

export const SectionTypeSchema = z.enum([
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
]);

export type SectionType = z.infer<typeof SectionTypeSchema>;

export const SectionItemSchema = z.object({
  id: z.string(),
  visible: z.boolean().default(true),
  title: z.string().optional(), // role / degree / project / skill group
  subtitle: z.string().optional(), // company / school
  location: z.string().optional(),
  startDate: z.string().optional(), // YYYY-MM or text
  endDate: z.string().optional(), // Present or date
  link: z.string().optional(),
  description: z.string().optional(), // TipTap HTML
  tags: z.array(z.string()).optional(),
  level: z.number().min(1).max(5).optional(),
});

export type SectionItem = z.infer<typeof SectionItemSchema>;

export const SectionSchema = z.object({
  id: z.string(),
  type: SectionTypeSchema,
  heading: z.string(),
  visible: z.boolean().default(true),
  column: z.enum(["main", "side"]).optional().default("main"),
  icon: z.string().optional(),
  items: z.array(SectionItemSchema).default([]),
});

export type Section = z.infer<typeof SectionSchema>;

export {
  DesignSettingsSchema,
  SectionDesignSchema,
  HeaderDesignSchema,
  GlobalDesignSchema,
  type DesignSettings,
  type SectionDesign,
  type HeaderDesign,
  type GlobalDesign,
} from "./design/types";

import {
  GlobalDesignSchema,
  HeaderDesignSchema,
  SectionDesignSchema,
  DesignSettingsSchema,
} from "./design/types";

export const ResumeSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  templateId: z.string().default("plain"),
  design: GlobalDesignSchema,
  headerDesign: HeaderDesignSchema.partial().optional(),
  sectionDesigns: z.record(z.string(), SectionDesignSchema.partial()).default({}),
  personal: PersonalInfoSchema,
  sections: z.array(SectionSchema).default([]),
});

export type Resume = z.infer<typeof ResumeSchema>;

export const CoverLetterSchema = z.object({
  id: z.string(),
  title: z.string(),
  linkedResumeId: z.string().optional(),
  recipient: z.object({
    name: z.string().optional(),
    company: z.string().optional(),
    address: z.string().optional(),
  }),
  date: z.string(),
  body: z.string(), // TipTap HTML
  design: DesignSettingsSchema,
});

export type CoverLetter = z.infer<typeof CoverLetterSchema>;

export const JobStageSchema = z.enum(["wishlist", "applied", "interview", "offer", "rejected"]);
export type JobStage = z.infer<typeof JobStageSchema>;

export const JobApplicationSchema = z.object({
  id: z.string(),
  company: z.string(),
  role: z.string(),
  link: z.string().optional(),
  date: z.string(),
  stage: JobStageSchema.default("wishlist"),
  notes: z.string().optional(),
  linkedResumeId: z.string().optional(),
  linkedCoverLetterId: z.string().optional(),
  salary: z.string().optional(),
  location: z.string().optional(),
});

export type JobApplication = z.infer<typeof JobApplicationSchema>;

export const AppSettingsSchema = z.object({
  aiProvider: z.enum(["openai", "anthropic", "gemini", "groq", "ollama"]).default("gemini"),
  aiApiKey: z.string().default(""),
  aiModel: z.string().default("gemini-2.0-flash"),
  aiCustomEndpoint: z.string().optional(),
  defaultPageSize: z.enum(["A4", "Letter"]).default("A4"),
  defaultDateFormat: z.enum(["MMM YYYY", "MM/YYYY", "YYYY"]).default("MMM YYYY"),
  language: z.string().default("en"),
  theme: z.enum(["light", "dark", "system"]).default("system"),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

export const SECTION_META: Record<SectionType, { label: string; defaultHeading: string; iconName: string }> = {
  summary: { label: "Summary / Profile", defaultHeading: "Professional Summary", iconName: "User" },
  experience: { label: "Work Experience", defaultHeading: "Experience", iconName: "Briefcase" },
  education: { label: "Education", defaultHeading: "Education", iconName: "GraduationCap" },
  skills: { label: "Skills", defaultHeading: "Skills", iconName: "Wrench" },
  projects: { label: "Projects", defaultHeading: "Key Projects", iconName: "FolderGit2" },
  languages: { label: "Languages", defaultHeading: "Languages", iconName: "Globe" },
  certifications: { label: "Certifications", defaultHeading: "Certifications & Licenses", iconName: "Award" },
  awards: { label: "Honors & Awards", defaultHeading: "Honors & Awards", iconName: "Trophy" },
  publications: { label: "Publications", defaultHeading: "Publications", iconName: "BookOpen" },
  volunteering: { label: "Volunteering", defaultHeading: "Volunteering & Community", iconName: "Heart" },
  interests: { label: "Interests", defaultHeading: "Interests & Hobbies", iconName: "Sparkles" },
  references: { label: "References", defaultHeading: "References", iconName: "Users" },
  custom: { label: "Custom Section", defaultHeading: "Additional Information", iconName: "ListPlus" },
};
