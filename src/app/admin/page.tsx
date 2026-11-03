"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/common/Navbar";
import { useFolioStore } from "@/lib/store";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  Shield,
  UserPlus,
  Check,
  Ban,
  Unlock,
  Sparkles,
  Trash2,
  RefreshCw,
  Lock,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface MemberStatRow {
  id: string;
  email: string;
  display_name: string | null;
  status: "pending" | "approved" | "blocked";
  role: "user" | "admin";
  ai_shared_key_allowed: boolean;
  created_at: string;
  approved_at: string | null;
  last_seen_at: string | null;
  resume_count: number;
  cover_letter_count: number;
  job_count: number;
  ai_calls_month: number;
}

interface InviteRow {
  email: string;
  note: string | null;
  created_at: string;
  used_at: string | null;
}

export default function AdminPage() {
  const { isHydrated, initStore, userProfile, refreshUserProfile } = useFolioStore();

  const [members, setMembers] = useState<MemberStatRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form state
  const [emailsInput, setEmailsInput] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [inviting, setInviting] = useState(false);

  const loadAdminData = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [statsRes, invitesRes] = await Promise.all([
        supabase.rpc("admin_member_stats"),
        supabase
          .from("invites")
          .select("email, note, created_at, used_at")
          .order("created_at", { ascending: false }),
      ]);

      if (statsRes.error) throw statsRes.error;
      if (invitesRes.error) throw invitesRes.error;

      setMembers((statsRes.data || []) as MemberStatRow[]);
      setInvites((invitesRes.data || []) as InviteRow[]);
      await refreshUserProfile();
    } catch (err: any) {
      setError(err?.message || "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }, [refreshUserProfile]);

  useEffect(() => {
    if (!isHydrated) {
      initStore();
    }
  }, [isHydrated, initStore]);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      loadAdminData();
    } else {
      setLoading(false);
    }
  }, [loadAdminData]);

  const activeAdminCount = members.filter(
    (m) => m.role === "admin" && m.status === "approved"
  ).length;

  const handleUpdateStatus = async (
    member: MemberStatRow,
    newStatus: "approved" | "blocked"
  ) => {
    if (
      newStatus === "blocked" &&
      member.role === "admin" &&
      activeAdminCount <= 1
    ) {
      alert("Cannot block the last remaining approved admin.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const patch: Record<string, any> = { status: newStatus };
    if (newStatus === "approved" && !member.approved_at) {
      patch.approved_at = new Date().toISOString();
    }

    const { error: updateErr } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", member.id);

    if (updateErr) {
      alert(`Error updating member: ${updateErr.message}`);
      return;
    }
    await loadAdminData();
  };

  const handleToggleRole = async (member: MemberStatRow) => {
    const nextRole = member.role === "admin" ? "user" : "admin";
    if (nextRole === "user" && member.role === "admin" && activeAdminCount <= 1) {
      alert("Cannot remove admin role from the last remaining admin.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ role: nextRole })
      .eq("id", member.id);

    if (updateErr) {
      alert(`Error updating role: ${updateErr.message}`);
      return;
    }
    await loadAdminData();
  };

  const handleToggleSharedAiKey = async (member: MemberStatRow) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ ai_shared_key_allowed: !member.ai_shared_key_allowed })
      .eq("id", member.id);

    if (updateErr) {
      alert(`Error toggling shared AI key: ${updateErr.message}`);
      return;
    }
    await loadAdminData();
  };

  const handleAddInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawList = emailsInput
      .split(/[\n,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.includes("@"));

    if (rawList.length === 0) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setInviting(true);
    try {
      const rows = Array.from(new Set(rawList)).map((email) => ({
        email,
        invited_by: userProfile?.id || null,
        note: inviteNote.trim() || null,
      }));

      const { error: invErr } = await supabase
        .from("invites")
        .upsert(rows, { onConflict: "email" });

      if (invErr) throw invErr;

      setEmailsInput("");
      setInviteNote("");
      await loadAdminData();
    } catch (err: any) {
      alert(err?.message || "Failed to add invites.");
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvite = async (email: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { error: delErr } = await supabase
      .from("invites")
      .delete()
      .eq("email", email);

    if (delErr) {
      alert(delErr.message);
      return;
    }
    await loadAdminData();
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-zinc-950 flex flex-col text-stone-900 dark:text-zinc-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-zinc-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
              <Shield className="w-3.5 h-3.5" />
              Workspace Administration
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Members &amp; Invites</h1>
            <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              Zero-access privacy enforced by PostgreSQL Row-Level Security: you can view aggregate
              document counts, never resume contents.
            </p>
          </div>

          <button
            type="button"
            onClick={loadAdminData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-100 dark:hover:bg-zinc-800 px-3.5 py-2 text-xs font-semibold self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Members Table */}
        <section className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-stone-100 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-bold">Members ({members.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-800/50 text-stone-500 dark:text-zinc-400 font-semibold">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Joined / Last Seen</th>
                  <th className="py-3 px-3 text-center">Resumes</th>
                  <th className="py-3 px-3 text-center">Letters</th>
                  <th className="py-3 px-3 text-center">Jobs</th>
                  <th className="py-3 px-3 text-center">AI (Month)</th>
                  <th className="py-3 px-3 text-center">Shared AI Key</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-stone-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading members…
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-stone-400">
                      No members found.
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr
                      key={m.id}
                      className="hover:bg-stone-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-900 dark:text-zinc-100">
                          {m.display_name || "Unnamed"}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-zinc-400">
                          {m.email}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            m.status === "approved"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : m.status === "pending"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                            m.role === "admin"
                              ? "bg-stone-900 text-white dark:bg-amber-500 dark:text-zinc-950"
                              : "bg-stone-100 text-stone-700 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {m.role}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-[11px] text-stone-500 dark:text-zinc-400">
                        <div>Joined: {new Date(m.created_at).toLocaleDateString()}</div>
                        {m.last_seen_at && (
                          <div>Seen: {new Date(m.last_seen_at).toLocaleDateString()}</div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center font-mono">{m.resume_count}</td>
                      <td className="py-3 px-3 text-center font-mono">{m.cover_letter_count}</td>
                      <td className="py-3 px-3 text-center font-mono">{m.job_count}</td>
                      <td className="py-3 px-3 text-center font-mono">{m.ai_calls_month}</td>

                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSharedAiKey(m)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            m.ai_shared_key_allowed
                              ? "bg-emerald-600 text-white"
                              : "bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-400"
                          }`}
                          title="Allow this member to use the server's shared AI_API_KEY"
                        >
                          <Sparkles className="w-3 h-3" />
                          {m.ai_shared_key_allowed ? "Allowed" : "Off"}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {m.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(m, "approved")}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[11px] font-semibold"
                            >
                              <Check className="w-3 h-3" /> Approve
                            </button>
                          )}

                          {m.status !== "blocked" ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(m, "blocked")}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-2 py-1 text-[11px] font-medium"
                            >
                              <Ban className="w-3 h-3" /> Block
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(m, "approved")}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 px-2 py-1 text-[11px] font-medium"
                            >
                              <Unlock className="w-3 h-3" /> Unblock
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleRole(m)}
                            className="rounded-lg border border-stone-200 dark:border-zinc-700 hover:bg-stone-100 dark:hover:bg-zinc-800 px-2 py-1 text-[11px] font-medium"
                          >
                            {m.role === "admin" ? "Remove admin" : "Make admin"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Invites Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Add Invites Form */}
          <section className="lg:col-span-5 rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-sm font-bold">Pre-Approve Friends by Email</h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-zinc-400">
              Anyone signing up with an email on this list skips the pending screen and is
              automatically approved.
            </p>

            <form onSubmit={handleAddInvites} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1">
                  Email Addresses (one per line or comma-separated)
                </label>
                <textarea
                  rows={4}
                  required
                  value={emailsInput}
                  onChange={(e) => setEmailsInput(e.target.value)}
                  placeholder={"alice@example.com\nbob@example.com"}
                  className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-zinc-300 mb-1">
                  Optional Note
                </label>
                <input
                  type="text"
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                  placeholder="e.g. ENSA cohort"
                  className="w-full rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 px-3 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={inviting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 dark:bg-amber-500 text-white dark:text-zinc-950 py-2.5 px-4 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {inviting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Add Invites
              </button>
            </form>
          </section>

          {/* Existing Invites List */}
          <section className="lg:col-span-7 rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs flex flex-col">
            <div className="px-6 py-4 border-b border-stone-100 dark:border-zinc-800">
              <h2 className="text-sm font-bold">Invited Emails ({invites.length})</h2>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-800/50 text-stone-500 dark:text-zinc-400 font-semibold">
                    <th className="py-2.5 px-4">Email</th>
                    <th className="py-2.5 px-3">Note</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-4 text-right">Revoke</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-zinc-800">
                  {invites.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-stone-400">
                        No pre-invited emails yet.
                      </td>
                    </tr>
                  ) : (
                    invites.map((inv) => (
                      <tr key={inv.email}>
                        <td className="py-2.5 px-4 font-mono">{inv.email}</td>
                        <td className="py-2.5 px-3 text-stone-500 dark:text-zinc-400">
                          {inv.note || "—"}
                        </td>
                        <td className="py-2.5 px-3">
                          {inv.used_at ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Used ({new Date(inv.used_at).toLocaleDateString()})
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">Unused</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRevokeInvite(inv.email)}
                            className="p-1 text-stone-400 hover:text-red-600"
                            title="Revoke invite"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

