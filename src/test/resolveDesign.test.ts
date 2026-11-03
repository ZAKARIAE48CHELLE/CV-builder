import { describe, it, expect } from "vitest";
import { resolveSectionDesign, resolveHeaderDesign } from "../lib/design/resolve";
import { DEFAULT_SECTION_DESIGN, DEFAULT_HEADER_DESIGN, DEFAULT_GLOBAL_DESIGN } from "../lib/design/defaults";
import { GlobalDesign } from "../lib/design/types";

describe("resolveSectionDesign - 3-level style inheritance", () => {
  it("resolves default design with no overrides", () => {
    const global: GlobalDesign = {
      ...DEFAULT_GLOBAL_DESIGN,
      accentColor: "#123456",
      fontFamily: "roboto",
    };

    const resolved = resolveSectionDesign(
      DEFAULT_SECTION_DESIGN,
      global,
      "experience"
    );

    expect(resolved.arrangement.mode).toBe("list");
    expect(resolved.heading.style).toBe("underline");
    // Token inheritance
    expect(resolved.heading.color).toBe("#123456");
    expect(resolved.typography.fontFamily).toBe("roboto");
  });

  it("applies partial overrides for specific properties", () => {
    const global: GlobalDesign = {
      ...DEFAULT_GLOBAL_DESIGN,
      accentColor: "#333333",
    };

    const overrides = {
      arrangement: {
        ...DEFAULT_SECTION_DESIGN.arrangement,
        mode: "timeline" as const,
      },
      spacing: {
        ...DEFAULT_SECTION_DESIGN.spacing,
        marginBottom: 24,
      },
    };

    const resolved = resolveSectionDesign(
      DEFAULT_SECTION_DESIGN,
      global,
      "experience",
      overrides
    );

    // Overridden fields take precedence
    expect(resolved.arrangement.mode).toBe("timeline");
    expect(resolved.spacing.marginBottom).toBe(24);

    // Non-overridden fields inherit from global/template
    expect(resolved.heading.style).toBe("underline");
    expect(resolved.entry.layout).toBe("title-date-row");
    expect(resolved.heading.color).toBe("#333333");
  });

  it("propagates global changes to non-overridden properties", () => {
    // Initial global
    const globalV1: GlobalDesign = {
      ...DEFAULT_GLOBAL_DESIGN,
      sectionDefaults: {
        ...DEFAULT_SECTION_DESIGN,
        heading: {
          ...DEFAULT_SECTION_DESIGN.heading,
          fontSize: 14,
        },
      },
    };

    // Override only arrangement.mode
    const overrides = {
      arrangement: {
        ...DEFAULT_SECTION_DESIGN.arrangement,
        mode: "tags" as const,
      },
    };

    const resolvedV1 = resolveSectionDesign(
      DEFAULT_SECTION_DESIGN,
      globalV1,
      "skills",
      overrides
    );
    expect(resolvedV1.heading.fontSize).toBe(14);
    expect(resolvedV1.arrangement.mode).toBe("tags");

    // Global change to heading fontSize
    const globalV2: GlobalDesign = {
      ...globalV1,
      sectionDefaults: {
        ...globalV1.sectionDefaults,
        heading: {
          ...globalV1.sectionDefaults.heading,
          fontSize: 16,
        },
      },
    };

    const resolvedV2 = resolveSectionDesign(
      DEFAULT_SECTION_DESIGN,
      globalV2,
      "skills",
      overrides
    );

    // Non-overridden heading.fontSize updated to 16
    expect(resolvedV2.heading.fontSize).toBe(16);
    // Overridden arrangement.mode remains "tags"
    expect(resolvedV2.arrangement.mode).toBe("tags");
  });

  it("handles reset of overrides (reverts to global)", () => {
    const global: GlobalDesign = {
      ...DEFAULT_GLOBAL_DESIGN,
      sectionDefaults: {
        ...DEFAULT_SECTION_DESIGN,
        heading: {
          ...DEFAULT_SECTION_DESIGN.heading,
          style: "box",
        },
      },
    };

    // Section had an override
    const overrides = {
      heading: {
        ...DEFAULT_SECTION_DESIGN.heading,
        style: "full-rule" as const,
      },
    };

    const overridden = resolveSectionDesign(
      DEFAULT_SECTION_DESIGN,
      global,
      "education",
      overrides
    );
    expect(overridden.heading.style).toBe("full-rule");

    // Resetting override: passing undefined or empty overrides
    const reset = resolveSectionDesign(
      DEFAULT_SECTION_DESIGN,
      global,
      "education",
      undefined
    );
    expect(reset.heading.style).toBe("box");
  });

  it("resolves header design with global flags and overrides", () => {
    const global: GlobalDesign = {
      ...DEFAULT_GLOBAL_DESIGN,
      showPhoto: true,
      showIcons: false,
    };

    const resolved = resolveHeaderDesign(
      DEFAULT_HEADER_DESIGN,
      global,
      {
        layout: "name-left-contact-right",
        nameSize: 24,
      }
    );

    expect(resolved.layout).toBe("name-left-contact-right");
    expect(resolved.nameSize).toBe(24);
    expect(resolved.photo.show).toBe(true);
    expect(resolved.contactIcons).toBe(false);
  });
});
