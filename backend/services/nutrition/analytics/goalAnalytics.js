
/*
 * ASCEND — NUTRITION GOAL ANALYTICS
 *
 * Evaluates recorded micronutrient intake against configured
 * daily targets. Unsupported macro goals remain unavailable.
 */

import { resolveDateRange } from "./dateUtils.js";
import {
    fetchNutrients,
    fetchNutrientIntakes,
} from "./nutritionRepository.js";
import { round } from "./aggregationUtils.js";

export async function getNutritionGoalAnalysis(options = {}) {
    const range = resolveDateRange(options);

    const [nutrients, intakes] = await Promise.all([
        fetchNutrients(),
        fetchNutrientIntakes(range),
    ]);

    const results = nutrients.map((nutrient) => {
        const nutrientIntakes = intakes.filter(
            (intake) => intake.nutrientId === nutrient.id
        );

        const recordedDates = new Set(
            nutrientIntakes.map((intake) =>
                intake.entryDate.toISOString().slice(0, 10)
            )
        );

        const totalIntake = nutrientIntakes.reduce(
            (sum, intake) => sum + intake.amount,
            0
        );

        const recordedDays = recordedDates.size;

        const averageDailyIntake = recordedDays > 0
            ? round(totalIntake / recordedDays)
            : null;

        const target = nutrient.dailyTarget;
        const targetConfigured = target !== null && target > 0;

        const targetPercentage =
            targetConfigured && averageDailyIntake !== null
                ? round((averageDailyIntake / target) * 100)
                : null;

        return {
            nutrient: nutrient.name,
            key: nutrient.key,
            unit: nutrient.unit,

            target,
            targetConfigured,

            totalIntake: round(totalIntake),
            averageDailyIntake,

            recordedDays,
            expectedDays: range.expectedDays,

            targetPercentage,

            comparisonAvailable:
                targetConfigured && averageDailyIntake !== null,
        };
    });

    const configuredTargets = results.filter(
        (item) => item.targetConfigured
    );

    return {
        requestedPeriod: {
            startDate: range.startDate,
            endDate: range.endDate,
            expectedDays: range.expectedDays,
        },

        micronutrientTargets: {
            configuredCount: configuredTargets.length,

            availableCount: configuredTargets.filter(
                (item) => item.comparisonAvailable
            ).length,

            results: configuredTargets,
        },

        unavailableGoals: {
            calories: true,
            protein: true,
            carbs: true,
            fat: true,

            reason:
                "Calorie and macronutrient goals are not currently configured in the database.",
        },

        interpretationNotes: [
            "Average micronutrient intake uses days with recorded intake for each nutrient.",
            "Unrecorded days are not treated as zero intake.",
            "Configured targets are database values, not personalized medical recommendations.",
            "A target comparison alone does not establish nutritional adequacy or deficiency.",
        ],
    };
}


