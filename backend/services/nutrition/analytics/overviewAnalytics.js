
/*
 * ASCEND — NUTRITION OVERVIEW ANALYTICS
 *
 * Generates an overall nutrition summary and compares
 * the requested period with the preceding period.
 */

import {
    resolveDateRange,
    getPreviousDateRange,
} from "./dateUtils.js";

import {
    fetchNutritionEntries,
} from "./nutritionRepository.js";

import {
    calculatePeriodMetrics,
    calculateMetricChanges,
} from "./aggregationUtils.js";

export async function getNutritionAnalytics(options = {}) {
    const range = resolveDateRange(options);
    const previousRange = getPreviousDateRange(range);

    const [currentEntries, previousEntries] = await Promise.all([
        fetchNutritionEntries(range),
        fetchNutritionEntries(previousRange),
    ]);

    const currentPeriod = calculatePeriodMetrics(
        currentEntries,
        range
    );

    const previousPeriod = calculatePeriodMetrics(
        previousEntries,
        previousRange
    );

    return {
        generatedAt: new Date().toISOString(),

        currentPeriod,

        previousPeriod,

        changes: calculateMetricChanges(
            currentPeriod,
            previousPeriod
        ),

        dataCoverage: {
            currentPeriod: currentPeriod.coverage,
            previousPeriod: previousPeriod.coverage,
        },
    };
}
