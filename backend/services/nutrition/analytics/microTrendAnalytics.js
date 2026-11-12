
/*
 * ASCEND — MICRONUTRIENT TREND ANALYTICS
 *
 * Analyzes daily and weekly vitamin and mineral intake patterns.
 * Compares intake across periods and identifies improving
 * or declining nutrient trends.
 */

import {
    resolveDateRange,
    addDays,
    formatDate,
} from "./dateUtils.js";

import {
    fetchNutrientIntakes,
    fetchNutrients,
} from "./nutritionRepository.js";

import {
    round,
} from "./aggregationUtils.js";


/**
 * Groups nutrient intake records by nutrient and date.
 */
function groupIntakesByNutrientAndDate(intakes) {
    const grouped = new Map();

    for (const intake of intakes) {
        const date = formatDate(intake.entryDate);

        if (!grouped.has(intake.nutrientId)) {
            grouped.set(intake.nutrientId, new Map());
        }

        const dailyRecords = grouped.get(intake.nutrientId);

        if (!dailyRecords.has(date)) {
            dailyRecords.set(date, {
                date,
                fromFood: 0,
                fromSupplements: 0,
                total: 0,
            });
        }

        const daily = dailyRecords.get(date);

        if (intake.source === "FOOD") {
            daily.fromFood += intake.amount;
        } else if (intake.source === "SUPPLEMENT") {
            daily.fromSupplements += intake.amount;
        }

        daily.total += intake.amount;
    }

    return grouped;
}


/**
 * Generates daily nutrient intake records.
 */
function calculateDailyNutrientTrend(
    nutrient,
    dailyRecords,
    range
) {
    const result = [];

    let currentDate = range.startDate;

    while (currentDate <= range.endDate) {
        const record = dailyRecords.get(currentDate);

        result.push({
            date: currentDate,

            recorded: Boolean(record),

            fromFood: record
                ? round(record.fromFood)
                : null,

            fromSupplements: record
                ? round(record.fromSupplements)
                : null,

            totalIntake: record
                ? round(record.total)
                : null,

            dailyTarget: nutrient.dailyTarget,

            targetPercentage:
                record &&
                nutrient.dailyTarget !== null &&
                nutrient.dailyTarget > 0
                    ? round(
                        (record.total / nutrient.dailyTarget) * 100
                    )
                    : null,
        });

        currentDate = addDays(currentDate, 1);
    }

    return result;
}


/**
 * Groups daily nutrient trends into calendar weeks.
 * Weeks begin on Monday.
 */
function calculateWeeklyNutrientTrend(dailyTrend) {
    const weeks = new Map();

    for (const day of dailyTrend) {
        const date = new Date(`${day.date}T00:00:00Z`);

        const dayOfWeek = date.getUTCDay();

        const daysSinceMonday = (dayOfWeek + 6) % 7;

        const weekStart = addDays(
            day.date,
            -daysSinceMonday
        );

        if (!weeks.has(weekStart)) {
            weeks.set(weekStart, {
                weekStart,
                recordedDays: 0,
                expectedDays: 0,
                totalIntake: 0,
                fromFood: 0,
                fromSupplements: 0,
            });
        }

        const week = weeks.get(weekStart);

        week.expectedDays += 1;

        if (day.recorded) {
            week.recordedDays += 1;
            week.totalIntake += day.totalIntake;
            week.fromFood += day.fromFood;
            week.fromSupplements += day.fromSupplements;
        }
    }

    return Array.from(weeks.values()).map(week => ({
        weekStart: week.weekStart,

        recordedDays: week.recordedDays,
        expectedDays: week.expectedDays,

        totalIntake: round(week.totalIntake),

        averageDailyIntake: week.recordedDays > 0
            ? round(week.totalIntake / week.recordedDays)
            : null,

        averageFromFood: week.recordedDays > 0
            ? round(week.fromFood / week.recordedDays)
            : null,

        averageFromSupplements: week.recordedDays > 0
            ? round(week.fromSupplements / week.recordedDays)
            : null,

        trackingCoverage: round(
            (week.recordedDays / week.expectedDays) * 100
        ),
    }));
}


/**
 * Compares the first and second halves of the requested period.
 *
 * A positive change means intake increased.
 * A negative change means intake decreased.
 */
function calculateNutrientTrendDirection(dailyTrend) {
    const midpoint = Math.ceil(dailyTrend.length / 2);

    const firstHalf = dailyTrend.slice(0, midpoint);
    const secondHalf = dailyTrend.slice(midpoint);

    function calculateAverage(days) {
        const recordedDays = days.filter(day => day.recorded);

        if (recordedDays.length === 0) {
            return null;
        }

        const total = recordedDays.reduce(
            (sum, day) => sum + day.totalIntake,
            0
        );

        return round(total / recordedDays.length);
    }

    const firstHalfAverage = calculateAverage(firstHalf);
    const secondHalfAverage = calculateAverage(secondHalf);

    let changePercentage = null;

    if (
        firstHalfAverage !== null &&
        secondHalfAverage !== null &&
        firstHalfAverage > 0
    ) {
        changePercentage = round(
            (
                (secondHalfAverage - firstHalfAverage) /
                firstHalfAverage
            ) * 100
        );
    }

    let direction = "INSUFFICIENT_DATA";

    if (
        firstHalfAverage !== null &&
        secondHalfAverage !== null
    ) {
        if (changePercentage > 5) {
            direction = "INCREASING";
        } else if (changePercentage < -5) {
            direction = "DECREASING";
        } else {
            direction = "STABLE";
        }
    }

    return {
        firstHalfAverage,
        secondHalfAverage,
        changePercentage,
        direction,
    };
}


/**
 * Identifies the highest and lowest recorded intake days.
 */
function calculateNutrientExtremes(dailyTrend) {
    const recordedDays = dailyTrend.filter(
        day => day.recorded
    );

    if (recordedDays.length === 0) {
        return {
            highestIntakeDay: null,
            lowestIntakeDay: null,
        };
    }

    const sorted = [...recordedDays].sort(
        (a, b) => a.totalIntake - b.totalIntake
    );

    const lowest = sorted[0];
    const highest = sorted[sorted.length - 1];

    return {
        highestIntakeDay: {
            date: highest.date,
            intake: highest.totalIntake,
        },

        lowestIntakeDay: {
            date: lowest.date,
            intake: lowest.totalIntake,
        },
    };
}


/**
 * Public API:
 * Returns daily, weekly, and directional trends
 * for every configured nutrient.
 */
export async function getMicronutrientTrends(options = {}) {
    const range = resolveDateRange(options);

    const [nutrients, intakes] = await Promise.all([
        fetchNutrients(),
        fetchNutrientIntakes(range),
    ]);

    const groupedIntakes =
        groupIntakesByNutrientAndDate(intakes);

    const nutrientTrends = nutrients.map(nutrient => {
        const dailyRecords =
            groupedIntakes.get(nutrient.id) || new Map();

        const dailyTrend = calculateDailyNutrientTrend(
            nutrient,
            dailyRecords,
            range
        );

        const weeklyTrend =
            calculateWeeklyNutrientTrend(dailyTrend);

        const trendDirection =
            calculateNutrientTrendDirection(dailyTrend);

        const extremes =
            calculateNutrientExtremes(dailyTrend);

        return {
            key: nutrient.key,
            name: nutrient.name,
            category: nutrient.category,
            unit: nutrient.unit,

            dailyTarget: nutrient.dailyTarget,

            recordedDays: dailyTrend.filter(
                day => day.recorded
            ).length,

            expectedDays: range.expectedDays,

            dailyTrend,
            weeklyTrend,

            trendDirection,
            extremes,
        };
    });

    return {
        requestedPeriod: {
            startDate: range.startDate,
            endDate: range.endDate,
            expectedDays: range.expectedDays,
        },

        nutrients: nutrientTrends,

        dataCoverage: {
            note:
                "Trends are calculated using recorded intake only. Missing days are not treated as zero intake. Weekly and period averages use recorded days.",
        },
    };
}
