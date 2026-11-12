
/*
 * ASCEND — MEAL ANALYTICS
 *
 * Analyzes meal-wise nutrition, calorie distribution,
 * and average intake across recorded meal-days.
 */

import { resolveDateRange } from "./dateUtils.js";
import { fetchNutritionEntries } from "./nutritionRepository.js";
import {
    calculateCoverage,
    calculateMacroTotals,
    groupEntriesByDate,
    round,
} from "./aggregationUtils.js";

const MEAL_TYPES = [
    "Breakfast",
    "Lunch",
    "Dinner",
    "Snacks",
];

function calculateMealMetrics(entries, range) {
    const totals = calculateMacroTotals(entries);

    const dailyGroups = groupEntriesByDate(entries);

    const recordedDays = dailyGroups.size;

    const dailyTotals = [...dailyGroups.values()].map(
        (dayEntries) => calculateMacroTotals(dayEntries)
    );

    const averagePerRecordedDay = recordedDays > 0
        ? {
            calories: round(
                totals.calories / recordedDays
            ),
            protein: round(
                totals.protein / recordedDays
            ),
            carbs: round(
                totals.carbs / recordedDays
            ),
            fat: round(
                totals.fat / recordedDays
            ),
        }
        : null;

    return {
        totalEntries: entries.length,

        recordedDays,

        expectedDays: range.expectedDays,

        loggingPercentage: round(
            (recordedDays / range.expectedDays) * 100
        ),

        totals,

        averagePerRecordedDay,

        averagePerEntry: entries.length > 0
            ? {
                calories: round(
                    totals.calories / entries.length
                ),
                protein: round(
                    totals.protein / entries.length
                ),
                carbs: round(
                    totals.carbs / entries.length
                ),
                fat: round(
                    totals.fat / entries.length
                ),
            }
            : null,
    };
}

export async function getMealAnalysis(options = {}) {
    const range = resolveDateRange(options);

    const entries = await fetchNutritionEntries(range);

    const mealGroups = Object.fromEntries(
        MEAL_TYPES.map((mealType) => [
            mealType,
            entries.filter(
                (entry) => entry.mealType === mealType
            ),
        ])
    );

    const totalCalories = entries.reduce(
        (sum, entry) => sum + entry.calories,
        0
    );

    const meals = Object.fromEntries(
        MEAL_TYPES.map((mealType) => {
            const mealEntries = mealGroups[mealType];

            const metrics = calculateMealMetrics(
                mealEntries,
                range
            );

            return [
                mealType,
                {
                    ...metrics,

                    calorieContributionPercentage:
                        totalCalories > 0
                            ? round(
                                (metrics.totals.calories / totalCalories) * 100
                            )
                            : null,
                },
            ];
        })
    );

    const rankedMeals = MEAL_TYPES.map((mealType) => ({
        mealType,
        ...meals[mealType].totals,
    }));

    const mealsWithCalories = rankedMeals.filter(
        (meal) => meals[meal.mealType].totalEntries > 0
    );

    const highestCalorieMeal = [...mealsWithCalories].sort(
        (a, b) => b.calories - a.calories
    )[0] || null;

    const highestProteinMeal = [...mealsWithCalories].sort(
        (a, b) => b.protein - a.protein
    )[0] || null;

    return {
        requestedPeriod: {
            startDate: range.startDate,
            endDate: range.endDate,
        },

        overallCoverage: calculateCoverage(entries, range),

        totalEntries: entries.length,

        totalCalories: round(totalCalories),

        meals,

        comparisons: {
            highestCalorieMeal: highestCalorieMeal?.mealType || null,
            highestProteinMeal: highestProteinMeal?.mealType || null,
        },

        dataLimitations: [
            "Meal averages use days with at least one recorded entry for that meal.",
            "A missing meal entry does not establish that the user skipped that meal.",
        ],
    };
}
