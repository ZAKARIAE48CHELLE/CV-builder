"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/common/Navbar";
import { useFolioStore } from "@/lib/store";
import { JobApplication, JobStage } from "@/lib/schema";
import {
  Briefcase,
  Plus,
  Building,
  Calendar,
  ExternalLink,
  FileText,
  Trash2,
  Edit2,
  DollarSign,
  MapPin,
  X,
  Loader2,
} from "lucide-react";

const STAGES: { id: JobStage; title: string; color: string }[] = [
  { id: "wishlist", title: "Wishlist", color: "bg-neutral-500" },
  { id: "applied", title: "Applied", color: "bg-blue-500" },
  { id: "interview", title: "Interview", color: "bg-amber-500" },
  { id: "offer", title: "Offer", color: "bg-emerald-500" },
  { id: "rejected", title: "Archived / Rejected", color: "bg-rose-500" },
];

export default function JobTrackerPage() {
  const {
    isHydrated,
    initStore,
    jobs,
    resumes,
    coverLetters,
    addJob,
    updateJob,
    updateJobStage,
    deleteJob,
  } = useFolioStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobApplication | null>(null);

  // Form fields
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [link, setLink] = useState("");
  const [salary, setSalary] = useState("");
  const [location, setLocation] = useState("");
  const [stage, setStage] = useState<JobStage>("wishlist");
  const [notes, setNotes] = useState("");
  const [linkedResumeId, setLinkedResumeId] = useState("");
  const [linkedCoverLetterId, setLinkedCoverLetterId] = useState("");

  useEffect(() => {
    if (!isHydrated) {
      initStore();
    }
  }, [isHydrated, initStore]);

  const openNewModal = (initialStage: JobStage = "wishlist") => {
    setEditingJob(null);
    setCompany("");
    setRole("");
    setLink("");
    setSalary("");
    setLocation("");
    setStage(initialStage);
    setNotes("");
    setLinkedResumeId(resumes[0]?.id || "");
    setLinkedCoverLetterId("");
    setIsModalOpen(true);
  };

  const openEditModal = (job: JobApplication) => {
    setEditingJob(job);
    setCompany(job.company);
    setRole(job.role);
    setLink(job.link || "");
    setSalary(job.salary || "");
    setLocation(job.location || "");
    setStage(job.stage);
    setNotes(job.notes || "");
    setLinkedResumeId(job.linkedResumeId || "");
    setLinkedCoverLetterId(job.linkedCoverLetterId || "");
    setIsModalOpen(true);
  };

  const handleSaveJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    if (editingJob) {
      updateJob(editingJob.id, {
        company: company.trim(),
        role: role.trim(),
        link: link.trim() || undefined,
        salary: salary.trim() || undefined,
        location: location.trim() || undefined,
        stage,
        notes: notes.trim() || undefined,
        linkedResumeId: linkedResumeId || undefined,
        linkedCoverLetterId: linkedCoverLetterId || undefined,
      });
    } else {
      addJob({
        company: company.trim(),
        role: role.trim(),
        date: new Date().toISOString().slice(0, 10),
        link: link.trim() || undefined,
        salary: salary.trim() || undefined,
        location: location.trim() || undefined,
        stage,
        notes: notes.trim() || undefined,
        linkedResumeId: linkedResumeId || undefined,
        linkedCoverLetterId: linkedCoverLetterId || undefined,
      });
    }
    setIsModalOpen(false);
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 flex flex-col text-neutral-900 dark:text-neutral-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Application Tracker
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Kanban pipeline tracking every application, target salary, notes, and tied resume versions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openNewModal("wishlist")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-xs font-bold shadow-xs hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add Application
          </button>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6 overflow-x-auto pb-6">
          {STAGES.map((col) => {
            const stageJobs = jobs.filter((j) => j.stage === col.id);
            return (
              <div
                key={col.id}
                className="flex flex-col bg-neutral-100/70 dark:bg-neutral-900/60 rounded-2xl p-3 border border-neutral-200/80 dark:border-neutral-800 min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-neutral-200/60 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                      {col.title}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-neutral-500 bg-neutral-200/60 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                    {stageJobs.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  {stageJobs.map((job) => {
                    const linkedResume = resumes.find((r) => r.id === job.linkedResumeId);
                    return (
                      <div
                        key={job.id}
                        className="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs hover:shadow-md transition-all space-y-2 group"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                              {job.role}
                            </h4>
                            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mt-0.5 flex items-center gap-1">
                              <Building className="w-3 h-3 text-neutral-400" />
                              {job.company}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => openEditModal(job)}
                              className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                              title="Edit application"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete ${job.company} application?`)) {
                                  deleteJob(job.id);
                                }
                              }}
                              className="p-1 text-neutral-400 hover:text-rose-600"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Metadata row */}
                        <div className="flex flex-wrap gap-2 text-[10px] text-neutral-500 pt-1">
                          {job.salary && (
                            <span className="inline-flex items-center gap-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                              <DollarSign className="w-2.5 h-2.5" /> {job.salary}
                            </span>
                          )}
                          {job.location && (
                            <span className="inline-flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5" /> {job.location}
                            </span>
                          )}
                          {job.link && (
                            <a
                              href={job.link.startsWith("http") ? job.link : `https://${job.link}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"
                            >
                              <ExternalLink className="w-2.5 h-2.5" /> Link
                            </a>
                          )}
                        </div>

                        {/* Linked Resume badge */}
                        {linkedResume && (
                          <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[10px]">
                            <span className="text-neutral-400">Resume:</span>
                            <Link
                              href={`/resume/${linkedResume.id}`}
                              className="font-medium text-neutral-700 dark:text-neutral-300 hover:underline flex items-center gap-1"
                            >
                              <FileText className="w-2.5 h-2.5" /> {linkedResume.title}
                            </Link>
                          </div>
                        )}

                        {/* Move stage selector */}
                        <div className="pt-1">
                          <select
                            value={job.stage}
                            onChange={(e) => updateJobStage(job.id, e.target.value as JobStage)}
                            className="w-full text-[10px] py-1 px-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-700 dark:text-neutral-300"
                          >
                            {STAGES.map((s) => (
                              <option key={s.id} value={s.id}>
                                Move to: {s.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}

                  {stageJobs.length === 0 && (
                    <div className="h-24 flex items-center justify-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-400 text-xs">
                      No jobs
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => openNewModal(col.id)}
                  className="mt-3 w-full py-1.5 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add here
                </button>
              </div>
            );
          })}
        </div>
      </main>

      {/* Add / Edit Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-lg w-full p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {editingJob ? "Edit Application" : "Track New Job Application"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="space-y-3.5 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. OpenAI"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Role Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Full-Stack Engineer"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Target Stage
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as JobStage)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                  >
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Expected Salary / Range
                  </label>
                  <input
                    type="text"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="e.g. $180k - $210k"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Job Posting Link
                  </label>
                  <input
                    type="text"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://company.com/job/..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Remote, USA"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              {/* Linked Resume */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Attach Tailored Resume
                </label>
                <select
                  value={linkedResumeId}
                  onChange={(e) => setLinkedResumeId(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                >
                  <option value="">None</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.personal.fullName || "Candidate"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Notes & Interview Prep
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes from initial recruiter screen, interview dates, referral name..."
                  className="w-full text-xs p-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90"
                >
                  {editingJob ? "Save Changes" : "Create Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
