
/*
 * ASCEND — NUTRITION CONSISTENCY ANALYTICS
 *
 * Measures nutrition logging frequency, consecutive
 * logging streaks, and gaps between recorded days.
 */

import { resolveDateRange } from "./dateUtils.js";
import { fetchNutritionEntries } from "./nutritionRepository.js";
import {
    calculateCoverage,
} from "./aggregationUtils.js";

function getUniqueSortedDates(entries) {
    return [
        ...new Set(
            entries.map((entry) =>
                entry.entryDate.toISOString().slice(0, 10)
            )
        ),
    ].sort();
}

function getDayDifference(firstDate, secondDate) {
    const first = new Date(`${firstDate}T00:00:00.000Z`);
    const second = new Date(`${secondDate}T00:00:00.000Z`);

    return Math.round(
        (second - first) / (24 * 60 * 60 * 1000)
    );
}

function calculateStreaks(recordedDates, endDate) {
    if (recordedDates.length === 0) {
        return {
            currentStreak: 0,
            longestStreak: 0,
        };
    }

    let longestStreak = 1;
    let runningStreak = 1;

    for (let i = 1; i < recordedDates.length; i++) {
        const difference = getDayDifference(
            recordedDates[i - 1],
            recordedDates[i]
        );

        if (difference === 1) {
            runningStreak += 1;
        } else {
            runningStreak = 1;
        }

        longestStreak = Math.max(
            longestStreak,
            runningStreak
        );
    }

    const latestRecordedDate =
        recordedDates[recordedDates.length - 1];

    // Current streak is valid only if logging reaches
    // the requested end date without a missing day.
    let currentStreak = 0;

    if (latestRecordedDate === endDate) {
        currentStreak = 1;

        for (let i = recordedDates.length - 1; i > 0; i--) {
            if (
                getDayDifference(
                    recordedDates[i - 1],
                    recordedDates[i]
                ) === 1
            ) {
                currentStreak += 1;
            } else {
                break;
            }
        }
    }

    return {
        currentStreak,
        longestStreak,
    };
}

function calculateLongestGap(recordedDates) {
    if (recordedDates.length < 2) {
        return null;
    }

    let longestGap = 0;

    for (let i = 1; i < recordedDates.length; i++) {
        const difference = getDayDifference(
            recordedDates[i - 1],
            recordedDates[i]
        );

        const missingDays = difference - 1;

        longestGap = Math.max(
            longestGap,
            missingDays
        );
    }

    return longestGap;
}

export async function getNutritionConsistency(options = {}) {
    const range = resolveDateRange(options);

    const entries = await fetchNutritionEntries(range);

    const recordedDates = getUniqueSortedDates(entries);

    const coverage = calculateCoverage(entries, range);

    const streaks = calculateStreaks(
        recordedDates,
        range.endDate
    );

    return {
        requestedPeriod: {
            startDate: range.startDate,
            endDate: range.endDate,
            expectedDays: range.expectedDays,
        },

        coverage,

        tracking: {
            recordedDays: recordedDates.length,
            unrecordedDays: coverage.unrecordedDays,
            loggingPercentage: coverage.coveragePercentage,
            totalEntries: entries.length,
            averageEntriesPerRecordedDay:
                recordedDates.length > 0
                    ? Number(
                        (entries.length / recordedDates.length).toFixed(2)
                    )
                    : null,
        },

        streaks,

        latestRecordedDate:
            recordedDates.length > 0
                ? recordedDates[recordedDates.length - 1]
                : null,

        longestGapBetweenRecordedDays:
            calculateLongestGap(recordedDates),

        recordedDates,

        interpretationNotes: [
            "Consistency measures food logging activity, not dietary quality.",
            "The current streak is counted only when the requested end date is recorded.",
            "A missing log does not prove that a meal was skipped.",
        ],
    };
}
