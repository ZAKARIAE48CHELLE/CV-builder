import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeFilename(name: string): string {
  return name
    .trim()
    .replace(/[^\w\s-]/gi, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

export function formatDate(
  dateString?: string,
  format: "MMM YYYY" | "MMMM YYYY" | "MM/YYYY" | "YYYY" | string = "MMM YYYY"
): string {
  if (!dateString) return "";
  const trimmed = dateString.trim();
  if (trimmed.toLowerCase() === "present" || trimmed.toLowerCase() === "current") {
    return "Present";
  }

  // Matches YYYY-MM or YYYY
  const parts = trimmed.split(/[-/]/);
  if (parts.length === 2) {
    const year = parts[0].length === 4 ? parts[0] : parts[1];
    const month = parts[0].length === 4 ? parts[1] : parts[0];
    const monthIndex = parseInt(month, 10) - 1;

    if (!isNaN(monthIndex) && monthIndex >= 0 && monthIndex <= 11) {
      if (format === "YYYY") return year;
      if (format === "MM/YYYY") return `${month.padStart(2, "0")}/${year}`;
      if (format === "MMMM YYYY") {
        const fullMonths = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        return `${fullMonths[monthIndex]} ${year}`;
      }
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[monthIndex]} ${year}`;
    }
  }

  // If already free text like "2022" or "Summer 2021"
  return trimmed;
}

export function htmlToPlainText(html: string): string {
  if (!html) return "";
  // Strip tags but maintain newlines for list items and paragraphs
  return html
    .replace(/<\/(li|p|div|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, " • ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}
