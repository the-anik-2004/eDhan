// Scheduled weekly by a Supabase gateway-authenticated cron job. The delivery
// ledger migration makes retries safe; see scripts/cron_jobs.sql.
import { getCategoryConfig, type CategoryKey } from "../_shared/categories.ts";
import { wrapEmail } from "../_shared/emailLayout.ts";
import { sendEmail } from "../_shared/resend.ts";
import { createSupabaseAccount } from "../_shared/supabase.admin.ts";
import {
  escapeHtml,
  getWeeklyWindow,
  parseGeminiTips,
  toSafeErrorMessage,
} from "../_shared/weeklyTips.ts";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    tips: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
  },
  required: ["tips"],
};

function isAuthorizedCronRequest(request: Request): boolean {
  const expectedSecret = Deno.env.get("WEEKLY_TIPS_CRON_SECRET");

  if (!expectedSecret) {
    // Never run a privileged, all-user mailer if its second auth factor was
    // accidentally omitted from the deployed function secrets.
    console.error("weekly-tips: Missing WEEKLY_TIPS_CRON_SECRET");
    return false;
  }

  return request.headers.get("x-weekly-tips-cron-secret") === expectedSecret;
}

function getAmount(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    throw new Error("Transaction contains an invalid amount");
  }
  return amount;
}

async function generateTips(
  currency: string,
  byCategory: Record<string, number>,
  totalExpense: number,
  totalIncome: number
) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const breakdown = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => `${category}: ${amount.toFixed(2)} ${currency}`)
    .join(", ");

  const prompt = `You are a friendly personal finance coach. Based on this user's last 7 days of activity, write 2-4 short, specific, actionable tips (max 20 words each) to help them save money or manage their finances better. Be encouraging, not preachy. Don't repeat generic advice like "make a budget" unless it's clearly relevant.

Total income this week: ${totalIncome.toFixed(2)} ${currency}
Total expenses this week: ${totalExpense.toFixed(2)} ${currency}
Spending by category: ${breakdown || "none"}`;

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini request failed: ${await res.text()}`);

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response from Gemini");

  try {
    return parseGeminiTips(JSON.parse(text));
  } catch (error) {
    throw new Error(`Gemini response validation failed: ${toSafeErrorMessage(error)}`);
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      headers: { Allow: "POST" },
      status: 405,
    });
  }

  // `verify_jwt = true` in config.toml makes the Supabase gateway perform its
  // API-key/JWT gate before this code runs. This separate secret prevents an
  // otherwise valid project credential from starting this privileged job.
  if (!isAuthorizedCronRequest(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createSupabaseAccount();

  const window = getWeeklyWindow();

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("clerk_id, email, name, currency");
  if (usersError) throw usersError;

  let sent = 0;
  let failed = 0;

  for (const user of users ?? []) {
    if (!user.email) continue;

    let claimed = false;

    try {
      // The app normally writes `transactions.date` as YYYY-MM-DD. The
      // half-open [start, end) range covers exactly seven UTC calendar dates
      // when the database column is the expected PostgreSQL `date` type.
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("type, amount, category")
        .eq("user_id", user.clerk_id)
        .gte("date", window.periodStart)
        .lt("date", window.periodEnd);
      if (txError) throw txError;
      if (!transactions || transactions.length === 0) continue;

      const { data: wasClaimed, error: claimError } = await supabase.rpc(
        "claim_weekly_tip_delivery",
        { p_period_start: window.periodStart, p_user_id: user.clerk_id },
      );
      if (claimError) throw claimError;
      if (!wasClaimed) continue;
      claimed = true;

      const totalExpense = transactions
        .filter((tx) => tx.type === "EXPENSE")
        .reduce((sum: number, tx) => sum + getAmount(tx.amount), 0);
      const totalIncome = transactions
        .filter((tx) => tx.type === "INCOME")
        .reduce((sum: number, tx) => sum + getAmount(tx.amount), 0);

      const byCategory: Record<string, number> = {};
      for (const tx of transactions) {
        if (tx.type !== "EXPENSE") continue;
        byCategory[tx.category] = (byCategory[tx.category] ?? 0) + getAmount(tx.amount);
      }

      const currency = user.currency ?? "USD";
      const safeCurrency = escapeHtml(currency);
      const tips = await generateTips(currency, byCategory, totalExpense, totalIncome);

      const net = totalIncome - totalExpense;
      const topCategories = Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, amount]) => {
          const label = getCategoryConfig(category as CategoryKey)?.label ?? category;
          return `<li style="padding:6px 0;color:#5C5F68;">${escapeHtml(label)}: <strong style="color:#1A1D26;">${amount.toFixed(2)} ${safeCurrency}</strong></li>`;
        })
        .join("");

      const subject = "Your Welth weekly recap & money tips";

      const html = wrapEmail(`
      <p style="margin:0 0 16px;">Hi ${escapeHtml(user.name ?? "there")},</p>
      <p style="margin:0 0 20px;">Here's your weekly recap from Welth — a quick look at the last 7 days, plus a few tips to help you make the most of the week ahead.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:10px 0;border-top:1px solid #E8E6DF;color:#5C5F68;">Income</td>
          <td style="padding:10px 0;border-top:1px solid #E8E6DF;text-align:right;font-weight:600;color:#3DDC84;">+${totalIncome.toFixed(2)} ${safeCurrency}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-top:1px solid #E8E6DF;color:#5C5F68;">Expenses</td>
          <td style="padding:10px 0;border-top:1px solid #E8E6DF;text-align:right;font-weight:600;color:#FF6B4A;">-${totalExpense.toFixed(2)} ${safeCurrency}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-top:1px solid #E8E6DF;color:#5C5F68;">Net</td>
          <td style="padding:10px 0;border-top:1px solid #E8E6DF;text-align:right;font-weight:600;">${net >= 0 ? "+" : ""}${net.toFixed(2)} ${safeCurrency}</td>
        </tr>
      </table>
      ${
        topCategories
          ? `<p style="margin:0 0 6px;font-weight:600;">Where it went</p>
             <ul style="margin:0 0 20px;padding-left:18px;list-style:none;">${topCategories}</ul>`
          : ""
      }
      <p style="margin:0 0 8px;font-weight:600;">Tips for you</p>
      <ol style="margin:0;padding-left:18px;">
        ${tips.map((tip) => `<li style="padding:4px 0;">${escapeHtml(tip)}</li>`).join("")}
      </ol>
      `);

      await sendEmail({
        to: user.email,
        subject,
        html,
        idempotencyKey: `weekly-tips/${user.clerk_id}/${window.periodStart}`,
      });

      const { error: sentError } = await supabase
        .from("weekly_tip_deliveries")
        .update({ last_error: null, sent_at: new Date().toISOString(), status: "sent" })
        .eq("period_start", window.periodStart)
        .eq("user_id", user.clerk_id);
      if (sentError) throw sentError;

      sent++;
    } catch (error) {
      failed++;
      console.error("weekly-tips: user processing failed", {
        error: toSafeErrorMessage(error),
        userId: user.clerk_id,
      });

      if (claimed) {
        const { error: markFailedError } = await supabase.rpc(
          "fail_weekly_tip_delivery",
          {
            p_error: toSafeErrorMessage(error),
            p_period_start: window.periodStart,
            p_user_id: user.clerk_id,
          },
        );
        if (markFailedError) {
          console.error("weekly-tips: could not mark delivery failed", {
            error: toSafeErrorMessage(markFailedError),
            userId: user.clerk_id,
          });
        }
      }
    }
  }

  return new Response(JSON.stringify({ failed, periodStart: window.periodStart, sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
