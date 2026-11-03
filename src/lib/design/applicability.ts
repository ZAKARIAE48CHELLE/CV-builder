import { SectionType } from "../schema";
import { SectionDesign } from "./types";

export type SectionDesignGroup = keyof SectionDesign;

export const APPLICABLE: Record<SectionType, SectionDesignGroup[]> = {
  summary: ["heading", "spacing", "typography", "container", "placement"],
  experience: ["heading", "arrangement", "entry", "description", "spacing", "typography", "container", "placement", "dates"],
  education: ["heading", "arrangement", "entry", "description", "spacing", "typography", "container", "placement", "dates"],
  projects: ["heading", "arrangement", "entry", "description", "spacing", "typography", "container", "placement", "dates"],
  skills: ["heading", "arrangement", "level", "spacing", "typography", "container", "placement"],
  languages: ["heading", "arrangement", "level", "spacing", "typography", "container", "placement"],
  interests: ["heading", "arrangement", "spacing", "typography", "container", "placement"],
  certifications: ["heading", "arrangement", "entry", "spacing", "typography", "container", "placement", "dates"],
  awards: ["heading", "arrangement", "entry", "spacing", "typography", "container", "placement", "dates"],
  publications: ["heading", "arrangement", "entry", "spacing", "typography", "container", "placement", "dates"],
  volunteering: ["heading", "arrangement", "entry", "description", "spacing", "typography", "container", "placement", "dates"],
  references: ["heading", "arrangement", "entry", "spacing", "typography", "container", "placement"],
  custom: ["heading", "arrangement", "entry", "description", "level", "spacing", "typography", "container", "placement", "dates"],
};

export type ArrangementMode = SectionDesign["arrangement"]["mode"];

export const ALLOWED_ARRANGEMENT_MODES: Record<SectionType, ArrangementMode[]> = {
  summary: ["list"],
  experience: ["list", "timeline", "grid", "inline"],
  education: ["list", "timeline", "grid", "inline"],
  projects: ["list", "grid", "timeline", "inline"],
  skills: ["tags", "grid", "inline", "list"],
  languages: ["list", "grid", "inline", "tags"],
  interests: ["tags", "inline", "list", "grid"],
  certifications: ["list", "grid", "inline"],
  awards: ["list", "grid", "inline"],
  publications: ["list", "grid", "inline"],
  volunteering: ["list", "timeline", "grid", "inline"],
  references: ["list", "grid", "inline"],
  custom: ["list", "inline", "grid", "tags", "timeline"],
};
