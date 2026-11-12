
/*
 * ASCEND — NUTRITION AGGREGATION UTILITIES
 *
 * Provides reusable, deterministic calculations for
 * nutrition entries, daily breakdowns, and data coverage.
 */

import { formatDate } from "./dateUtils.js";

const MACRO_FIELDS = [
    "calories",
    "protein",
    "carbs",
    "fat",
];

export function round(value, decimals = 2) {
    if (!Number.isFinite(value)) return null;

    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function sumField(entries, field) {
    return entries.reduce(
        (sum, entry) => sum + (Number(entry[field]) || 0),
        0
    );
}

export function calculateAverage(entries, field) {
    if (entries.length === 0) {
        return {
            average: null,
            total: 0,
            count: 0,
        };
    }

    const total = sumField(entries, field);

    return {
        average: round(total / entries.length),
        total: round(total),
        count: entries.length,
    };
}

export function calculateMacroTotals(entries) {
    return Object.fromEntries(
        MACRO_FIELDS.map((field) => [
            field,
            round(sumField(entries, field)),
        ])
    );
}

/*
 * Groups nutrition entries by calendar date.
 * Only dates with recorded entries are included.
 */
export function groupEntriesByDate(entries) {
    const grouped = new Map();

    for (const entry of entries) {
        const date = formatDate(entry.entryDate);

        if (!grouped.has(date)) {
            grouped.set(date, []);
        }

        grouped.get(date).push(entry);
    }

    return grouped;
}

export function calculateDailyBreakdown(entries) {
    const grouped = groupEntriesByDate(entries);

    return [...grouped.entries()].map(([date, dayEntries]) => ({
        date,
        ...calculateMacroTotals(dayEntries),
        entriesCount: dayEntries.length,
    }));
}

export function calculateCoverage(entries, range) {
    const recordedDays = groupEntriesByDate(entries).size;

    return {
        recordedDays,
        expectedDays: range.expectedDays,
        unrecordedDays: Math.max(
            0,
            range.expectedDays - recordedDays
        ),
        coveragePercentage: range.expectedDays > 0
            ? round((recordedDays / range.expectedDays) * 100)
            : 0,
    };
}

export function calculateMetricChanges(current, previous) {
    const metrics = MACRO_FIELDS;

    return Object.fromEntries(
        metrics.map((metric) => {
            const currentAverage =
                current.dailyAverages[metric].average;

            const previousAverage =
                previous.dailyAverages[metric].average;

            if (
                currentAverage === null ||
                previousAverage === null
            ) {
                return [
                    metric,
                    {
                        difference: null,
                        percentageChange: null,
                        comparisonAvailable: false,
                    },
                ];
            }

            const difference = round(
                currentAverage - previousAverage
            );

            const percentageChange =
                previousAverage === 0
                    ? null
                    : round(
                        (difference / Math.abs(previousAverage)) * 100
                    );

            return [
                metric,
                {
                    difference,
                    percentageChange,
                    comparisonAvailable: true,
                },
            ];
        })
    );
}

/*
 * Calculates period metrics using recorded days as the
 * denominator for daily averages, not all calendar days.
 */
export function calculatePeriodMetrics(entries, range) {
    const dailyBreakdown = calculateDailyBreakdown(entries);

    return {
        period: {
            startDate: range.startDate,
            endDate: range.endDate,
            expectedDays: range.expectedDays,
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
    };
}
