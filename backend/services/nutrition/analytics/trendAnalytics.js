
/*
 * ASCEND — NUTRITION TREND ANALYTICS
 *
 * Generates daily and weekly nutrition trends
 * from recorded nutrition entries.
 */

import { resolveDateRange } from "./dateUtils.js";
import { fetchNutritionEntries } from "./nutritionRepository.js";
import {
    calculateCoverage,
    calculateDailyBreakdown,
    calculateMacroTotals,
    round,
} from "./aggregationUtils.js";

function getWeekStart(dateString) {
    const date = new Date(`${dateString}T00:00:00.000Z`);

    const day = date.getUTCDay();

    // Monday is the first day of the week.
    const daysSinceMonday = (day + 6) % 7;

    date.setUTCDate(date.getUTCDate() - daysSinceMonday);

    return date.toISOString().slice(0, 10);
}

function calculateWeeklyTrends(dailyBreakdown) {
    const weeks = new Map();

    for (const day of dailyBreakdown) {
        const weekStart = getWeekStart(day.date);

        if (!weeks.has(weekStart)) {
            weeks.set(weekStart, {
                weekStart,
                recordedDays: 0,
                totalEntries: 0,
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
            });
        }

        const week = weeks.get(weekStart);

        week.recordedDays += 1;
        week.totalEntries += day.entriesCount;

        week.calories += day.calories;
        week.protein += day.protein;
        week.carbs += day.carbs;
        week.fat += day.fat;
    }

    return [...weeks.values()].map((week) => ({
        ...week,

        calories: round(week.calories),
        protein: round(week.protein),
        carbs: round(week.carbs),
        fat: round(week.fat),

        averagePerRecordedDay: {
            calories: round(week.calories / week.recordedDays),
            protein: round(week.protein / week.recordedDays),
            carbs: round(week.carbs / week.recordedDays),
            fat: round(week.fat / week.recordedDays),
        },
    }));
}

function calculateExtremes(dailyBreakdown) {
    if (dailyBreakdown.length === 0) {
        return {
            highestCalorieDay: null,
            lowestCalorieDay: null,
            highestProteinDay: null,
            lowestProteinDay: null,
        };
    }

    const getExtreme = (metric, descending = true) => {
        return [...dailyBreakdown].sort(
            (a, b) => descending
                ? b[metric] - a[metric]
                : a[metric] - b[metric]
        )[0];
    };

    return {
        highestCalorieDay: getExtreme("calories"),
        lowestCalorieDay: getExtreme("calories", false),

        highestProteinDay: getExtreme("protein"),
        lowestProteinDay: getExtreme("protein", false),
    };
}

export async function getNutritionTrends(options = {}) {
    const range = resolveDateRange(options);

    const entries = await fetchNutritionEntries(range);

    const dailyBreakdown = calculateDailyBreakdown(entries);

    const weeklyBreakdown = calculateWeeklyTrends(
        dailyBreakdown
    );

    return {
        requestedPeriod: {
            startDate: range.startDate,
            endDate: range.endDate,
            expectedDays: range.expectedDays,
        },

        coverage: calculateCoverage(entries, range),

        totals: calculateMacroTotals(entries),

        dailyBreakdown,

        weeklyBreakdown,

        extremes: calculateExtremes(dailyBreakdown),

        dataLimitations: [
            "Daily trends include only dates with recorded nutrition entries.",
            "Weekly averages use recorded days within each week.",
            "Weeks at the beginning and end of the requested period may be partial weeks.",
        ],
    };
}
