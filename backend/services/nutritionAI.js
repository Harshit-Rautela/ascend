
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing from backend/.env");
}

const ai = new GoogleGenAI({ apiKey });

export async function analyzeFood(description) {
  const prompt = `
You are a food nutrition estimation assistant.

Estimate the nutrition of the food described below.
Account for the stated quantity and typical preparation method.
If the quantity is vague, make a reasonable assumption and state it.
Do not claim these are exact measurements.

Return ONLY valid JSON with this structure:
{
  "items": [
    {
      "name": "Food name with estimated portion",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0
    }
  ],
  "assumptions": ["Portion-size assumptions"],
  "note": "Short uncertainty note"
}

Rules:
- Include one item per distinct food.
- Nutrition values must be non-negative numbers.
- Calories are kcal; protein, carbs and fat are grams.
- Estimate the food actually described. Do not invent additional foods.
- If the description is not food, explain that in the note and return an empty items array.
- Keep the estimates realistic for the stated portions.

Food description: ${description}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });
  console.log("\n========== GEMINI AI RESPONSE ==========");
  console.log("Raw response text:");
  console.log(response.text);
  console.log("========================================\n");

  const result = JSON.parse(response.text);

  if (!result || !Array.isArray(result.items)) {
    throw new Error("Gemini returned an unexpected nutrition response.");
  }

  for (const item of result.items) {
    for (const key of ["calories", "protein", "carbs", "fat"]) {
      if (
        typeof item[key] !== "number" ||
        !Number.isFinite(item[key]) ||
        item[key] < 0
      ) {
        throw new Error("Gemini returned invalid nutrition values.");
      }
    }

    if (typeof item.name !== "string" || !item.name.trim()) {
      throw new Error("Gemini returned an invalid food name.");
    }
  }

  return {
    items: result.items,
    assumptions: Array.isArray(result.assumptions)
      ? result.assumptions
      : [],
    note: typeof result.note === "string" ? result.note : "",
  };
}
