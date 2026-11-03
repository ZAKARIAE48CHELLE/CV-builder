import { describe, it, expect } from "vitest";
import { resolveSectionDesign, resolveHeaderDesign } from "../lib/design/resolve";
import { DEFAULT_SECTION_DESIGN, DEFAULT_HEADER_DESIGN, DEFAULT_GLOBAL_DESIGN } from "../lib/design/defaults";
import { BUILT_IN_PRESETS } from "../lib/design/presets";
import { partitionSections } from "../templates/layoutHelper";
import { Resume } from "../lib/schema";

describe("Section Design Controls & Resolution", () => {
  it("resolves arrangement modes correctly", () => {
    const global = { ...DEFAULT_GLOBAL_DESIGN };

    // Tags mode
    const tagsResolved = resolveSectionDesign(DEFAULT_SECTION_DESIGN, global, "skills", {
      arrangement: { ...DEFAULT_SECTION_DESIGN.arrangement, mode: "tags", tagStyle: "filled", tagRadius: 8 },
    });
    expect(tagsResolved.arrangement.mode).toBe("tags");
    expect(tagsResolved.arrangement.tagStyle).toBe("filled");
    expect(tagsResolved.arrangement.tagRadius).toBe(8);

    // Timeline mode
    const timelineResolved = resolveSectionDesign(DEFAULT_SECTION_DESIGN, global, "experience", {
      arrangement: { ...DEFAULT_SECTION_DESIGN.arrangement, mode: "timeline" },
    });
    expect(timelineResolved.arrangement.mode).toBe("timeline");

    // Grid mode
    const gridResolved = resolveSectionDesign(DEFAULT_SECTION_DESIGN, global, "skills", {
      arrangement: { ...DEFAULT_SECTION_DESIGN.arrangement, mode: "grid", gridColumns: 3 },
    });
    expect(gridResolved.arrangement.mode).toBe("grid");
    expect(gridResolved.arrangement.gridColumns).toBe(3);
  });

  it("resolves heading styles and color token inheritances", () => {
    const global = {
      ...DEFAULT_GLOBAL_DESIGN,
      accentColor: "#10b981",
      textColor: "#374151",
    };

    const headingResolved = resolveSectionDesign(DEFAULT_SECTION_DESIGN, global, "experience", {
      heading: {
        ...DEFAULT_SECTION_DESIGN.heading,
        style: "bar-left",
        case: "uppercase",
        color: "accent",
      },
    });

    expect(headingResolved.heading.style).toBe("bar-left");
    expect(headingResolved.heading.case).toBe("uppercase");
    expect(headingResolved.heading.color).toBe("#10b981");

    // Custom color
    const customColorResolved = resolveSectionDesign(DEFAULT_SECTION_DESIGN, global, "experience", {
      heading: {
        ...DEFAULT_SECTION_DESIGN.heading,
        color: "#e11d48",
      },
    });
    expect(customColorResolved.heading.color).toBe("#e11d48");
  });

  it("resolves header name color inheritances and custom colors", () => {
    const global = {
      ...DEFAULT_GLOBAL_DESIGN,
      accentColor: "#047857",
      textColor: "#1f2937",
    };

    const defaultHeader = resolveHeaderDesign(DEFAULT_HEADER_DESIGN, global);
    expect(defaultHeader.nameColor).toBe("#047857");

    const customHeader = resolveHeaderDesign(DEFAULT_HEADER_DESIGN, global, {
      nameColor: "#6366f1",
    });
    expect(customHeader.nameColor).toBe("#6366f1");

    const textHeader = resolveHeaderDesign(DEFAULT_HEADER_DESIGN, global, {
      nameColor: "text",
    });
    expect(textHeader.nameColor).toBe("#1f2937");
  });

  it("resolves entry layouts and date configurations", () => {
    const global = { ...DEFAULT_GLOBAL_DESIGN, dateFormat: "YYYY" as const };

    const entryResolved = resolveSectionDesign(DEFAULT_SECTION_DESIGN, global, "experience", {
      entry: {
        ...DEFAULT_SECTION_DESIGN.entry,
        layout: "date-left-column",
        order: "subtitle-first",
        dateColumnWidth: 30,
      },
      dates: {
        ...DEFAULT_SECTION_DESIGN.dates,
        format: "inherit",
        separator: "to",
      },
    });

    expect(entryResolved.entry.layout).toBe("date-left-column");
    expect(entryResolved.entry.order).toBe("subtitle-first");
    expect(entryResolved.entry.dateColumnWidth).toBe(30);
    expect(entryResolved.dates.format).toBe("YYYY");
    expect(entryResolved.dates.separator).toBe("to");
  });

  it("applies built-in presets correctly", () => {
    const timelinePreset = BUILT_IN_PRESETS.find((p) => p.id === "exp-timeline");
    expect(timelinePreset).toBeDefined();

    const global = { ...DEFAULT_GLOBAL_DESIGN };
    const resolved = resolveSectionDesign(
      DEFAULT_SECTION_DESIGN,
      global,
      "experience",
      timelinePreset?.overrides
    );

    expect(resolved.arrangement.mode).toBe("timeline");
  });

  it("partitions full-width sections in two-column layouts", () => {
    const resume: Resume = {
      id: "part-test",
      title: "Partition Test",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      templateId: "split",
      design: {
        ...DEFAULT_GLOBAL_DESIGN,
        layout: "two-column-right",
      },
      headerDesign: {},
      sectionDesigns: {
        "sec-summary": {
          placement: { ...DEFAULT_SECTION_DESIGN.placement, fullWidth: true },
        },
      },
      personal: { fullName: "Test User" },
      sections: [
        { id: "sec-summary", type: "summary", heading: "Summary", visible: true, column: "main", items: [] },
        { id: "sec-exp", type: "experience", heading: "Experience", visible: true, column: "main", items: [] },
        { id: "sec-skills", type: "skills", heading: "Skills", visible: true, column: "side", items: [] },
      ],
    };

    const partitioned = partitionSections(resume);
    expect(partitioned.isTwoColumn).toBe(true);
    expect(partitioned.fullWidthSections.map((s) => s.id)).toEqual(["sec-summary"]);
    expect(partitioned.mainSections.map((s) => s.id)).toEqual(["sec-exp"]);
    expect(partitioned.sideSections.map((s) => s.id)).toEqual(["sec-skills"]);
  });
});
