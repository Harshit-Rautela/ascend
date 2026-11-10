
/**
 * ASCEND — NUTRITION AI SERVICE
 *
 * Uses Gemini function calling to retrieve approved nutrition data.
 * All nutrition calculations and database access remain in backend services.
 */

import { GoogleGenAI } from "@google/genai";

import {
    getNutritionAnalytics,
    getMacroAnalysis,
    getMicronutrientAnalysis,
    getFoodHistory,
    getMealAnalysis,
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
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
];

function getGeminiModels() {
    const configuredModels = process.env.GEMINI_MODELS
        ?.split(",")
        .map((model) => model.trim())
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

    // Temporary capacity, rate-limit, and server errors.
    if ([408, 429, 500, 502, 503, 504].includes(status)) {
        return true;
    }

    // Some SDK errors expose Google API error codes in the message.
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

    // An unavailable model can be skipped in favor of another.
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
        `All Gemini models are currently unavailable. Last error: ${lastError?.message || "Unknown Gemini error"
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
3. Resolve "last week", "last month", and other relative date expressions using the current date.
4. Always use YYYY-MM-DD when requesting dates from backend tools.
5. Never invent a date or assume the current year.
6. If a date expression is ambiguous, ask the user to clarify.
7. If no date range is specified, use the backend default of the latest 30 days.

NUTRITION DATA RULES:
1. Use backend tools whenever a question requires personal nutrition data.
2. Never invent food records, calorie values, macronutrients, or micronutrient measurements.
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
13. Clearly distinguish nutrients obtained from food and supplements when relevant.
14. Be transparent when data is insufficient.
15. Keep answers conversational, structured, and easy to understand.

AVAILABLE TOOLS:
- get_nutrition_analytics: period averages, totals, comparisons, and data coverage.
- get_macro_analysis: calorie, protein, carbohydrate, and fat analysis.
- get_micronutrient_analysis: micronutrient intake and configured daily targets.
- get_food_history: individual food records within a requested date range.
- get_meal_analysis: breakfast, lunch, dinner, and snack patterns.

TOOL SELECTION:
1. Use nutrition analytics for overall trends and period comparisons.
2. Use macro analysis for specific calorie and macronutrient questions.
3. Use micronutrient analysis for vitamins, minerals, and configured nutrient targets.
4. Use food history for questions about specific foods or individual dates.
5. Use meal analysis for meal-wise patterns.
6. You may call multiple tools when a question requires multiple perspectives.
7. Never claim a tool was executed if it was not.
`;
}

/* =========================================
   GEMINI TOOL DECLARATIONS
========================================= */

const nutritionTools = [
    {
        functionDeclarations: [
            {
                name: "get_nutrition_analytics",
                description:
                    "Retrieve nutrition totals, daily averages, period comparisons, and data coverage. Defaults to the latest 30 days. Use for overall nutrition trends and comparisons.",

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
            },

            {
                name: "get_macro_analysis",
                description:
                    "Retrieve calorie, protein, carbohydrate, and fat totals and daily averages for a date range. Defaults to the latest 30 days. Macro goal percentages are not currently available.",

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
            },

            {
                name: "get_micronutrient_analysis",
                description:
                    "Retrieve micronutrient intake from food and supplements, including configured daily targets and target percentages where available.",

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
            },

            {
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
            },

            {
                name: "get_meal_analysis",
                description:
                    "Analyze breakfast, lunch, dinner, and snack patterns, including their recorded entries and macro totals.",

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
            },
        ],
    },
];

/* =========================================
   TOOL EXECUTION
========================================= */

async function executeNutritionTool(name, args = {}) {
    const options = {
        startDate: args.startDate,
        endDate: args.endDate,
    };

    switch (name) {
        case "get_nutrition_analytics":
            return await getNutritionAnalytics(options);

        case "get_macro_analysis":
            return await getMacroAnalysis(options);

        case "get_micronutrient_analysis":
            return await getMicronutrientAnalysis(options);

        case "get_food_history":
            return await getFoodHistory(options);

        case "get_meal_analysis":
            return await getMealAnalysis(options);

        default:
            throw new Error(`Unsupported nutrition tool: ${name}`);
    }
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
    // const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

    const config = {
        systemInstruction: getSystemInstruction(),
        tools: nutritionTools,
        // temperature: 0.2,
    };

    // Keep the complete tool-calling conversation.
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

    for (let round = 1; round <= MAX_TOOL_ROUNDS; round++) {
        const candidateContent = response.candidates?.[0]?.content;
        const functionCalls = response.functionCalls || [];

        console.log(`[Nutrition AI] Response round: ${round}`);
        console.log("[Nutrition AI] Function calls:", functionCalls.length);

        // No more tools requested: Gemini should now provide its answer.
        if (functionCalls.length === 0) {
            const answer = response.text?.trim();

            if (answer) {
                console.log("[Nutrition AI] Final answer generated.");

                return {
                    answer,
                    sources: [
                        ...new Set(
                            contents
                                .flatMap((item) => item.parts || [])
                                .map((part) => part.functionResponse?.name)
                                .filter(Boolean)
                        ),
                    ],
                };
            }

            console.warn(
                "[Nutrition AI] Gemini returned neither text nor function calls."
            );

            return {
                answer:
                    "I received an incomplete response while analyzing your nutrition data. Please try asking your question again.",
                sources: [],
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
                sources: [],
                incomplete: true,
            };
        }

        // Preserve Gemini's model response, including its function calls.
        contents.push(candidateContent);

        // Execute the requested tools on our backend.
        const functionResponseParts = await Promise.all(
            functionCalls.map(async (call) => {
                console.log(
                    `[Nutrition AI] Executing tool: ${call.name}`
                );

                try {
                    const result = await executeNutritionTool(
                        call.name,
                        call.args || {}
                    );

                    console.log(
                        `[Nutrition AI] Tool completed: ${call.name}`
                    );

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
                } catch (error) {
                    console.error(
                        `[Nutrition AI] Tool failed: ${call.name}`,
                        error.message
                    );

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
            })
        );

        // Send all tool results back to Gemini.
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

    // Prevent unlimited tool-calling loops.
    console.warn("[Nutrition AI] Maximum tool rounds reached.");

    return {
        answer:
            "I was able to retrieve some nutrition information, but couldn't complete the full analysis. Please try a more specific question.",
        sources: [],
        incomplete: true,
    };
}
