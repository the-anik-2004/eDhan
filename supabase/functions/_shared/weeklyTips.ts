export { escapeHtml } from "./html.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TIP_WORDS = 20;
const MAX_TIP_CHARACTERS = 280;

export type WeeklyWindow = {
  periodStart: string;
  periodEnd: string;
};

export function getWeeklyWindow(now = new Date()): WeeklyWindow {
  // Transactions are saved by the app as YYYY-MM-DD. Use UTC calendar dates so
  // this range is stable regardless of the Edge Function's execution region.
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const periodStart = new Date(periodEnd.getTime() - 7 * DAY_MS);

  return {
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10),
  };
}

function isTip(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const normalized = value.trim();
  return (
    normalized.length > 0 &&
    normalized.length <= MAX_TIP_CHARACTERS &&
    normalized.split(/\s+/).length <= MAX_TIP_WORDS
  );
}

export function parseGeminiTips(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    throw new Error("Gemini returned an invalid response");
  }

  const tips = (payload as { tips?: unknown }).tips;
  if (!Array.isArray(tips) || tips.length < 2 || tips.length > 4 || !tips.every(isTip)) {
    throw new Error("Gemini returned invalid tips");
  }

  const normalizedTips = tips.map((tip) => tip.trim());
  if (new Set(normalizedTips.map((tip) => tip.toLocaleLowerCase())).size !== normalizedTips.length) {
    throw new Error("Gemini returned duplicate tips");
  }

  return normalizedTips;
}

export function toSafeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";
  return message.replace(/[\r\n\t]+/g, " ").slice(0, 500);
}
