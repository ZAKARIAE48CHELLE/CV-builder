import { getSupabaseBrowserClient, isSupabaseConfigured } from "../supabase/client";

const BUCKET_NAME = "user-files";
export const STORAGE_PATH_PREFIX = "storage://user-files/";

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export function isStoragePath(value?: string): boolean {
  return Boolean(value && value.startsWith(STORAGE_PATH_PREFIX));
}

export function extractStorageObjectPath(value: string): string {
  return value.replace(STORAGE_PATH_PREFIX, "");
}

/**
 * Upload a user photo (<= 2MB, jpeg/png/webp) to Supabase Storage if configured,
 * or return a base64 data URL in local mode.
 */
export async function uploadUserPhoto(file: File): Promise<string> {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Photo must be 2 MB or smaller.");
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only JPEG, PNG, and WebP images are allowed.");
  }

  if (!isSupabaseConfigured()) {
    return fileToDataUrl(file);
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return fileToDataUrl(file);

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return fileToDataUrl(file);
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const objectPath = `${authData.user.id}/photos/${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(objectPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw new Error(`Failed to upload photo: ${error.message}`);
  }

  return `${STORAGE_PATH_PREFIX}${objectPath}`;
}

/**
 * Upload a data URL photo (from local IndexedDB migration) into Supabase Storage
 * and return the storage:// reference.
 */
export async function uploadDataUrlPhotoToStorage(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith("data:image/")) return dataUrl;
  if (!isSupabaseConfigured()) return dataUrl;

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return dataUrl;

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return dataUrl;

  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    if (blob.size > 2 * 1024 * 1024) {
      console.warn("Skipping photo upload > 2MB during migration");
      return "";
    }
    const ext = blob.type.split("/")[1] || "png";
    const objectPath = `${authData.user.id}/photos/migrated-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(objectPath, blob, {
        contentType: blob.type,
        upsert: false,
      });

    if (error) {
      console.warn("Could not upload data URL photo to storage:", error.message);
      return "";
    }

    return `${STORAGE_PATH_PREFIX}${objectPath}`;
  } catch {
    return "";
  }
}

/**
 * Upload an imported resume document (<= 10MB) to `<user_id>/imports/<file>` when in Supabase mode.
 */
export async function uploadImportedFile(file: File): Promise<string | null> {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Imported file must be 10 MB or smaller.");
  }

  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${authData.user.id}/imports/${Date.now()}-${cleanFileName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(objectPath, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (error) {
    console.warn("Import file archive upload skipped:", error.message);
    return null;
  }

  return `${STORAGE_PATH_PREFIX}${objectPath}`;
}

/**
 * Resolve a photo reference (`storage://user-files/...` or `data:image/...` or `https://...`)
 * to a short-lived signed URL for HTML preview display.
 */
export async function resolvePhotoSignedUrl(photoRef?: string): Promise<string | undefined> {
  if (!photoRef) return undefined;
  if (!isStoragePath(photoRef)) return photoRef;

  const objectPath = extractStorageObjectPath(photoRef);
  const now = Date.now();
  const cached = signedUrlCache.get(objectPath);
  if (cached && cached.expiresAt > now + 30_000) {
    return cached.url;
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return undefined;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(objectPath, 3600); // 1 hour signed URL

  if (error || !data?.signedUrl) {
    console.warn("Failed to create signed URL for photo:", error?.message);
    return undefined;
  }

  signedUrlCache.set(objectPath, {
    url: data.signedUrl,
    expiresAt: now + 3600 * 1000,
  });

  return data.signedUrl;
}

/**
 * Resolve a photo reference into a base64 Data URL so that PDF generation
 * embeds the raw image bytes and never contains an expiring URL.
 */
export async function resolvePhotoBytesForPdf(photoRef?: string): Promise<string | undefined> {
  if (!photoRef) return undefined;
  if (photoRef.startsWith("data:image/")) return photoRef;

  try {
    let fetchUrl = photoRef;
    if (isStoragePath(photoRef)) {
      const signed = await resolvePhotoSignedUrl(photoRef);
      if (!signed) return undefined;
      fetchUrl = signed;
    }

    const res = await fetch(fetchUrl);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  } catch (e) {
    console.warn("Could not fetch photo bytes for PDF:", e);
    return undefined;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return blobToDataUrl(file);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

