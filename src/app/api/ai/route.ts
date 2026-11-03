import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  checkAiPayloadSize,
  checkPerUserRateLimit,
  checkDailySharedQuota,
} from "@/lib/ai/quota";

const STRICT_SYSTEM_RULE = `You are a professional resume strategist and ATS optimization expert.
CRITICAL CONSTRAINT: You must NEVER fabricate or invent employers, dates, degrees, credentials, or arbitrary metrics.
Use ONLY facts present in the provided resume context.
If a quantified metric would strengthen an accomplishment bullet but is unknown, use clear placeholder brackets such as "[X%]" or "[increased by $Y]".
Return clean, precise responses formatted strictly as requested.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { options, settings } = body;

    // 1. Cap request body size (~30 KB of resume + job text)
    const sizeCheck = checkAiPayloadSize(
      options?.context || "",
      options?.jobDescription || "",
      options?.prompt || ""
    );
    if (!sizeCheck.allowed) {
      return NextResponse.json(
        { success: false, error: sizeCheck.error },
        { status: 413 }
      );
    }

    let provider = settings?.aiProvider || "gemini";
    let apiKey =
      settings?.aiApiKey?.trim() || (provider === "ollama" ? "ollama" : "");
    let model =
      settings?.aiModel ||
      (provider === "gemini"
        ? "gemini-2.0-flash"
        : provider === "ollama"
        ? "llama3"
        : "gpt-4o-mini");

    // 2. Multi-user Auth, Approval, Rate Limit, and Shared Key Quota checks when Supabase is configured
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        return NextResponse.json(
          { success: false, error: "Authentication required." },
          { status: 401 }
        );
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("status, ai_shared_key_allowed")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile || profile.status !== "approved") {
        return NextResponse.json(
          { success: false, error: "Account not approved." },
          { status: 403 }
        );
      }

      const rateCheck = checkPerUserRateLimit(user.id);
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { success: false, error: rateCheck.error },
          { status: 429 }
        );
      }

      // If no personal BYOK key was provided, check if user is allowed to use the server's shared key
      if (!apiKey) {
        if (profile.ai_shared_key_allowed && process.env.AI_API_KEY) {
          const dailyLimit = Number(process.env.AI_DAILY_LIMIT_PER_USER || 30);
          const { data: callsToday, error: rpcErr } = await supabase.rpc(
            "increment_ai_usage"
          );

          if (rpcErr) {
            return NextResponse.json(
              { success: false, error: "Failed to verify AI usage quota." },
              { status: 500 }
            );
          }

          const quotaCheck = checkDailySharedQuota(Number(callsToday || 1), dailyLimit);
          if (!quotaCheck.allowed) {
            return NextResponse.json(
              { success: false, error: quotaCheck.error },
              { status: 429 }
            );
          }

          provider = process.env.AI_PROVIDER || "gemini";
          apiKey = process.env.AI_API_KEY;
          model =
            process.env.AI_MODEL ||
            (provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini");
        }
      }
    } else {
      // Local mode rate limit by IP or fallback key
      const rateCheck = checkPerUserRateLimit("local-user");
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { success: false, error: rateCheck.error },
          { status: 429 }
        );
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No API key configured. Please add your personal API key in Account / Settings.",
        },
        { status: 400 }
      );
    }

    const systemPrompt = STRICT_SYSTEM_RULE;
    let userPrompt = "";

    switch (options?.action) {
      case "improve_bullet":
        userPrompt = `Improve the following bullet point from a resume. Make it active, impact-driven, quantifiable, and ATS-optimized using the Google XYZ formula ("Accomplished [X] as measured by [Y], by doing [Z]").
Original Bullet: "${options.prompt}"
Context: ${options.context || "General"}
Return your response as JSON in this format:
{
  "improved": "the rewritten bullet",
  "explanation": "brief note on what was improved"
}`;
        break;

      case "generate_summary":
        userPrompt = `Generate a compelling, concise 3-4 sentence professional summary for this resume.
Target Role: "${options.targetRole || "Senior Professional"}"
Resume Experience & Skills Context:
${options.context || ""}
Return your response as JSON in this format:
{
  "summary": "the professional summary paragraph"
}`;
        break;

      case "tailor_to_job":
        userPrompt = `Analyze this resume against the following job description. Identify missing keywords, skills to emphasize, and concrete suggestions for existing sections.
Job Description:
${options.jobDescription}

Resume Context:
${options.context}

Return your response as JSON in this format:
{
  "missingKeywords": ["keyword1", "keyword2"],
  "matchedKeywords": ["keyword3"],
  "suggestions": [
    { "section": "Section name", "advice": "Specific recommendation without fabricating experience" }
  ]
}`;
        break;

      case "grammar_check":
        userPrompt = `Review the text of this resume for grammatical issues, spelling errors, passive voice, or awkward phrasing.
Resume Text:
${options.context}

Return your response as JSON:
{
  "issues": [
    { "original": "text with issue", "suggestion": "corrected text", "reason": "why this is better" }
  ],
  "overallAssessment": "brief evaluation"
}`;
        break;

      case "translate":
        userPrompt = `Translate the provided resume text into ${options.targetLanguage || "Spanish"}.
Maintain professional terminology and exact format.
Resume Content:
${options.context}

Return your response as JSON with the translated fields.`;
        break;

      case "draft_cover_letter":
        userPrompt = `Draft a high-impact, persuasive cover letter tailored to the following company and job description based strictly on the candidate's actual resume experience.
Target Role: ${options.targetRole || "Role"}
Job Description:
${options.jobDescription || ""}
Candidate Resume Context:
${options.context || ""}

Return your response as JSON:
{
  "coverLetter": "<p>Dear Hiring Team,</p><p>...</p>"
}`;
        break;

      case "parse_resume":
        userPrompt = `Extract the candidate's resume content from the provided raw text into strict JSON matching this exact structure:
{
  "personal": {
    "fullName": "Candidate full name",
    "jobTitle": "Candidate professional headline/title",
    "email": "Email or empty",
    "phone": "Phone number or empty",
    "location": "City, State/Country or empty",
    "website": "Website URL or empty",
    "linkedin": "LinkedIn profile URL or empty",
    "github": "GitHub profile URL or empty"
  },
  "sections": [
    {
      "type": "summary|experience|education|skills|projects|languages|certifications|awards|custom",
      "heading": "Section heading (e.g. Work Experience, Education, Technical Skills)",
      "column": "main or side",
      "items": [
        {
          "title": "Role title, degree, or skill category name",
          "subtitle": "Company name, school name, or organization",
          "location": "Location or empty",
          "startDate": "Start date (YYYY or YYYY-MM) or empty",
          "endDate": "End date (YYYY, YYYY-MM, or Present) or empty",
          "description": "<p>Overview or</p><ul><li>Achievement bullet point</li></ul>",
          "tags": ["skill1", "skill2"]
        }
      ]
    }
  ]
}

CRITICAL RULES:
1. Do NOT invent dates or employers. Use ONLY facts found in the text.
2. For "projects", extract EVERY project as a separate distinct item with its own title, dates/subtitle, and bullet points. Never lump multiple projects into a single item.
3. For "skills", split into distinct items by category (e.g., "Languages", "Frameworks", "Databases", "DevOps") where "tags" is an array of individual skill strings (e.g. ["Python", "SQL"]). Never lump all skills into a single string.
4. For "experience" and "education", create separate items for each job position or academic degree.
5. Return ONLY valid parseable JSON. Do not write introductory or concluding remarks.

Resume Raw Text:
${options.context || ""}`;
        break;

      default:
        userPrompt = options?.prompt || "";
    }

    let rawOutput = "";

    if (provider === "gemini") {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\nTask:\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 4096,
            temperature: 0.25,
          },
        }),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        return NextResponse.json(
          { success: false, error: `Gemini API error: ${errText}` },
          { status: geminiRes.status }
        );
      }

      const geminiData = await geminiRes.json();
      rawOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (provider === "ollama") {
      const ollamaBase = (settings?.aiCustomEndpoint || settings?.ollamaUrl || "http://localhost:11434")
        .replace(/\/v1.*$/, "")
        .replace(/\/api.*$/, "")
        .replace(/\/+$/, "");
      const ollamaUrl = `${ollamaBase}/api/chat`;

      const ollamaRes = await fetch(ollamaUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model || "qwen3:8b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: false,
          format: "json",
          think: false,
          options: {
            temperature: 0.2,
          },
        }),
      });

      if (!ollamaRes.ok) {
        const errText = await ollamaRes.text();
        return NextResponse.json(
          { success: false, error: `Ollama error: ${errText}` },
          { status: ollamaRes.status }
        );
      }

      const ollamaData = await ollamaRes.json();
      rawOutput = ollamaData.message?.content || "";
    } else {
      const endpoint =
        settings?.aiCustomEndpoint ||
        (provider === "groq"
          ? "https://api.groq.com/openai/v1/chat/completions"
          : "https://api.openai.com/v1/chat/completions");

      const aiRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 4096,
          temperature: 0.3,
        }),
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        return NextResponse.json(
          { success: false, error: `AI provider error: ${errText}` },
          { status: aiRes.status }
        );
      }

      const aiData = await aiRes.json();
      rawOutput = aiData.choices?.[0]?.message?.content || "";
    }

    let parsedResult: unknown = rawOutput;
    try {
      const jsonMatch =
        rawOutput.match(/```json\s*([\s\S]*?)\s*```/) ||
        rawOutput.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[1]);
      } else {
        parsedResult = JSON.parse(rawOutput);
      }
    } catch {
      // keep raw string if not JSON
    }

    return NextResponse.json({
      success: true,
      result: parsedResult,
    });
  } catch (error: any) {
    console.error("AI route handler failure:", error?.message || "Unknown error");
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
