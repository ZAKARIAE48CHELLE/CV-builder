"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Resume, Section, GlobalDesign } from "@/lib/schema";
import { DEFAULT_GLOBAL_DESIGN, DEFAULT_SECTION_DESIGN } from "@/lib/design/defaults";
import { HtmlRenderer } from "@/templates/renderers/HtmlRenderer";
import { pdf } from "@react-pdf/renderer";
import { PdfResumeDocument } from "@/templates/renderers/PdfRenderer";
import {
  ArrowLeft,
  Download,
  Grid,
  Layers,
  Sparkles,
  CheckCircle,
  FileText,
  Sliders,
} from "lucide-react";

export default function DesignMatrixDevPage() {
  const [activeCombination, setActiveCombination] = useState<
    "headings" | "arrangements" | "entries" | "bullets" | "headers"
  >("arrangements");

  // Sample resume populated with rich test items
  const baseResume: Resume = {
    id: "matrix-sample",
    title: "Design Matrix Verification Resume",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    templateId: "plain",
    design: {
      ...DEFAULT_GLOBAL_DESIGN,
      accentColor: "#0f766e",
      textColor: "#1f2937",
      baseFontSize: 10,
    },
    headerDesign: {},
    sectionDesigns: {},
    personal: {
      fullName: "Alex Rivera",
      jobTitle: "Senior Distributed Systems Engineer",
      email: "alex@example.com",
      phone: "+1 555 123 4567",
      location: "San Francisco, CA",
      website: "https://alexrivera.dev",
      linkedin: "https://linkedin.com/in/alexrivera",
      github: "https://github.com/alexrivera",
    },
    sections: [
      {
        id: "matrix-exp",
        type: "experience",
        heading: "Work Experience",
        visible: true,
        column: "main",
        items: [
          {
            id: "m-1",
            visible: true,
            title: "Staff Infrastructure Engineer",
            subtitle: "Stripe",
            location: "San Francisco, CA",
            startDate: "2022-04",
            endDate: "Present",
            description:
              "<ul><li>Architected global payment routing mesh processing 40M+ API requests daily with zero downtime.</li><li>Reduced p99 tail latency from 180ms to 24ms across 12 edge regions.</li></ul>",
            tags: ["Go", "Kubernetes", "gRPC", "AWS"],
          },
          {
            id: "m-2",
            visible: true,
            title: "Senior Software Engineer",
            subtitle: "Vercel",
            location: "Remote",
            startDate: "2019-08",
            endDate: "2022-03",
            description:
              "<ul><li>Engineered distributed edge cache layer serving 2B+ static asset hits per day.</li><li>Mentored junior engineers and designed internal telemetry standards.</li></ul>",
            tags: ["TypeScript", "Rust", "Next.js"],
          },
        ],
      },
      {
        id: "matrix-skills",
        type: "skills",
        heading: "Technical Skills",
        visible: true,
        column: "main",
        items: [
          {
            id: "sk-1",
            visible: true,
            title: "Core Technologies",
            tags: ["TypeScript", "Go", "Rust", "React", "Next.js", "Docker", "PostgreSQL", "Kafka"],
            level: 5,
          },
          {
            id: "sk-2",
            visible: true,
            title: "Cloud & DevOps",
            tags: ["Kubernetes", "Terraform", "AWS", "GCP", "CI/CD", "Prometheus"],
            level: 4,
          },
        ],
      },
      {
        id: "matrix-lang",
        type: "languages",
        heading: "Languages",
        visible: true,
        column: "main",
        items: [
          { id: "l-1", visible: true, title: "English", level: 5 },
          { id: "l-2", visible: true, title: "Spanish", level: 4 },
          { id: "l-3", visible: true, title: "French", level: 3 },
        ],
      },
    ],
  };

  // Generate matrix variations based on active combination
  const getMatrixResume = (): Resume => {
    const clone: Resume = JSON.parse(JSON.stringify(baseResume));

    if (activeCombination === "headings") {
      clone.sectionDesigns["matrix-exp"] = {
        heading: { ...DEFAULT_SECTION_DESIGN.heading, style: "full-rule", case: "uppercase" },
      };
      clone.sectionDesigns["matrix-skills"] = {
        heading: { ...DEFAULT_SECTION_DESIGN.heading, style: "bar-left" },
      };
      clone.sectionDesigns["matrix-lang"] = {
        heading: { ...DEFAULT_SECTION_DESIGN.heading, style: "box", color: "accent" },
      };
    } else if (activeCombination === "arrangements") {
      clone.sectionDesigns["matrix-exp"] = {
        arrangement: { ...DEFAULT_SECTION_DESIGN.arrangement, mode: "timeline" },
      };
      clone.sectionDesigns["matrix-skills"] = {
        arrangement: { ...DEFAULT_SECTION_DESIGN.arrangement, mode: "tags", tagStyle: "soft", tagRadius: 6 },
      };
      clone.sectionDesigns["matrix-lang"] = {
        arrangement: { ...DEFAULT_SECTION_DESIGN.arrangement, mode: "inline", inlineSeparator: "pipe" },
        level: { display: "text", max: 5, labels: ["Basic", "Conversational", "Proficient", "Fluent", "Native"] },
      };
    } else if (activeCombination === "entries") {
      clone.sectionDesigns["matrix-exp"] = {
        entry: { ...DEFAULT_SECTION_DESIGN.entry, layout: "date-left-column", dateColumnWidth: 22 },
      };
      clone.sectionDesigns["matrix-skills"] = {
        arrangement: { ...DEFAULT_SECTION_DESIGN.arrangement, mode: "grid", gridColumns: 2 },
        level: { display: "dots", max: 5, labels: [] },
      };
    } else if (activeCombination === "bullets") {
      clone.sectionDesigns["matrix-exp"] = {
        description: { ...DEFAULT_SECTION_DESIGN.description, bulletStyle: "arrow", bulletColor: "accent", bulletSpacing: 4 },
      };
    } else if (activeCombination === "headers") {
      clone.headerDesign = {
        layout: "banner",
        nameSize: 22,
        nameWeight: 700,
        nameCase: "none",
        jobTitleSize: 12,
        jobTitleColor: "text",
        contactArrangement: "row",
        contactSeparator: "bullet",
        contactIcons: true,
        iconStyle: "outline",
        photo: { show: false, shape: "circle", size: 50, position: "right", border: false },
        background: "accent",
        spacingBelow: 16,
        placement: "top-full-width",
      };
    }

    return clone;
  };

  const matrixResume = getMatrixResume();

  const handleDownloadPdf = async () => {
    const blob = await pdf(<PdfResumeDocument resume={matrixResume} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `matrix_${activeCombination}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Top Header */}
      <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">Design Matrix Dev Verification</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
              HTML & PDF Parity
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadPdf}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <Download className="w-3.5 h-3.5" />
          Download PDF for Comparison
        </button>
      </header>

      {/* Variation Switcher */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md flex items-center justify-center gap-2 flex-wrap">
        {(
          [
            { id: "arrangements", label: "Arrangements (Timeline, Tags, Inline)", icon: <Layers className="w-3.5 h-3.5" /> },
            { id: "headings", label: "Heading Styles (Full Rule, Bar, Box)", icon: <Grid className="w-3.5 h-3.5" /> },
            { id: "entries", label: "Entry Layouts (Date Column, Grid)", icon: <Sliders className="w-3.5 h-3.5" /> },
            { id: "bullets", label: "Custom Bullets (Arrows, Accent)", icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: "headers", label: "Header Variants (Banner, Split)", icon: <FileText className="w-3.5 h-3.5" /> },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveCombination(tab.id)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeCombination === tab.id
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Render Canvas */}
      <div className="flex-1 overflow-auto p-8 flex justify-center items-start">
        <div className="shadow-2xl rounded-sm max-w-[210mm] w-full">
          <HtmlRenderer resume={matrixResume} />
        </div>
      </div>
    </div>
  );
}
