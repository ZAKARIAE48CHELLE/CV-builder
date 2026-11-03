"use client";

import React, { useState } from "react";
import { Resume } from "@/lib/schema";
import { callAiApi } from "@/lib/ai/provider";
import { useFolioStore } from "@/lib/store";
import {
  Sparkles,
  Wand2,
  FileCheck2,
  Languages,
  Target,
  ArrowRight,
  Check,
  X,
  Loader2,
  AlertCircle,
  Copy,
} from "lucide-react";

interface AiAssistantPanelProps {
  resume: Resume;
}

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({ resume }) => {
  const { settings, updateResume, duplicateResume, addSection } = useFolioStore();
  const [activeTool, setActiveTool] = useState<
    "improve_bullet" | "generate_summary" | "tailor_to_job" | "grammar_check" | "translate"
  >("improve_bullet");

  // State for Improve Bullet
  const [bulletText, setBulletText] = useState("");
  const [bulletResult, setBulletResult] = useState<{ improved: string; explanation: string } | null>(null);

  // State for Generate Summary
  const [targetRole, setTargetRole] = useState(resume.personal.jobTitle || "");
  const [summaryResult, setSummaryResult] = useState<string | null>(null);

  // State for Tailor to Job
  const [jobDescription, setJobDescription] = useState("");
  const [tailorResult, setTailorResult] = useState<{
    missingKeywords: string[];
    matchedKeywords: string[];
    suggestions: { section: string; advice: string }[];
  } | null>(null);

  // State for Grammar Check
  const [grammarResult, setGrammarResult] = useState<{
    issues: { original: string; suggestion: string; reason: string }[];
    overallAssessment: string;
  } | null>(null);

  // State for Translate
  const [targetLang, setTargetLang] = useState("Spanish");
  const [translateSuccess, setTranslateSuccess] = useState(false);

  // Loading & error
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getResumeContext = () => {
    return JSON.stringify({
      personal: resume.personal,
      sections: resume.sections.map((s) => ({
        heading: s.heading,
        type: s.type,
        items: s.items.map((i) => ({
          title: i.title,
          subtitle: i.subtitle,
          desc: i.description?.replace(/<[^>]+>/g, " "),
          tags: i.tags,
        })),
      })),
    });
  };

  const handleImproveBullet = async () => {
    if (!bulletText.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    setBulletResult(null);

    const res = await callAiApi(
      {
        action: "improve_bullet",
        prompt: bulletText,
        context: `Candidate is applying as ${resume.personal.jobTitle || "Professional"}`,
      },
      settings
    );

    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to improve bullet.");
      return;
    }
    setBulletResult(res.result);
  };

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSummaryResult(null);

    const res = await callAiApi(
      {
        action: "generate_summary",
        prompt: "Generate summary",
        targetRole,
        context: getResumeContext(),
      },
      settings
    );

    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to generate summary.");
      return;
    }
    setSummaryResult(res.result?.summary || res.result);
  };

  const handleApplySummary = () => {
    if (!summaryResult) return;
    // Check if summary section already exists
    const summarySec = resume.sections.find((s) => s.type === "summary");
    if (summarySec && summarySec.items[0]) {
      updateResume(resume.id, (draft) => {
        const sec = draft.sections.find((s) => s.type === "summary");
        if (sec && sec.items[0]) {
          sec.items[0].description = `<p>${summaryResult}</p>`;
        }
        return draft;
      });
    } else {
      addSection(resume.id, "summary", "Professional Summary");
      setTimeout(() => {
        updateResume(resume.id, (draft) => {
          const sec = draft.sections.find((s) => s.type === "summary");
          if (sec && sec.items[0]) {
            sec.items[0].description = `<p>${summaryResult}</p>`;
          }
          return draft;
        });
      }, 50);
    }
    alert("Applied summary to your resume!");
  };

  const handleTailorToJob = async () => {
    if (!jobDescription.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    setTailorResult(null);

    const res = await callAiApi(
      {
        action: "tailor_to_job",
        prompt: "Tailor resume",
        jobDescription,
        context: getResumeContext(),
      },
      settings
    );

    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to analyze job description.");
      return;
    }
    setTailorResult(res.result);
  };

  const handleGrammarCheck = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setGrammarResult(null);

    const res = await callAiApi(
      {
        action: "grammar_check",
        prompt: "Grammar audit",
        context: getResumeContext(),
      },
      settings
    );

    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to audit resume.");
      return;
    }
    setGrammarResult(res.result);
  };

  const handleTranslate = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setTranslateSuccess(false);

    // Creates duplicate resume first
    const clonedId = duplicateResume(resume.id);
    if (!clonedId) {
      setIsLoading(false);
      setErrorMsg("Failed to clone resume for translation.");
      return;
    }

    const res = await callAiApi(
      {
        action: "translate",
        prompt: `Translate resume`,
        targetLanguage: targetLang,
        context: getResumeContext(),
      },
      settings
    );

    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Translation request failed.");
      return;
    }

    setTranslateSuccess(true);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Tool tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
        {[
          { id: "improve_bullet", label: "Improve Bullet", icon: Wand2 },
          { id: "generate_summary", label: "Summary Writer", icon: Sparkles },
          { id: "tailor_to_job", label: "Tailor to Job", icon: Target },
          { id: "grammar_check", label: "Grammar Audit", icon: FileCheck2 },
          { id: "translate", label: "Translate", icon: Languages },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTool === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTool(tab.id as any);
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      {/* Tool 1: Improve Bullet */}
      {activeTool === "improve_bullet" && (
        <div className="space-y-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
              Bullet Point Enhancer
            </h4>
            <p className="text-xs text-neutral-500 mt-0.5">
              Paste any bullet point to transform it with action verbs and quantifiable impact.
            </p>
          </div>

          <textarea
            rows={3}
            value={bulletText}
            onChange={(e) => setBulletText(e.target.value)}
            placeholder="e.g. Worked on the website and made things load faster..."
            className="w-full text-xs p-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-neutral-900"
          />

          <button
            type="button"
            onClick={handleImproveBullet}
            disabled={isLoading || !bulletText.trim()}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            Rewrite & Quantify Bullet
          </button>

          {bulletResult && (
            <div className="mt-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <span className="text-[11px] font-bold text-neutral-500 uppercase block">
                Suggested Improvement:
              </span>
              <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800">
                {bulletResult.improved}
              </p>
              {bulletResult.explanation && (
                <p className="text-[11px] text-neutral-500 italic">
                  Note: {bulletResult.explanation}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(bulletResult.improved);
                    alert("Copied to clipboard!");
                  }}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tool 2: Generate Summary */}
      {activeTool === "generate_summary" && (
        <div className="space-y-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
              Professional Summary Generator
            </h4>
            <p className="text-xs text-neutral-500 mt-0.5">
              Synthesizes your experience into a tailored, punchy 3-sentence executive summary.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Target Role or Title
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Product Manager"
              className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerateSummary}
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Generate Tailored Summary
          </button>

          {summaryResult && (
            <div className="mt-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <span className="text-[11px] font-bold text-neutral-500 uppercase block">
                Generated Summary:
              </span>
              <p className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800">
                {summaryResult}
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleApplySummary}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" /> Apply to Resume
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tool 3: Tailor to Job */}
      {activeTool === "tailor_to_job" && (
        <div className="space-y-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
              Job Description Match & Tailoring
            </h4>
            <p className="text-xs text-neutral-500 mt-0.5">
              Paste the target job description to pinpoint missing keywords and section tweaks.
            </p>
          </div>

          <textarea
            rows={5}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste target job posting description here..."
            className="w-full text-xs p-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
          />

          <button
            type="button"
            onClick={handleTailorToJob}
            disabled={isLoading || !jobDescription.trim()}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Target className="w-3.5 h-3.5" />}
            Analyze Job Fit
          </button>

          {tailorResult && (
            <div className="mt-3 space-y-3">
              {tailorResult.missingKeywords?.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase block mb-1.5">
                    Recommended Missing Keywords:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {tailorResult.missingKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-medium"
                      >
                        +{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {tailorResult.suggestions?.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase block">
                    Targeted Suggestions:
                  </span>
                  {tailorResult.suggestions.map((sug, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs"
                    >
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        {sug.section}:
                      </span>{" "}
                      <span className="text-neutral-600 dark:text-neutral-400">
                        {sug.advice}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tool 4: Grammar Audit */}
      {activeTool === "grammar_check" && (
        <div className="space-y-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
              Comprehensive Grammar & Spelling Audit
            </h4>
            <p className="text-xs text-neutral-500 mt-0.5">
              Audits the entire resume for passive voice, typos, and phrasing flaws.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGrammarCheck}
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck2 className="w-3.5 h-3.5" />}
            Run Grammar Audit
          </button>

          {grammarResult && (
            <div className="mt-3 space-y-2">
              {grammarResult.overallAssessment && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 font-medium">
                  {grammarResult.overallAssessment}
                </div>
              )}

              {grammarResult.issues?.map((issue, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs space-y-1"
                >
                  <div className="text-rose-600 line-through">{issue.original}</div>
                  <div className="text-emerald-600 font-medium">→ {issue.suggestion}</div>
                  <p className="text-[11px] text-neutral-500">{issue.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tool 5: Translate to Duplicate Resume */}
      {activeTool === "translate" && (
        <div className="space-y-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
              Translate to Duplicate Resume
            </h4>
            <p className="text-xs text-neutral-500 mt-0.5">
              Clones this resume and generates a translated copy in your dashboard.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Target Language
            </label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
            >
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="German">German</option>
              <option value="Italian">Italian</option>
              <option value="Portuguese">Portuguese</option>
              <option value="Japanese">Japanese</option>
              <option value="Chinese">Chinese (Simplified)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleTranslate}
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
            Translate & Duplicate
          </button>

          {translateSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>
                New translated resume created successfully! Return to dashboard to view it.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
