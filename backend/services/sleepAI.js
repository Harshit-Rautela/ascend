
import { GoogleGenAI } from "@google/genai";
import {
    getSleepAnalytics,
    getSleepHistory,
} from "./sleepAnalyticsService.js";
function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing.");
    }

    return new GoogleGenAI({ apiKey });
}


function getCurrentDate() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}
// const model = process.env.GEMINI_MODEL || "gemini-flash-latest";


function getSystemInstruction() {
    const currentDate = getCurrentDate();

    return `
You are Ascend's personal Sleep AI assistant.

CURRENT DATE: ${currentDate}
TIMEZONE: Asia/Kolkata (IST)

DATE HANDLING RULES:
1. Resolve "today" using the current date above.
2. Resolve "yesterday" as exactly one calendar day before the current date.
3. Resolve "last week", "last month", and other relative date expressions using the current date.
4. Always use YYYY-MM-DD when requesting dates from backend tools.
5. Never invent a date or assume the current year.
6. If a date expression is ambiguous, ask the user to clarify.

SLEEP DATA RULES:
1. Use backend tools whenever a question requires personal sleep data.
2. Never invent sleep records, measurements, dates, or trends.
3. Never generate SQL or access the database directly.
4. Use only results returned by approved tools.
5. Mention sample sizes when discussing averages or patterns.
6. If data is missing, explain that clearly.
7. Do not claim causation from correlations or limited observations.
8. Do not diagnose medical conditions or prescribe treatment.
9. Be transparent when data is insufficient.
10. Keep answers conversational, structured, and easy to understand.

AVAILABLE TOOLS:
- get_sleep_analytics: latest 30 days and preceding 30 days.
- get_sleep_history: individual records for a requested date range, up to 60 days.

Use sleep history for specific dates and daily records.
Use sleep analytics for averages, trends, and comparisons.
Never claim a tool was executed if it was not.
`;
}


const sleepTools = [
    {
        functionDeclarations: [
            {
                name: "get_sleep_analytics",
                description:
                    "Retrieve calculated sleep averages, period comparisons, bedtime consistency, and data coverage for the latest 30 days and the preceding 30 days. Use this for questions about averages, trends, and comparisons.",
                parametersJsonSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "get_sleep_history",
                description:
                    "Retrieve individual sleep records for a date range. Use this for questions about particular days, daily patterns, or detailed records. The range cannot exceed 60 days.",
                parametersJsonSchema: {
                    type: "object",
                    properties: {
                        startDate: {
                            type: "string",
                            description: "Start date in YYYY-MM-DD format.",
                        },
                        endDate: {
                            type: "string",
                            description: "End date in YYYY-MM-DD format.",
                        },
                    },
                    required: ["startDate", "endDate"],
                },
            },
        ],
    },
];

async function executeSleepTool(name, args) {
    console.log(`[Sleep AI] Executing tool: ${name}`);
    console.log("[Sleep AI] Tool arguments:", args);

    switch (name) {
        case "get_sleep_analytics":
            return await getSleepAnalytics();

        case "get_sleep_history":
            return await getSleepHistory({
                startDate: args.startDate,
                endDate: args.endDate,
            });

        default:
            throw new Error(`Unsupported sleep tool: ${name}`);
    }
}

/**
 * Understands a user's question, retrieves approved sleep data,
 * and generates a grounded natural-language response.
 */

export async function generateSleepInsight(message) {
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
    const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

    const config = {
        systemInstruction: getSystemInstruction(),
        tools: sleepTools,
        temperature: 0.2,
    };

    // Keep the complete tool-calling conversation.
    const contents = [
        {
            role: "user",
            parts: [{ text: userMessage }],
        },
    ];

    const MAX_TOOL_ROUNDS = 5;

    console.log("[Sleep AI] Starting Gemini request.");

    let response = await ai.models.generateContent({
        model,
        contents,
        config,
    });

    for (let round = 1; round <= MAX_TOOL_ROUNDS; round++) {
        const candidateContent = response.candidates?.[0]?.content;
        const functionCalls = response.functionCalls || [];

        console.log(`[Sleep AI] Response round: ${round}`);
        console.log("[Sleep AI] Function calls:", functionCalls.length);

        // No more tools requested: Gemini should now provide its answer.
        if (functionCalls.length === 0) {
            const answer = response.text?.trim();

            if (answer) {
                console.log("[Sleep AI] Final answer generated.");

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

            // Do not turn an empty text response into a server error.
            console.warn(
                "[Sleep AI] Gemini returned neither text nor function calls."
            );

            return {
                answer:
                    "I received an incomplete response while analyzing your sleep data. Please try asking your question again.",
                sources: [],
                incomplete: true,
            };
        }

        if (!candidateContent) {
            console.error(
                "[Sleep AI] Function calls received without candidate content."
            );

            return {
                answer:
                    "I couldn't complete the sleep data analysis. Please try again.",
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
                    `[Sleep AI] Executing tool: ${call.name}`
                );

                try {
                    const result = await executeSleepTool(
                        call.name,
                        call.args || {}
                    );

                    console.log(
                        `[Sleep AI] Tool completed: ${call.name}`
                    );

                    return {
                        functionResponse: {
                            name: call.name,
                            response: {
                                success: true,
                                data: result,
                            },
                        },
                    };
                } catch (error) {
                    console.error(
                        `[Sleep AI] Tool failed: ${call.name}`,
                        error
                    );

                    return {
                        functionResponse: {
                            name: call.name,
                            response: {
                                success: false,
                                error: error.message,
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
            "[Sleep AI] Sending tool results back to Gemini."
        );

        response = await ai.models.generateContent({
            model,
            contents,
            config,
        });
    }

    // Prevent unlimited tool-calling loops.
    console.warn("[Sleep AI] Maximum tool rounds reached.");

    return {
        answer:
            "I was able to retrieve some sleep information, but couldn't complete the full analysis. Please try a more specific question.",
        sources: [],
        incomplete: true,
    };
}

