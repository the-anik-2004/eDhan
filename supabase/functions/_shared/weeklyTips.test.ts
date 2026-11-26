import { escapeHtml } from "./html.ts";
import { getWeeklyWindow, parseGeminiTips } from "./weeklyTips.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("getWeeklyWindow returns a seven-day half-open date range", () => {
  const window = getWeeklyWindow(new Date("2026-11-23T03:30:00.000Z"));

  assert(window.periodStart === "2026-11-16", "uses the prior UTC calendar date");
  assert(window.periodEnd === "2026-11-23", "ends at today's UTC calendar date");
});

Deno.test("parseGeminiTips only accepts the constrained response schema", () => {
  const tips = parseGeminiTips({
    tips: ["Review recurring charges before they renew.", "Move this week's surplus to your savings goal."],
  });

  assert(tips.length === 2, "returns validated tips");

  for (const invalidPayload of [
    { tips: ["same", "same"] },
    { tips: ["only one tip"] },
    { tips: ["x".repeat(281), "another tip"] },
    {
      tips: [
        Array.from({ length: 21 }, (_, index) => `word${index}`).join(" "),
        "another tip",
      ],
    },
  ]) {
    let rejected = false;
    try {
      parseGeminiTips(invalidPayload);
    } catch {
      rejected = true;
    }
    assert(rejected, "rejects invalid model output");
  }
});

Deno.test("escapeHtml prevents dynamic email content from becoming markup", () => {
  assert(
    escapeHtml(`O'Connor & <img src=x onerror="alert(1)">`) ===
      "O&#39;Connor &amp; &lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    "escapes HTML-sensitive characters",
  );
});
