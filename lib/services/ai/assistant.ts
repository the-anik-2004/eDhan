import { Budget } from "../budgets.services";
import { Transaction } from "../transactions.services";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent";

export async function askAssistant(
  question: string,
  transactions: Transaction[],
  budget: Budget | null,
  currency: string
) {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing EXPO_PUBLIC_GEMINI_API_KEY");

  const prompt = `You are a personal finance assistant.
Currency: ${currency}
Monthly budget: ${budget ? String(budget.amount) : "not set"}
Transactions: ${JSON.stringify(transactions)}

Answer the user's question briefly and accurately using only the supplied data.
Question: ${question}`;

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${await response.text()}`);
  }

  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) throw new Error("No response from Gemini");
  return reply as string;
}
