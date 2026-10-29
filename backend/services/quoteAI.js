import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing from backend/.env");
}

const ai = new GoogleGenAI({ apiKey });

const quoteThemes = [
  "discipline",
  "resilience",
  "strength",
  "mindfulness",
  "growth",
];

export async function generateDailyQuote() {
  const prompt = `
You are the daily motivation assistant for Ascend,
a fitness and habit-tracking application.

Generate one short, original, memorable motivational quote.

The quote should be relevant to fitness, consistency,
discipline, resilience, recovery, or personal growth.

Return valid JSON only with exactly these fields:
{
  "quote": "string",
  "author": "Ascend AI",
  "theme": "discipline"
}

RULES:
1. Write an original quote, not a fabricated quotation
   attributed to a real person.
2. Set author to "Ascend AI".
3. Select exactly one theme from:
   ${quoteThemes.join(", ")}
4. Select the theme based on the meaning and emotion
   of the quote.
5. Keep the quote concise, ideally under 25 words.
6. Do not include Markdown or explanations.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty quote response.");
  }

  let result;

  try {
    result = JSON.parse(response.text);
  } catch {
    throw new Error("Gemini returned invalid quote JSON.");
  }

  if (
    typeof result.quote !== "string" ||
    !result.quote.trim() ||
    result.quote.length > 300 ||
    result.author !== "Ascend AI" ||
    !quoteThemes.includes(result.theme)
  ) {
    throw new Error("Gemini returned an invalid quote.");
  }

  return {
    quote: result.quote.trim(),
    author: result.author,
    theme: result.theme,
  };
}