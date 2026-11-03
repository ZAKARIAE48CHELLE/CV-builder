import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "./lib/supabase/client";

const PUBLIC_PATHS = ["/login", "/signup", "/pending", "/blocked"];

export async function proxy(request: NextRequest) {
  // Local mode: if Supabase env vars are not set, allow all routes unchanged
  const cfg = getSupabasePublicConfig();
  if (!cfg) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Skip static assets and API routes (API routes enforce their own auth checks)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    cfg.url,
    cfg.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isStatusPage = pathname === "/pending" || pathname === "/blocked";

  if (!user) {
    if (PUBLIC_PATHS.includes(pathname)) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Fetch profile status & role
  const { data: profile } = await supabase
    .from("profiles")
    .select("status, role")
    .eq("id", user.id)
    .single();

  const status = profile?.status || "pending";
  const role = profile?.role || "member";

  if (status === "pending") {
    if (pathname !== "/pending") {
      const url = request.nextUrl.clone();
      url.pathname = "/pending";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (status === "blocked") {
    if (pathname !== "/blocked") {
      const url = request.nextUrl.clone();
      url.pathname = "/blocked";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // User is approved: redirect away from login/signup/pending/blocked
  if (isAuthPage || isStatusPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Protect /admin for admins only
  if (pathname.startsWith("/admin") && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

