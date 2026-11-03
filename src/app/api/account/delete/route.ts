import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured on this server." },
      { status: 400 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Remove user's storage objects under `<user.id>/photos` and `<user.id>/imports`
  try {
    for (const folder of ["photos", "imports"]) {
      const { data: files } = await supabase.storage
        .from("user-files")
        .list(`${user.id}/${folder}`);
      if (files && files.length > 0) {
        const paths = files.map((f) => `${user.id}/${folder}/${f.name}`);
        await supabase.storage.from("user-files").remove(paths);
      }
    }
  } catch (e) {
    console.warn("Storage cleanup warning before account deletion:", e);
  }

  // Call the security definer RPC `delete_own_account()` which deletes `auth.users`
  // and cascades to profiles, resumes, cover_letters, jobs, style_presets, and ai_usage.
  const { error: rpcError } = await supabase.rpc("delete_own_account");
  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

