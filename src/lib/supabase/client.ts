import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export function getSupabasePublicConfig(): { url: string; anonKey: string } | null {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  ).trim();
  const anonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();

  if (!url || !anonKey) return null;
  if (
    url === "https://xxxxxxxxxxxx.supabase.co" ||
    anonKey === "your-anon-key" ||
    anonKey === "eyJhbGciOi..."
  ) {
    return null;
  }
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicConfig() !== null;
}

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const cfg = getSupabasePublicConfig();
  if (!cfg) return null;
  if (typeof window === "undefined") return null;

  if (!browserClient) {
    browserClient = createBrowserClient(cfg.url, cfg.anonKey);
  }
  return browserClient;
}
