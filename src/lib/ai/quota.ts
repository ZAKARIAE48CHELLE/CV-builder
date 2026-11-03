const rateLimitWindowMap = new Map<string, number[]>();

export const MAX_AI_PAYLOAD_BYTES = 30 * 1024; // 30 KB
export const MAX_CALLS_PER_MINUTE = 10;

export function checkAiPayloadSize(contextText = "", jobDescription = "", prompt = ""): {
  allowed: boolean;
  bytes: number;
  error?: string;
} {
  const combined = `${contextText}${jobDescription}${prompt}`;
  const bytes = new TextEncoder().encode(combined).length;
  if (bytes > MAX_AI_PAYLOAD_BYTES) {
    return {
      allowed: false,
      bytes,
      error: `Request payload (${Math.round(bytes / 1024)} KB) exceeds the 30 KB limit.`,
    };
  }
  return { allowed: true, bytes };
}

export function checkPerUserRateLimit(
  userId: string,
  nowMs = Date.now(),
  maxCallsPerMin = MAX_CALLS_PER_MINUTE
): {
  allowed: boolean;
  remaining: number;
  error?: string;
} {
  const windowStart = nowMs - 60_000;
  const timestamps = (rateLimitWindowMap.get(userId) || []).filter((t) => t > windowStart);

  if (timestamps.length >= maxCallsPerMin) {
    rateLimitWindowMap.set(userId, timestamps);
    return {
      allowed: false,
      remaining: 0,
      error: `Rate limit exceeded (${maxCallsPerMin} AI requests per minute). Please wait a moment.`,
    };
  }

  timestamps.push(nowMs);
  rateLimitWindowMap.set(userId, timestamps);
  return {
    allowed: true,
    remaining: maxCallsPerMin - timestamps.length,
  };
}

export function checkDailySharedQuota(
  currentCallsToday: number,
  dailyLimit = 30
): {
  allowed: boolean;
  error?: string;
} {
  if (currentCallsToday > dailyLimit) {
    return {
      allowed: false,
      error: `Daily shared AI limit (${dailyLimit} calls/day) reached. Add a personal API key in Account settings to continue.`,
    };
  }
  return { allowed: true };
}

export function resetRateLimitForTest() {
  rateLimitWindowMap.clear();
}

