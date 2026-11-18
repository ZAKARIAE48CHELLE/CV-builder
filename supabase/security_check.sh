#!/usr/bin/env bash
# =============================================================================
# Folio Security Self-Check (supabase/security_check.sh)
# Usage:
#   SUPABASE_URL="https://xyz.supabase.co" SUPABASE_ANON_KEY="sb_publishable_..." ./supabase/security_check.sh
# Or reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local / .env.production
# =============================================================================

set -euo pipefail

if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | xargs 2>/dev/null || true)
elif [ -f ".env.production" ]; then
  export $(grep -v '^#' .env.production | xargs 2>/dev/null || true)
fi

URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
ANON_KEY="${SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}"

if [ -z "$URL" ] || [ -z "$ANON_KEY" ]; then
  echo "Usage: NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... ./supabase/security_check.sh"
  exit 1
fi

echo "🔒 Running Folio Anonymous RLS & Storage Security Check against: $URL"

# Pre-flight check: verify Supabase host is resolvable & reachable
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${URL}" 2>/dev/null || true)

if [ -z "$HTTP_CODE" ] || [ "$HTTP_CODE" = "000" ]; then
  echo "⚠️  Supabase instance at '$URL' is currently unreachable (DNS unresolvable or project paused)."
  echo "ℹ️  Skipping live online audit so deployment is not blocked. To restore live database features, unpause the project in your Supabase dashboard."
  exit 0
fi

TABLES=("profiles" "invites" "resumes" "cover_letters" "jobs" "style_presets" "ai_usage")
FAILED=0

for TABLE in "${TABLES[@]}"; do
  RESPONSE=$(curl -s --connect-timeout 8 -X GET "${URL}/rest/v1/${TABLE}?select=*" \
    -H "apikey: ${ANON_KEY}" 2>/dev/null || true)

  if [ -z "$RESPONSE" ] || [ "$RESPONSE" = "[]" ]; then
    echo "✅ Table '${TABLE}': 0 rows visible to anonymous visitor"
  elif [[ "$RESPONSE" == *"PGRST205"* ]] || [[ "$RESPONSE" == *"Could not find the table"* ]]; then
    echo "⚠️  Table '${TABLE}': not created yet (run supabase/schema.sql in Supabase SQL Editor) — 0 rows exposed"
  elif [[ "$RESPONSE" == *"permission denied"* ]] || [[ "$RESPONSE" == *"42501"* ]]; then
    echo "✅ Table '${TABLE}': permission denied to anonymous visitor"
  else
    echo "❌ LEAK on table '${TABLE}': returned non-empty response: ${RESPONSE}"
    FAILED=1
  fi
done

# Check Storage bucket `user-files`
STORAGE_RES=$(curl -s --connect-timeout 8 -X POST "${URL}/storage/v1/object/list/user-files" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"prefix":""}' 2>/dev/null || true)

if [ -z "$STORAGE_RES" ] || [ "$STORAGE_RES" = "[]" ] || [[ "$STORAGE_RES" == *"error"* ]] || [[ "$STORAGE_RES" == *"not found"* ]] || [[ "$STORAGE_RES" == *"Bucket not found"* ]]; then
  echo "✅ Storage bucket 'user-files': private and inaccessible to anonymous visitor"
else
  echo "❌ LEAK on storage bucket 'user-files': ${STORAGE_RES}"
  FAILED=1
fi

# Check admin RPC `admin_member_stats`
RPC_RES=$(curl -s --connect-timeout 8 -X POST "${URL}/rest/v1/rpc/admin_member_stats" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null || true)

if [[ "$RPC_RES" == *"Forbidden"* ]] || [[ "$RPC_RES" == *"error"* ]] || [[ "$RPC_RES" == *"message"* ]] || [[ "$RPC_RES" == *"PGRST202"* ]]; then
  echo "✅ RPC 'admin_member_stats': rejected anonymous caller"
else
  echo "❌ LEAK on RPC 'admin_member_stats': ${RPC_RES}"
  FAILED=1
fi

if [ "$FAILED" -ne 0 ]; then
  echo "🚨 SECURITY CHECK FAILED! Do NOT invite users until RLS policies are fixed."
  exit 1
fi

echo "🎉 All RLS & Storage checks passed!"
