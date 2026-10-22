
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing from backend/.env");
}

const ai = new GoogleGenAI({ apiKey });

// These keys must match the Nutrient records in the database.
const nutrientKeys = [
  "vitamin_a",
  "vitamin_c",
  "vitamin_d",
  "vitamin_e",
  "vitamin_k",
  "vitamin_b1",
  "vitamin_b2",
  "vitamin_b3",
  "vitamin_b5",
  "vitamin_b6",
  "vitamin_b7",
  "vitamin_b9",
  "vitamin_b12",
  "calcium",
  "iron",
  "magnesium",
  "zinc",
  "selenium",
  "potassium",
  "sodium",
  "phosphorus",
  "iodine",
  "copper",
  "manganese",
  "choline",
  "fiber",
  "omega_3",
];

export async function analyzeFood(description) {
 

const prompt = `
You are a nutrition analysis assistant for Ascend.

Analyze the user's input and return valid JSON only.

The input may describe:
- Ordinary food, such as "3 eggs and 2 slices of bread".
- Supplements, such as "1 scoop whey protein".
- Explicit nutrient amounts, such as "125 mcg vitamin D and 110 mcg vitamin K".
- A combination of foods and supplements.

RULES:

1. Return JSON with exactly this top-level structure:
{
  "items": [
    {
      "name": "string",
      "mealType": "BREAKFAST",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "source": "FOOD",
      "micronutrients": [
        {
          "key": "vitamin_d",
          "amount": 125
        }
      ]
    }
  ],
  "assumptions": [],
  "note": ""
}

2. Use "items", not "foods". Use "name", not "foodName".

3. For ordinary food, estimate calories, protein, carbs and fat
   using reasonable serving-size assumptions.

4. Estimate food micronutrients only when reasonably supported.
   Omit unknown micronutrients instead of inventing amounts or treating
   missing data as zero.

5. For explicit nutrient amounts:
   - Preserve the quantity the user specifies.
   - Convert vitamin D using 1 mcg = 40 IU.
   - Store vitamin D in mcg.
   - Store each nutrient using its canonical unit listed below.
   - Do not invent calories or macros for isolated vitamins or minerals.
   - Use zero macros when the entry contains only isolated nutrients.
   - Set source to "SUPPLEMENT" when the user describes taking a
     supplement or vitamin product.
   - For explicitly stated nutrients that are not supplements, use
     source "FOOD" to maintain compatibility with the current API.

6. Supported nutrient keys and units:
   vitamin_a: mcg
   vitamin_c: mg
   vitamin_d: mcg
   vitamin_e: mg
   vitamin_k: mcg
   vitamin_b1: mg
   vitamin_b2: mg
   vitamin_b3: mg
   vitamin_b5: mg
   vitamin_b6: mg
   vitamin_b7: mcg
   vitamin_b9: mcg
   vitamin_b12: mcg
   calcium: mg
   iron: mg
   magnesium: mg
   zinc: mg
   selenium: mcg
   potassium: mg
   sodium: mg
   phosphorus: mg
   iodine: mcg
   copper: mg
   manganese: mg
   choline: mg
   fiber: g
   omega_3: mg

7. The "source" must be either "FOOD" or "SUPPLEMENT".

8. The mealType must be one of:
   "BREAKFAST", "LUNCH", "DINNER", "SNACK".

9. Return one item per distinct food or supplement when practical.
   When input combines foods and supplements, process each separately.

10. Never invent a supplement dosage that the user has not supplied.
    If the input is ambiguous, explain this in "note".

The user's input is:
${description}
`;

;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty response.");
  }

  let result;

  try {
    result = JSON.parse(response.text);
  } catch {
    throw new Error("Gemini returned invalid JSON.");
  }

  if (!result || !Array.isArray(result.items)) {
    throw new Error("Gemini returned an unexpected nutrition response.");
  }

  for (const item of result.items) {
    if (typeof item.name !== "string" || !item.name.trim()) {
      throw new Error("Gemini returned an invalid food name.");
    }

    for (const key of ["calories", "protein", "carbs", "fat"]) {
      if (
        typeof item[key] !== "number" ||
        !Number.isFinite(item[key]) ||
        item[key] < 0
      ) {
        throw new Error("Gemini returned invalid nutrition values.");
      }
    }

    if (
      item.micronutrients !== undefined &&
      !Array.isArray(item.micronutrients)
    ) {
      throw new Error("Gemini returned invalid micronutrients.");
    }

    const seenKeys = new Set();

    for (const nutrient of item.micronutrients ?? []) {
      if (
        !nutrient ||
        typeof nutrient.key !== "string" ||
        !nutrientKeys.includes(nutrient.key) ||
        seenKeys.has(nutrient.key) ||
        typeof nutrient.amount !== "number" ||
        !Number.isFinite(nutrient.amount) ||
        nutrient.amount < 0
      ) {
        throw new Error("Gemini returned invalid micronutrient data.");
      }

      seenKeys.add(nutrient.key);
    }

    // Normalize missing nutrient arrays for frontend compatibility.
    item.micronutrients ??= [];
  }

  return {
    items: result.items,
    assumptions: Array.isArray(result.assumptions)
      ? result.assumptions
      : [],
    note: typeof result.note === "string" ? result.note : "",
  };
}
