"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { APP_NAME } from "@/config";
import { useFolioStore } from "@/lib/store";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { SaveStatusIndicator } from "./SaveStatusIndicator";
import {
  FileText,
  Briefcase,
  Settings,
  Sun,
  Moon,
  ShieldCheck,
  User,
  Shield,
  LogOut,
} from "lucide-react";

import { useTheme } from "./ThemeProvider";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const userProfile = useFolioStore((s) => s.userProfile);
  const pendingCount = useFolioStore((s) => s.pendingCount);

  const supabaseEnabled = isSupabaseConfigured();

  const navLinks = [
    { href: "/", label: "Resumes & Letters", icon: FileText, badge: 0 },
    { href: "/jobs", label: "Job Tracker", icon: Briefcase, badge: 0 },
    { href: "/settings", label: "Settings", icon: Settings, badge: 0 },
    { href: "/account", label: "Account", icon: User, badge: 0 },
    ...(userProfile?.role === "admin"
      ? [{ href: "/admin", label: "Admin", icon: Shield, badge: pendingCount }]
      : []),
  ];

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
              F
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-neutral-950 dark:text-neutral-50">
                  {APP_NAME}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                  {supabaseEnabled ? "Private Cloud" : "Local-First"}
                </span>
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/" ||
                    pathname.startsWith("/resume") ||
                    pathname.startsWith("/cover-letter")
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                  {item.badge > 0 && (
                    <span className="ml-0.5 inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center">
            <SaveStatusIndicator />
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-neutral-500 font-medium bg-neutral-50 dark:bg-neutral-800/60 px-2.5 py-1 rounded-full border border-neutral-200/60 dark:border-neutral-700/60">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{userProfile ? userProfile.email : "Private & Offline"}</span>
          </div>

          {/* Dark / Light Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Toggle light / dark mode"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-neutral-600" />
            )}
          </button>

          {supabaseEnabled && userProfile && (
            <button
              type="button"
              onClick={handleSignOut}
              className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
