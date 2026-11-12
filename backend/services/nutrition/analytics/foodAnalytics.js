
/*
 * ASCEND — FOOD ANALYTICS
 *
 * Analyzes food frequency, nutritional contributions,
 * and food variety from recorded nutrition entries.
 */

import { resolveDateRange } from "./dateUtils.js";
import { fetchNutritionEntries } from "./nutritionRepository.js";
import {
    calculateCoverage,
    round,
} from "./aggregationUtils.js";

function normalizeFoodName(name) {
    return name.trim().toLowerCase();
}

function groupFoods(entries) {
    const foodMap = new Map();

    for (const entry of entries) {
        const normalizedName = normalizeFoodName(entry.foodName);

        if (!foodMap.has(normalizedName)) {
            foodMap.set(normalizedName, {
                foodName: entry.foodName.trim(),
                normalizedName,
                frequency: 0,
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                dates: new Set(),
            });
        }

        const food = foodMap.get(normalizedName);

        food.frequency += 1;
        food.calories += entry.calories;
        food.protein += entry.protein;
        food.carbs += entry.carbs;
        food.fat += entry.fat;
        food.dates.add(entry.entryDate.toISOString().slice(0, 10));
    }

    return [...foodMap.values()].map((food) => ({
        foodName: food.foodName,
        frequency: food.frequency,
        recordedDays: food.dates.size,
        calories: round(food.calories),
        protein: round(food.protein),
        carbs: round(food.carbs),
        fat: round(food.fat),
    }));
}

function sortFoods(foods, metric) {
    return [...foods].sort((a, b) => b[metric] - a[metric]);
}

function calculateFoodVariety(foods, entries) {
    const uniqueFoods = foods.length;

    const totalEntries = entries.length;

    return {
        uniqueFoods,
        totalEntries,
        uniqueFoodPercentage: totalEntries > 0
            ? round((uniqueFoods / totalEntries) * 100)
            : null,
    };
}

export async function getFoodFrequency(options = {}) {
    const range = resolveDateRange(options);

    const entries = await fetchNutritionEntries(range);

    const foods = groupFoods(entries);

    const limit = Math.min(
        Math.max(Number(options.limit) || 20, 1),
        100
    );

    return {
        requestedPeriod: {
            startDate: range.startDate,
            endDate: range.endDate,
        },

        coverage: calculateCoverage(entries, range),

        totalEntries: entries.length,

        uniqueFoods: foods.length,

        foodsByFrequency: sortFoods(foods, "frequency").slice(0, limit),

        foodVariety: calculateFoodVariety(foods, entries),
    };
}

export async function getFoodContribution(options = {}) {
    const range = resolveDateRange(options);

    const entries = await fetchNutritionEntries(range);

    const foods = groupFoods(entries);

    const totalCalories = entries.reduce(
        (sum, entry) => sum + entry.calories,
        0
    );

    const totalProtein = entries.reduce(
        (sum, entry) => sum + entry.protein,
        0
    );

    const limit = Math.min(
        Math.max(Number(options.limit) || 20, 1),
        100
    );

    const foodsWithContribution = foods.map((food) => ({
        ...food,

        calorieContributionPercentage:
            totalCalories > 0
                ? round((food.calories / totalCalories) * 100)
                : null,

        proteinContributionPercentage:
            totalProtein > 0
                ? round((food.protein / totalProtein) * 100)
                : null,
    }));

    return {
        requestedPeriod: {
            startDate: range.startDate,
            endDate: range.endDate,
        },

        coverage: calculateCoverage(entries, range),

        totals: {
            calories: round(totalCalories),
            protein: round(totalProtein),
        },

        highestCalorieFoods: sortFoods(
            foodsWithContribution,
            "calories"
        ).slice(0, limit),

        highestProteinFoods: sortFoods(
            foodsWithContribution,
            "protein"
        ).slice(0, limit),
    };
}
