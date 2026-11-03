import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function ensureDbFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export async function GET() {
  // In multi-user Supabase mode, disable shared server file DB so each browser only checks its own IndexedDB
  if (isSupabaseConfigured()) {
    return NextResponse.json({ data: null });
  }

  try {
    ensureDbFile();
    if (!fs.existsSync(DB_FILE)) {
      return NextResponse.json({ data: null });
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return NextResponse.json({ data: parsed });
  } catch {
    return NextResponse.json({ data: null });
  }
}

export async function POST(req: Request) {
  if (isSupabaseConfigured()) {
    return NextResponse.json({ success: true, mode: "supabase" });
  }

  try {
    ensureDbFile();
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(body, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ success: false, reason: "Read-only filesystem" });
  }
}
