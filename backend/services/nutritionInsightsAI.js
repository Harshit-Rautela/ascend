
/*
 * ASCEND — NUTRITION AI SERVICE
 *
 * Gemini function-calling orchestration.
 *
 * Responsibilities:
 * 1. Understand nutrition questions.
 * 2. Select approved backend analytics tools.
 * 3. Execute tools through the nutrition tool executor.
 * 4. Return grounded natural-language responses.
 *
 * All calculations and database access remain in backend services.
 */

import { GoogleGenAI } from "@google/genai";

import { nutritionTools } from "./nutrition/ai/nutritionTools.js";

// import {
//     executeNutritionTool,
// } from "./nutrition/ai/nutritionToolExecutor.js";
import {
    executeNutritionTool as executeModularNutritionTool,
} from "./nutrition/ai/nutritionToolExecutor.js";

// Preserve existing food-history functionality until it is
// migrated into the modular analytics architecture.
import {
    getFoodHistory,
} from "./nutritionAnalyticsService.js";


/* =========================================
   GEMINI CLIENT
========================================= */

function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing.");
    }

    return new GoogleGenAI({ apiKey });
}


/* =========================================
   GEMINI MODEL FAILOVER
========================================= */

const DEFAULT_GEMINI_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
];

function getGeminiModels() {
    const configuredModels = process.env.GEMINI_MODELS
        ?.split(",")
        .map(model => model.trim())
        .filter(Boolean);

    return configuredModels?.length
        ? [...new Set(configuredModels)]
        : DEFAULT_GEMINI_MODELS;
}

function isRetryableGeminiError(error) {
    const status = Number(
        error.status ??
        error.statusCode ??
        error.code
    );

    const message = String(error.message || "").toLowerCase();

    if ([408, 429, 500, 502, 503, 504].includes(status)) {
        return true;
    }

    if (
        message.includes("resource_exhausted") ||
        message.includes("too many requests") ||
        message.includes("service unavailable") ||
        message.includes("deadline_exceeded") ||
        message.includes("internal error") ||
        message.includes("timed out") ||
        message.includes("timeout") ||
        message.includes("econnreset") ||
        message.includes("econnrefused") ||
        message.includes("enotfound")
    ) {
        return true;
    }

    if (status === 404) {
        return true;
    }

    return false;
}

async function generateWithGeminiFallback(ai, request) {
    const models = getGeminiModels();

    let lastError;

    for (const model of models) {
        try {
            console.log(`[Nutrition AI] Trying model: ${model}`);

            const response = await ai.models.generateContent({
                ...request,
                model,
            });

            console.log(`[Nutrition AI] Model succeeded: ${model}`);

            return response;

        } catch (error) {
            lastError = error;

            console.error(
                `[Nutrition AI] Model failed: ${model}`,
                {
                    status: error.status ?? error.statusCode ?? error.code,
                    message: error.message,
                }
            );

            if (!isRetryableGeminiError(error)) {
                throw error;
            }

            console.warn(
                `[Nutrition AI] Switching from ${model} to the next model.`
            );
        }
    }

    console.error("[Nutrition AI] All configured Gemini models failed.");

    throw new Error(
        `All Gemini models are currently unavailable. Last error: ${
            lastError?.message || "Unknown Gemini error"
        }`
    );
}


/* =========================================
   DATE AWARENESS
========================================= */

function getCurrentDate() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}


/* =========================================
   LEGACY FOOD HISTORY TOOL
========================================= */

const foodHistoryTool = {
    name: "get_food_history",

    description:
        "Retrieve individual food records, including food name, meal type, calories, protein, carbs, and fat. Use for specific dates or food history. Maximum range is 60 days.",

    parametersJsonSchema: {
        type: "object",

        properties: {
            startDate: {
                type: "string",
                description: "Optional start date in YYYY-MM-DD format.",
            },

            endDate: {
                type: "string",
                description: "Optional end date in YYYY-MM-DD format.",
            },
        },
    },
};

const availableNutritionTools = [
    ...nutritionTools,
    {
        functionDeclarations: [foodHistoryTool],
    },
];


/* =========================================
   SYSTEM INSTRUCTION
========================================= */

function getSystemInstruction() {
    const currentDate = getCurrentDate();

    return `
You are Ascend's personal Nutrition AI assistant.

CURRENT DATE: ${currentDate}
TIMEZONE: Asia/Kolkata (IST)


DATE HANDLING RULES:

1. Resolve "today" using the current date above.
2. Resolve "yesterday" as exactly one calendar day before the current date.
3. Resolve relative date expressions using the current date.
4. Always use YYYY-MM-DD when requesting dates from backend tools.
5. Never invent a date or assume the current year.
6. If a date expression is ambiguous, ask the user to clarify.
7. If no date range is specified, use the backend default of the latest 30 days.


NUTRITION DATA RULES:

1. Use backend tools whenever a question requires personal nutrition data.
2. Never invent food records, calories, macros, or micronutrient measurements.
3. Never generate SQL or access the database directly.
4. Use only results returned by approved tools.
5. Mention sample sizes and data coverage when discussing averages or patterns.
6. Missing food logs do not mean zero food consumption.
7. Clearly distinguish recorded days from unrecorded days.
8. Do not claim causation from correlations or limited observations.
9. Do not diagnose medical conditions or prescribe treatment.
10. Do not present configured nutrient targets as personalized medical recommendations.
11. Macro goal percentages are unavailable unless the backend explicitly provides configured macro goals.
12. When a nutrient has no configured daily target, do not calculate or invent a target percentage.
13. Distinguish nutrients obtained from food and supplements when relevant.
14. Be transparent when data is insufficient.
15. Do not call a nutrient below its configured target a clinical deficiency.
16. Do not describe intake above a configured target as toxic or harmful without appropriate evidence.
17. Explain that micronutrient trend direction describes recorded intake, not necessarily nutritional improvement.
18. Keep answers conversational, structured, and easy to understand.


AVAILABLE TOOLS:

- get_nutrition_analytics:
  Overall nutrition totals, daily averages, period comparisons, and coverage.

- get_macro_analysis:
  Calories, protein, carbohydrates, and fat analysis.

- get_micronutrient_analysis:
  Vitamin and mineral intake, food and supplement contributions, and configured targets.

- get_micronutrient_trends:
  Daily and weekly micronutrient trends, intake direction, and tracking coverage.

- get_food_frequency:
  Frequently logged foods and food logging patterns.

- get_food_contribution:
  Food contributions to calorie and macronutrient totals.

- get_meal_analysis:
  Breakfast, lunch, dinner, and snack patterns.

- get_nutrition_trends:
  Overall daily and weekly nutrition trends.

- get_nutrition_consistency:
  Food logging consistency and tracking streaks.

- get_nutrition_goal_analysis:
  Configured nutrient target analysis.

- get_food_history:
  Individual food records within a requested date range.


TOOL SELECTION:

1. Use nutrition analytics for overall trends and period comparisons.
2. Use macro analysis for calorie and macronutrient questions.
3. Use micronutrient analysis for vitamins, minerals, and configured targets.
4. Use micronutrient trends for changes in vitamin and mineral intake over time.
5. Use food frequency for frequently logged foods.
6. Use food contribution for food-level calorie and macro contributions.
7. Use food history for specific foods or individual dates.
8. Use meal analysis for meal-wise patterns.
9. Use nutrition trends for overall daily and weekly patterns.
10. Use consistency analysis for tracking habits.
11. Use goal analysis for configured nutrient targets.
12. You may call multiple tools when a question requires multiple perspectives.
13. Never claim a tool was executed if it was not.
`;
}


/* =========================================
   TOOL EXECUTION
========================================= */

async function executeNutritionTool(name, args = {}) {
    if (name === "get_food_history") {
        return await getFoodHistory({
            startDate: args.startDate,
            endDate: args.endDate,
        });
    }

    return await executeModularNutritionTool(name, args);
}

async function executeNutritionToolFromModule(name, args) {
    return executeNutritionToolModule(name, args);
}


/* =========================================
   TOOL RESPONSE BUILDER
========================================= */

function createToolResponse(call, result) {
    return {
        functionResponse: {
            id: call.id,
            name: call.name,

            response: {
                success: true,
                data: result,
            },
        },
    };
}

function createToolErrorResponse(call, error) {
    return {
        functionResponse: {
            id: call.id,
            name: call.name,

            response: {
                success: false,
                error: error.message || "Tool execution failed.",
            },
        },
    };
}


/* =========================================
   NUTRITION AI
========================================= */

/**
 * Understands a user's question, retrieves approved nutrition data,
 * and generates a grounded natural-language response.
 */
export async function generateNutritionInsight(message) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is missing.");
    }

    if (typeof message !== "string" || !message.trim()) {
        throw new Error("A message is required.");
    }

    const userMessage = message.trim();

    if (userMessage.length > 1000) {
        throw new Error("Message cannot exceed 1000 characters.");
    }

    const ai = getGeminiClient();

    const config = {
        systemInstruction: getSystemInstruction(),
        tools: availableNutritionTools,
    };

    // Preserve the complete function-calling conversation.
    const contents = [
        {
            role: "user",
            parts: [{ text: userMessage }],
        },
    ];

    const MAX_TOOL_ROUNDS = 5;

    console.log("[Nutrition AI] Starting Gemini request.");

    let response = await generateWithGeminiFallback(ai, {
        contents,
        config,
    });

    const executedSources = new Set();

    for (let round = 1; round <= MAX_TOOL_ROUNDS; round++) {
        const candidateContent = response.candidates?.[0]?.content;
        const functionCalls = response.functionCalls || [];

        console.log(`[Nutrition AI] Response round: ${round}`);
        console.log("[Nutrition AI] Function calls:", functionCalls.length);

        // Gemini has finished requesting tools.
        if (functionCalls.length === 0) {
            const answer = response.text?.trim();

            if (answer) {
                console.log("[Nutrition AI] Final answer generated.");

                return {
                    answer,
                    sources: [...executedSources],
                };
            }

            console.warn(
                "[Nutrition AI] Gemini returned neither text nor function calls."
            );

            return {
                answer:
                    "I received an incomplete response while analyzing your nutrition data. Please try again.",
                sources: [...executedSources],
                incomplete: true,
            };
        }

        if (!candidateContent) {
            console.error(
                "[Nutrition AI] Function calls received without candidate content."
            );

            return {
                answer:
                    "I couldn't complete the nutrition data analysis. Please try again.",
                sources: [...executedSources],
                incomplete: true,
            };
        }

        // Preserve Gemini's original response and function-call metadata.
        contents.push(candidateContent);

        // Execute all requested tools.
        const functionResponseParts = await Promise.all(
            functionCalls.map(async call => {
                console.log(
                    `[Nutrition AI] Executing tool: ${call.name}`
                );

                try {
                    const result = await executeNutritionTool(
                        call.name,
                        call.args || {}
                    );

                    executedSources.add(call.name);

                    console.log(
                        `[Nutrition AI] Tool completed: ${call.name}`
                    );

                    return createToolResponse(call, result);

                } catch (error) {
                    console.error(
                        `[Nutrition AI] Tool failed: ${call.name}`,
                        error.message
                    );

                    // Correctly report failure instead of success.
                    return createToolErrorResponse(call, error);
                }
            })
        );

        // Send tool results back to Gemini.
        contents.push({
            role: "user",
            parts: functionResponseParts,
        });

        console.log(
            "[Nutrition AI] Sending tool results back to Gemini."
        );

        response = await generateWithGeminiFallback(ai, {
            contents,
            config,
        });
    }

    console.warn("[Nutrition AI] Maximum tool rounds reached.");

    return {
        answer:
            "I retrieved some nutrition information, but couldn't complete the full analysis. Please try a more specific question.",
        sources: [...executedSources],
        incomplete: true,
    };
}
