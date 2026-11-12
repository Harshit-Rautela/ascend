
/*
 * ASCEND — MICRONUTRIENT ANALYTICS
 *
 * Analyzes vitamin and mineral intake from food and
 * supplements using configured daily nutrient targets.
 */

import {
    resolveDateRange,
} from "./dateUtils.js";

import {
    fetchNutrientIntakes,
    fetchNutrients,
} from "./nutritionRepository.js";

import {
    round,
} from "./aggregationUtils.js";

import {
    formatDate,
} from "./dateUtils.js";

function calculateNutrientMetrics(nutrient, intakes, range) {
    const foodIntakes = intakes.filter(
        (intake) => intake.source === "FOOD"
    );

    const supplementIntakes = intakes.filter(
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

    const totalIntake = round(fromFood + fromSupplements);

    const recordedDates = new Set(
        intakes.map((intake) => formatDate(intake.entryDate))
    );

    const recordedDays = recordedDates.size;

    const averageDailyIntake = recordedDays > 0
        ? round(totalIntake / recordedDays)
        : null;

    const target = nutrient.dailyTarget;

    return {
        key: nutrient.key,
        name: nutrient.name,
        category: nutrient.category,
        unit: nutrient.unit,

        fromFood,
        fromSupplements,
        totalIntake,

        recordedDays,
        expectedDays: range.expectedDays,

        averageDailyIntake,

        dailyTarget: target,

        targetPercentage:
            averageDailyIntake !== null &&
                target !== null &&
                target > 0
                ? round((averageDailyIntake / target) * 100)
                : null,

        targetConfigured: target !== null && target > 0,

        dataAvailable: recordedDays > 0,
    };
}

function calculateNutrientStatus(nutrient) {
    if (!nutrient.targetConfigured) {
        return "TARGET_NOT_CONFIGURED";
    }

    if (!nutrient.dataAvailable) {
        return "NO_DATA";
    }

    const percentage = nutrient.targetPercentage;

    if (percentage < 80) {
        return "BELOW_TARGET";
    }

    if (percentage <= 120) {
        return "MEETING_TARGET";
    }

    return "ABOVE_TARGET";
}

/**
 * Returns nutrients below their configured targets.
 */
function getNutrientDeficiencies(nutrients) {
    return nutrients
        .filter(nutrient =>
            nutrient.targetConfigured &&
            nutrient.dataAvailable &&
            nutrient.targetPercentage < 80
        )
        .sort((a, b) =>
            a.targetPercentage - b.targetPercentage
        );
}

/**
 * Returns nutrients exceeding their configured targets.
 */
function getNutrientExcesses(nutrients) {
    return nutrients
        .filter(nutrient =>
            nutrient.targetConfigured &&
            nutrient.dataAvailable &&
            nutrient.targetPercentage > 120
        )
        .sort((a, b) =>
            b.targetPercentage - a.targetPercentage
        );
}

/**
 * Compares nutrient contributions from food and supplements.
 */
function getNutrientSources(nutrients) {
    return nutrients.map(nutrient => {
        const total = nutrient.totalIntake;

        return {
            key: nutrient.key,
            name: nutrient.name,
            unit: nutrient.unit,

            fromFood: nutrient.fromFood,
            fromSupplements: nutrient.fromSupplements,

            foodPercentage: total > 0
                ? round((nutrient.fromFood / total) * 100)
                : null,

            supplementPercentage: total > 0
                ? round((nutrient.fromSupplements / total) * 100)
                : null,
        };
    });
}

/**
 * Ranks nutrients by target coverage.
 * Nutrients without configured targets are excluded.
 */
function getNutrientRanking(nutrients) {
    return nutrients
        .filter(nutrient =>
            nutrient.targetConfigured &&
            nutrient.dataAvailable
        )
        .sort((a, b) =>
            b.targetPercentage - a.targetPercentage
        )
        .map((nutrient, index) => ({
            rank: index + 1,
            key: nutrient.key,
            name: nutrient.name,
            targetPercentage: nutrient.targetPercentage,
            averageDailyIntake: nutrient.averageDailyIntake,
            dailyTarget: nutrient.dailyTarget,
            unit: nutrient.unit,
        }));
}

/**
 * Identifies nutrient records with insufficient tracking data.
 */
function getNutrientDataQuality(nutrients, expectedDays) {
    return {
        totalNutrients: nutrients.length,

        nutrientsWithData: nutrients.filter(
            nutrient => nutrient.dataAvailable
        ).length,

        nutrientsWithoutData: nutrients.filter(
            nutrient => !nutrient.dataAvailable
        ).length,

        nutrientsWithoutTarget: nutrients.filter(
            nutrient => !nutrient.targetConfigured
        ).length,

        lowCoverageNutrients: nutrients
            .filter(nutrient =>
                nutrient.recordedDays > 0 &&
                nutrient.recordedDays < expectedDays
            )
            .map(nutrient => ({
                key: nutrient.key,
                name: nutrient.name,
                recordedDays: nutrient.recordedDays,
                expectedDays,
                coveragePercentage: round(
                    (nutrient.recordedDays / expectedDays) * 100
                ),
            })),
    };
}

/**
 * Generates a high-level micronutrient summary.
 */
function getMicronutrientSummary(nutrients) {
    const belowTarget = getNutrientDeficiencies(nutrients);
    const aboveTarget = getNutrientExcesses(nutrients);

    const configuredNutrients = nutrients.filter(
        nutrient => nutrient.targetConfigured
    );

    const nutrientsWithData = configuredNutrients.filter(
        nutrient => nutrient.dataAvailable
    );

    return {
        totalNutrients: nutrients.length,

        configuredTargets: configuredNutrients.length,

        nutrientsWithData: nutrientsWithData.length,

        belowTargetCount: belowTarget.length,

        meetingTargetCount: nutrientsWithData.filter(
            nutrient =>
                nutrient.targetPercentage >= 80 &&
                nutrient.targetPercentage <= 120
        ).length,

        aboveTargetCount: aboveTarget.length,

        belowTarget: belowTarget.map(nutrient => ({
            key: nutrient.key,
            name: nutrient.name,
            targetPercentage: nutrient.targetPercentage,
            unit: nutrient.unit,
        })),

        aboveTarget: aboveTarget.map(nutrient => ({
            key: nutrient.key,
            name: nutrient.name,
            targetPercentage: nutrient.targetPercentage,
            unit: nutrient.unit,
        })),
    };
}


export async function getMicronutrientAnalysis(options = {}) {
    const range = resolveDateRange(options);

    const [nutrients, intakes] = await Promise.all([
        fetchNutrients(),
        fetchNutrientIntakes(range),
    ]);

    const intakesByNutrient = new Map();

    for (const intake of intakes) {
        if (!intakesByNutrient.has(intake.nutrientId)) {
            intakesByNutrient.set(intake.nutrientId, []);
        }

        intakesByNutrient.get(intake.nutrientId).push(intake);
    }


    const nutrientMetrics = nutrients.map(nutrient =>
        calculateNutrientMetrics(
            nutrient,
            intakesByNutrient.get(nutrient.id) || [],
            range
        )
    ).map(nutrient => ({
        ...nutrient,
        status: calculateNutrientStatus(nutrient),
    }));

    return {
        requestedPeriod: {
            startDate: range.startDate,
            endDate: range.endDate,
            expectedDays: range.expectedDays,
        },

        summary: getMicronutrientSummary(nutrientMetrics),

        nutrients: nutrientMetrics,

        belowTarget: getNutrientDeficiencies(nutrientMetrics),

        aboveTarget: getNutrientExcesses(nutrientMetrics),

        sourceBreakdown: getNutrientSources(nutrientMetrics),

        ranking: getNutrientRanking(nutrientMetrics),

        dataQuality: getNutrientDataQuality(
            nutrientMetrics,
            range.expectedDays
        ),

        dataCoverage: {
            note:
                "Average daily intake is calculated using days with recorded intake for each nutrient. Unrecorded days are not treated as zero intake.",
        },
    };

}
