import { Resume, Section } from "@/lib/schema";

export interface PartitionedResume {
  fullWidthSections: Section[];
  mainSections: Section[];
  sideSections: Section[];
  isTwoColumn: boolean;
  sidebarPosition: "left" | "right" | "none";
}

export function partitionSections(resume: Resume): PartitionedResume {
  const visibleSections = resume.sections.filter((s) => s.visible !== false);
  const layout = resume.design.layout;

  if (layout === "one-column") {
    return {
      fullWidthSections: [],
      mainSections: visibleSections,
      sideSections: [],
      isTwoColumn: false,
      sidebarPosition: "none",
    };
  }

  const fullWidthSections: Section[] = [];
  const mainSections: Section[] = [];
  const sideSections: Section[] = [];

  for (const s of visibleSections) {
    const override = resume.sectionDesigns?.[s.id]?.placement;
    const isFullWidth = override?.fullWidth ?? false;
    const col = override?.column ?? s.column ?? "main";

    if (isFullWidth) {
      fullWidthSections.push(s);
    } else if (col === "side") {
      sideSections.push(s);
    } else {
      mainSections.push(s);
    }
  }

  // If user selected two-column but all non-fullwidth sections are in main, intelligently place side-suited sections in side
  if (sideSections.length === 0 && (layout === "two-column-left" || layout === "two-column-right")) {
    const sideCandidateTypes = ["skills", "languages", "interests", "certifications", "references"];
    const candidates = [...mainSections];
    mainSections.length = 0;

    for (const s of candidates) {
      if (sideCandidateTypes.includes(s.type)) {
        sideSections.push(s);
      } else {
        mainSections.push(s);
      }
    }
    // If still empty, put last section in side
    if (sideSections.length === 0 && mainSections.length > 1) {
      const popped = mainSections.pop();
      if (popped) sideSections.push(popped);
    }
  }

  return {
    fullWidthSections,
    mainSections,
    sideSections,
    isTwoColumn: true,
    sidebarPosition: layout === "two-column-left" ? "left" : "right",
  };
}
