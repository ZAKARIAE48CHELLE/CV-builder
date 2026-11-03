import { AppSettings } from "../schema";

export interface AiRequestOptions {
  action: "improve_bullet" | "generate_summary" | "tailor_to_job" | "grammar_check" | "translate" | "draft_cover_letter" | "parse_resume";
  prompt?: string;
  context?: string;
  targetRole?: string;
  jobDescription?: string;
  targetLanguage?: string;
}

export interface AiResponse {
  success: boolean;
  result?: any;
  error?: string;
}

export async function callAiApi(options: AiRequestOptions, settings: AppSettings): Promise<AiResponse> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      options,
      settings: {
        aiProvider: settings.aiProvider,
        aiApiKey: settings.aiApiKey,
        aiModel: settings.aiModel,
        aiCustomEndpoint: settings.aiCustomEndpoint,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    return {
      success: false,
      error: errorData.error || `HTTP error ${response.status}`,
    };
  }

  return response.json();
}
