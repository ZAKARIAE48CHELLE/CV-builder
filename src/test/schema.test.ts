import { describe, it, expect } from "vitest";
import { ResumeSchema, SectionSchema, DesignSettingsSchema } from "../lib/schema";
import { createInitialState, migrateState } from "../lib/migrations";

describe("Resume Schema and Data Model", () => {
  it("validates default design settings", () => {
    const defaultDesign = DesignSettingsSchema.parse({});
    expect(defaultDesign.layout).toBe("one-column");
    expect(defaultDesign.pageSize).toBe("A4");
    expect(defaultDesign.baseFontSize).toBe(10);
    expect(defaultDesign.headingStyle).toBe("underline");
  });

  it("validates a full resume model correctly", () => {
    const initial = createInitialState();
    const resume = initial.resumes[0];
    const parsed = ResumeSchema.parse(resume);
    expect(parsed.personal.fullName).toBe("Alex Rivera");
    expect(parsed.sections.length).toBeGreaterThan(0);
    expect(parsed.templateId).toBe("plain");
  });

  it("migrates raw state to current schema version seamlessly", () => {
    const raw = {
      resumes: [
        {
          id: "legacy-1",
          title: "Legacy Resume",
          personal: { fullName: "Jane Doe" },
          sections: [],
        },
      ],
    };
    const migrated = migrateState(raw);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.resumes[0].templateId).toBe("plain");
    expect(migrated.resumes[0].design.pageSize).toBe("A4");
    expect(migrated.resumes[0].design.sectionDefaults).toBeDefined();
    expect(migrated.resumes[0].sectionDesigns).toEqual({});
  });
});
