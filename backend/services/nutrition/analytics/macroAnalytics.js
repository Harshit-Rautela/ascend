
/*
 * ASCEND — MACRO ANALYTICS
 *
 * Analyzes calories, protein, carbohydrates, and fat
 * across recorded nutrition entries.
 */

import {
    resolveDateRange,
} from "./dateUtils.js";

import {
    fetchNutritionEntries,
} from "./nutritionRepository.js";

import {
    calculateMacroTotals,
    calculateDailyBreakdown,
    calculateCoverage,
    calculateAverage,
} from "./aggregationUtils.js";

export async function getMacroAnalysis(options = {}) {
    const range = resolveDateRange(options);

    const entries = await fetchNutritionEntries(range);

    const dailyBreakdown = calculateDailyBreakdown(entries);

    return {
        requestedPeriod: {
            startDate: range.startDate,
            endDate: range.endDate,
        },

        totalEntries: entries.length,

        coverage: calculateCoverage(entries, range),

        totals: calculateMacroTotals(entries),

        dailyAverages: {
            calories: calculateAverage(dailyBreakdown, "calories"),
            protein: calculateAverage(dailyBreakdown, "protein"),
            carbs: calculateAverage(dailyBreakdown, "carbs"),
            fat: calculateAverage(dailyBreakdown, "fat"),
        },

        dailyBreakdown,

        goalInformation: {
            available: false,
            message:
                "Macro goals are not configured. Goal achievement percentages cannot currently be calculated.",
        },
    };
}
