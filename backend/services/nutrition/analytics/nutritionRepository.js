
/*
 * ASCEND — NUTRITION REPOSITORY
 *
 * Handles database retrieval for nutrition analytics.
 * Contains no business calculations or AI logic.
 */

import prisma from "../../../prisma.js";

export async function fetchNutritionEntries(range) {
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
            createdAt: true,
        },
    });
}

export async function fetchNutrientIntakes(range) {
    return prisma.nutrientIntake.findMany({
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
            amount: true,
            source: true,
            sourceName: true,
            entryDate: true,
            nutrientId: true,
            nutrient: {
                select: {
                    id: true,
                    key: true,
                    name: true,
                    unit: true,
                    category: true,
                    dailyTarget: true,
                },
            },
        },
    });
}

export async function fetchNutrients() {
    return prisma.nutrient.findMany({
        orderBy: {
            name: "asc",
        },
        select: {
            id: true,
            key: true,
            name: true,
            unit: true,
            category: true,
            dailyTarget: true,
        },
    });
}
