
/*
 * ASCEND — NUTRITION TOOL EXECUTOR
 *
 * Validates Gemini function arguments and dispatches
 * approved requests to nutrition analytics.
 */

import {
    getNutritionAnalytics,
    getMacroAnalysis,
    getMicronutrientAnalysis,
    getFoodFrequency,
    getFoodContribution,
    getMealAnalysis,
    getNutritionTrends,
    getNutritionConsistency,
    getNutritionGoalAnalysis,
    getMicronutrientTrends
} from "../analytics/index.js";

import { resolveDateRange } from "../analytics/dateUtils.js";

const TOOL_HANDLERS = {
    get_nutrition_analytics: getNutritionAnalytics,
    get_macro_analysis: getMacroAnalysis,
    get_micronutrient_analysis: getMicronutrientAnalysis,
    get_food_frequency: getFoodFrequency,
    get_food_contribution: getFoodContribution,
    get_meal_analysis: getMealAnalysis,
    get_nutrition_trends: getNutritionTrends,
    get_nutrition_consistency: getNutritionConsistency,
    get_nutrition_goal_analysis: getNutritionGoalAnalysis,
    get_micronutrient_trends: getMicronutrientTrends,
};

const DATE_ARGUMENTS = new Set([
    "startDate",
    "endDate",
]);

const LIMIT_ARGUMENTS = new Set([
    "limit",
]);

function validateToolArguments(name, args) {
    if (
        args === null ||
        typeof args !== "object" ||
        Array.isArray(args)
    ) {
        throw new Error("Tool arguments must be an object.");
    }

    const allowedArguments = LIMIT_ARGUMENTS.has("limit") &&
        ["get_food_frequency", "get_food_contribution"].includes(name)
        ? new Set([...DATE_ARGUMENTS, "limit"])
        : DATE_ARGUMENTS;

    for (const key of Object.keys(args)) {
        if (!allowedArguments.has(key)) {
            throw new Error(
                `Unsupported argument "${key}" for ${name}.`
            );
        }
    }

    const options = {};

    if (args.startDate !== undefined) {
        options.startDate = args.startDate;
    }

    if (args.endDate !== undefined) {
        options.endDate = args.endDate;
    }

    // Validate and normalize the date range before database access.
    const range = resolveDateRange(options);

    const validatedOptions = {
        startDate: range.startDate,
        endDate: range.endDate,
    };

    if (args.limit !== undefined) {
        const limit = Number(args.limit);

        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
            throw new Error("limit must be an integer between 1 and 100.");
        }

        validatedOptions.limit = limit;
    }

    return validatedOptions;
}

export async function executeNutritionTool(name, args = {}) {
    const handler = TOOL_HANDLERS[name];

    if (!handler) {
        throw new Error(`Unsupported nutrition tool: ${name}`);
    }

    const validatedArgs = validateToolArguments(name, args);

    return handler(validatedArgs);
}
