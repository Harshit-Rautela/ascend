
/**
 * ASCEND — NUTRITION ANALYTICS SERVICE
 *
 * Fetches nutrition records and calculates deterministic analytics.
 * Uses UTC calendar dates because nutrition dates are PostgreSQL DATE fields.
 */

import prisma from "../prisma.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PERIOD_DAYS = 30;
const MAX_HISTORY_DAYS = 60;

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"];

/* =========================================
   DATE HELPERS
========================================= */

function getTodayDateString() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

function isValidDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const parsed = new Date(`${value}T00:00:00.000Z`);

    return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value
    );
}

function parseDate(value) {
    return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(date) {
    return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
}

function getDayDifference(start, end) {
    return Math.floor((end - start) / DAY_MS) + 1;
}

/**
 * Resolves an inclusive date range.
 * Defaults to the latest 30 calendar days, including today.
 */
function resolveDateRange({ startDate, endDate } = {}) {
    const today = getTodayDateString();

    const resolvedEndDate = endDate || today;

    const resolvedStartDate =
        startDate ||
        formatDate(
            addDays(
                parseDate(resolvedEndDate),
                -(DEFAULT_PERIOD_DAYS - 1)
            )
        );

    if (
        !isValidDate(resolvedStartDate) ||
        !isValidDate(resolvedEndDate)
    ) {
        throw new Error(
            "Valid startDate and endDate are required (YYYY-MM-DD)."
        );
    }

    const start = parseDate(resolvedStartDate);
    const end = parseDate(resolvedEndDate);

    if (start > end) {
        throw new Error(
            "startDate must be before or equal to endDate."
        );
    }

    if (end > parseDate(today)) {
        throw new Error("Future dates are not supported.");
    }

    const days = getDayDifference(start, end);

    if (days > MAX_HISTORY_DAYS) {
        throw new Error(
            `Nutrition history requests are limited to ${MAX_HISTORY_DAYS} days.`
        );
    }

    return {
        startDate: resolvedStartDate,
        endDate: resolvedEndDate,
        start,
        end,
        endExclusive: addDays(end, 1),
        expectedDays: days,
    };
}

/* =========================================
   DATABASE HELPERS
========================================= */

async function fetchNutritionEntries(range) {
    return prisma.nutritionEntry.findMany({
        where: {
            entryDate: {
                gte: range.start,
                lt: range.endExclusive,
            },
        },
        orderBy: [
            { entryDate: "asc" },
            { createdAt: "asc" },
        ],
        select: {
            id: true,
            foodName: true,
            mealType: true,
            calories: true,
            protein: true,
            carbs: true,
            fat: true,
            entryDate: true,
        },
    });
}

function getEntryDate(entry) {
    return formatDate(entry.entryDate);
}

function round(value, decimals = 2) {
    return Number(value.toFixed(decimals));
}

function sumField(entries, field) {
    return entries.reduce((sum, entry) => sum + entry[field], 0);
}

function calculateAverage(entries, field) {
    if (entries.length === 0) {
        return {
            average: null,
            total: 0,
            recordedDays: 0,
        };
    }

    const total = sumField(entries, field);

    return {
        average: round(total / entries.length),
        total: round(total),
        recordedDays: entries.length,
    };
}

/**
 * Groups food entries into daily macro totals.
 * Only dates with actual food records appear in this breakdown.
 */
function calculateDailyBreakdown(entries) {
    const dailyMap = new Map();

    for (const entry of entries) {
        const date = getEntryDate(entry);

        if (!dailyMap.has(date)) {
            dailyMap.set(date, {
                date,
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                entriesCount: 0,
            });
        }

        const day = dailyMap.get(date);

        day.calories += entry.calories;
        day.protein += entry.protein;
        day.carbs += entry.carbs;
        day.fat += entry.fat;
        day.entriesCount += 1;
    }

    return [...dailyMap.values()].map((day) => ({
        ...day,
        calories: round(day.calories),
        protein: round(day.protein),
        carbs: round(day.carbs),
        fat: round(day.fat),
    }));
}

function calculateMacroTotals(entries) {
    return {
        calories: round(sumField(entries, "calories")),
        protein: round(sumField(entries, "protein")),
        carbs: round(sumField(entries, "carbs")),
        fat: round(sumField(entries, "fat")),
    };
}

function calculateCoverage(entries, range) {
    const recordedDates = new Set(
        entries.map(getEntryDate)
    );

    return {
        recordedDays: recordedDates.size,
        expectedDays: range.expectedDays,
        unrecordedDays: range.expectedDays - recordedDates.size,
        coveragePercentage: round(
            (recordedDates.size / range.expectedDays) * 100
        ),
    };
}

/* =========================================
   PERIOD ANALYTICS
========================================= */

function calculatePeriodMetrics(entries, range) {
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

function calculateMetricChanges(current, previous) {
    const metrics = ["calories", "protein", "carbs", "fat"];

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

/**
 * Retrieves nutrition analytics for a requested period.
 *
 * Compares the requested period with the preceding period
 * of equal duration.
 */
export async function getNutritionAnalytics(options = {}) {
    const range = resolveDateRange(options);

    const periodLength = range.expectedDays;

    const previousEnd = addDays(range.start, -1);
    const previousStart = addDays(
        previousEnd,
        -(periodLength - 1)
    );

    const previousRange = {
        startDate: formatDate(previousStart),
        endDate: formatDate(previousEnd),
        start: previousStart,
        end: previousEnd,
        endExclusive: addDays(previousEnd, 1),
        expectedDays: periodLength,
    };

    const [currentEntries, previousEntries] = await Promise.all([
        fetchNutritionEntries(range),
        fetchNutritionEntries(previousRange),
    ]);

    const currentMetrics = calculatePeriodMetrics(
        currentEntries,
        range
    );

    const previousMetrics = calculatePeriodMetrics(
        previousEntries,
        previousRange
    );

    return {
        generatedAt: new Date().toISOString(),

        currentPeriod: currentMetrics,
        previousPeriod: previousMetrics,

        changes: calculateMetricChanges(
            currentMetrics,
            previousMetrics
        ),

        dataCoverage: {
            currentPeriod: currentMetrics.coverage,
            previousPeriod: previousMetrics.coverage,
        },
    };
}

/* =========================================
   MACRO ANALYSIS
========================================= */

export async function getMacroAnalysis(options = {}) {
    const range = resolveDateRange(options);
    const entries = await fetchNutritionEntries(range);

    const dailyBreakdown = calculateDailyBreakdown(entries);

    return {
        requestedPeriod: {
            startDate: range.startDate,
            endDate: range.endDate,
        },

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

/* =========================================
   MICRONUTRIENT ANALYSIS
========================================= */

export async function getMicronutrientAnalysis(options = {}) {
    const range = resolveDateRange(options);

    const nutrients = await prisma.nutrient.findMany({
        orderBy: {
            name: "asc",
        },
        include: {
            intakes: {
                where: {
                    entryDate: {
                        gte: range.start,
                        lt: range.endExclusive,
                    },
                },
                select: {
                    amount: true,
                    source: true,
                    entryDate: true,
                },
            },
        },
    });

    return {
        requestedPeriod: {
            startDate: range.startDate,
            endDate: range.endDate,
        },

        nutrients: nutrients.map((nutrient) => {
            const foodIntakes = nutrient.intakes.filter(
                (intake) => intake.source === "FOOD"
            );

            const supplementIntakes = nutrient.intakes.filter(
                (intake) => intake.source === "SUPPLEMENT"
            );

            const fromFood = round(
                foodIntakes.reduce(
                    (sum, intake) => sum + intake.amount,
                    0
                )
            );

            const fromSupplements = round(
                supplementIntakes.reduce(
                    (sum, intake) => sum + intake.amount,
                    0
                )
            );

            const amount = round(fromFood + fromSupplements);

            const target = nutrient.dailyTarget;

            return {
                key: nutrient.key,
                name: nutrient.name,
                category: nutrient.category,
                unit: nutrient.unit,

                fromFood,
                fromSupplements,
                amount,

                target,

                targetPercentage:
                    target !== null && target > 0
                        ? round((amount / target) * 100)
                        : null,

                targetConfigured: target !== null && target > 0,
            };
        }),

        dataCoverage: {
            note:
                "Micronutrient totals reflect recorded food and supplement intakes. They do not establish that unlogged days had zero intake.",
        },
    };
}

/* =========================================
   FOOD HISTORY
========================================= */

export async function getFoodHistory(options = {}) {
    const range = resolveDateRange(options);
    const entries = await fetchNutritionEntries(range);

    return {
        requestedPeriod: {
            startDate: range.startDate,
            endDate: range.endDate,
        },

        recordedDays: calculateCoverage(entries, range).recordedDays,

        totalEntries: entries.length,

        entries: entries.map((entry) => ({
            ...entry,
            entryDate: getEntryDate(entry),
        })),
    };
}

/* =========================================
   MEAL ANALYSIS
========================================= */

export async function getMealAnalysis(options = {}) {
    const range = resolveDateRange(options);
    const entries = await fetchNutritionEntries(range);

    const mealGroups = Object.fromEntries(
        MEAL_TYPES.map((mealType) => [
            mealType,
            entries.filter((entry) => entry.mealType === mealType),
        ])
    );

    const meals = Object.fromEntries(
        MEAL_TYPES.map((mealType) => {
            const mealEntries = mealGroups[mealType];

            return [
                mealType,
                {
                    totalEntries: mealEntries.length,

                    totals: calculateMacroTotals(mealEntries),

                    averagePerEntry:
                        mealEntries.length > 0
                            ? {
                                calories: round(
                                    sumField(mealEntries, "calories") /
                                    mealEntries.length
                                ),
                                protein: round(
                                    sumField(mealEntries, "protein") /
                                    mealEntries.length
                                ),
                                carbs: round(
                                    sumField(mealEntries, "carbs") /
                                    mealEntries.length
                                ),
                                fat: round(
                                    sumField(mealEntries, "fat") /
                                    mealEntries.length
                                ),
                            }
                            : null,
                },
            ];
        })
    );

    return {
        requestedPeriod: {
            startDate: range.startDate,
            endDate: range.endDate,
        },

        coverage: calculateCoverage(entries, range),

        meals,
    };
}
