/**
 * Strict HTML sanitizer for TipTap user content.
 * Allowed tags: p, ul, ol, li, strong, b, em, i, br, a[href]
 * Links are restricted to http(s):// and mailto: protocols and forced to have rel="noopener noreferrer" target="_blank".
 */
const ALLOWED_TAGS = new Set(["p", "ul", "ol", "li", "strong", "b", "em", "i", "br", "a"]);

export function sanitizeRichHtml(dirtyHtml?: string | null): string {
  if (!dirtyHtml || typeof dirtyHtml !== "string") return "";

  // Remove script, style, iframe, object, embed, form, svg, math blocks completely including content
  let cleaned = dirtyHtml
    .replace(/<(script|style|iframe|object|embed|form|svg|math|head|meta|link)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|svg|math|head|meta|link)[^>]*\/?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Process all HTML tags
  cleaned = cleaned.replace(/<\/?([a-zA-Z0-9-]+)([^>]*)>/g, (match, rawTagName: string, rawAttrs: string) => {
    const tag = rawTagName.toLowerCase();
    const isClosing = match.startsWith("</");

    if (!ALLOWED_TAGS.has(tag)) {
      return "";
    }

    if (isClosing) {
      if (tag === "br") return "";
      const normalizedClose = tag === "b" ? "strong" : tag === "i" ? "em" : tag;
      return `</${normalizedClose}>`;
    }

    if (tag === "br") {
      return "<br />";
    }

    const normalizedOpen = tag === "b" ? "strong" : tag === "i" ? "em" : tag;

    if (normalizedOpen === "a") {
      // Extract href attribute safely
      const hrefMatch = rawAttrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/i);
      const rawHref = (hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "").trim();

      // Allow only http://, https://, or mailto:
      const decodedHref = rawHref.replace(/[\u0000-\u001F\u007F-\u009F\s]+/g, "");
      const isSafeUrl = /^(https?:\/\/|mailto:)/i.test(decodedHref);

      if (!isSafeUrl) {
        return "<a>";
      }

      const escapedHref = decodedHref
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      return `<a href="${escapedHref}" target="_blank" rel="noopener noreferrer">`;
    }

    return `<${normalizedOpen}>`;
  });

  return cleaned;
}

