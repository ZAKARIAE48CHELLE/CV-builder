import { describe, it, expect } from "vitest";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { PdfResumeDocument } from "../templates/renderers/PdfRenderer";
import { createInitialState } from "../lib/migrations";

describe("PdfResumeDocument generation", () => {
  it("renders sample resume to PDF buffer without errors", async () => {
    const state = createInitialState();
    const resume = state.resumes[0];
    const blob = await pdf(React.createElement(PdfResumeDocument, { resume }) as any).toBlob();
    expect(blob.size).toBeGreaterThan(1000);
  });
});
