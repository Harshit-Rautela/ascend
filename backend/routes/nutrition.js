
import { Router } from "express";
import { analyzeFood } from "../services/nutritionAI.js";
import prisma from "../prisma.js";
import redis from "../redis.js";

const router = Router();

const validMealTypes = ["Breakfast", "Lunch", "Dinner", "Snacks"];

const NUTRITION_CACHE_TTL = 24 * 60 * 60;


function secondsUntilMidnight() {
  const now = new Date();

  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}

function nutritionCacheKey(date) {
  return `nutrition:${date}`;
}

async function invalidateNutritionCache(date) {
  try {
    await redis.del(nutritionCacheKey(date));
  } catch (error) {
    // A cache failure must not undo a successful database write.
    console.error("Could not invalidate nutrition cache:", error.message);
  }
}

router.post("/analyze", async (req, res) => {
  try {
    const { description } = req.body;

    if (
      typeof description !== "string" ||
      !description.trim() ||
      description.trim().length > 500
    ) {
      return res.status(400).json({
        error: "Provide a food description between 1 and 500 characters.",
      });
    }

    const result = await analyzeFood(description.trim());

    if (result.items.length === 0) {
      return res.status(422).json({
        error: result.note || "No recognizable food was found.",
      });
    }

    return res.json(result);
  } catch (error) {
    console.error("Food analysis failed:", error);

    return res.status(502).json({
      error: "Food analysis failed. Please try again.",
    });
  }
});


// POST /api/nutrition — save a food entry

// POST /api/nutrition — save food + micronutrients
router.post("/", async (req, res) => {
  try {
    const {
      foodName,
      mealType,
      calories,
      protein,
      carbs,
      fat,
      entryDate,
      micronutrients = [],
    } = req.body;

    // Validate food name
    if (
      typeof foodName !== "string" ||
      !foodName.trim() ||
      foodName.trim().length > 200
    ) {
      return res.status(400).json({
        error: "A valid food name is required.",
      });
    }

    // Validate meal type
    if (!validMealTypes.includes(mealType)) {
      return res.status(400).json({
        error: "Invalid meal type.",
      });
    }

    // Validate macronutrients
    for (const [key, value] of Object.entries({
      calories,
      protein,
      carbs,
      fat,
    })) {
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 100000
      ) {
        return res.status(400).json({
          error: `${key} must be a valid non-negative number.`,
        });
      }
    }

    // Validate date format and actual calendar date
    if (
      typeof entryDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entryDate)
    ) {
      return res.status(400).json({
        error: "entryDate must use YYYY-MM-DD format.",
      });
    }

    const date = new Date(`${entryDate}T00:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== entryDate
    ) {
      return res.status(400).json({
        error: "Invalid entry date.",
      });
    }

    // Validate micronutrient array
    if (!Array.isArray(micronutrients)) {
      return res.status(400).json({
        error: "micronutrients must be an array.",
      });
    }

    const seenKeys = new Set();

    for (const nutrient of micronutrients) {
      if (
        !nutrient ||
        typeof nutrient.key !== "string" ||
        !nutrient.key.trim() ||
        typeof nutrient.amount !== "number" ||
        !Number.isFinite(nutrient.amount) ||
        nutrient.amount < 0 ||
        nutrient.amount > 100000000 ||
        seenKeys.has(nutrient.key)
      ) {
        return res.status(400).json({
          error: "Invalid or duplicate micronutrient data.",
        });
      }

      seenKeys.add(nutrient.key);
    }

    // Look up all nutrient records before writing anything.
    const nutrientRecords = micronutrients.length
      ? await prisma.nutrient.findMany({
        where: {
          key: {
            in: micronutrients.map((nutrient) => nutrient.key),
          },
        },
        select: {
          id: true,
          key: true,
        },
      })
      : [];

    // Reject keys that do not exist in the nutrient catalog.
    if (nutrientRecords.length !== seenKeys.size) {
      return res.status(400).json({
        error:
          "One or more micronutrient keys are not in the nutrient catalog.",
      });
    }

    const nutrientIdByKey = new Map(
      nutrientRecords.map((nutrient) => [
        nutrient.key,
        nutrient.id,
      ])
    );

    // Save food and nutrient intakes atomically.
    const entry = await prisma.$transaction(async (tx) => {
      const createdEntry = await tx.nutritionEntry.create({
        data: {
          foodName: foodName.trim(),
          mealType,
          calories,
          protein,
          carbs,
          fat,
          entryDate: date,
        },
      });

      if (micronutrients.length > 0) {
        await tx.nutrientIntake.createMany({
          data: micronutrients.map((nutrient) => ({
            nutrientId: nutrientIdByKey.get(nutrient.key),
            amount: nutrient.amount,
            source: "FOOD",
            sourceName: foodName.trim(),
            nutritionEntryId: createdEntry.id,
            entryDate: date,
          })),
        });
      }

      return createdEntry;
    });
    await invalidateNutritionCache(entryDate);


    return res.status(201).json(entry);
  } catch (error) {
    console.error("Error saving nutrition entry:", error);

    return res.status(500).json({
      error: "Failed to save nutrition entry.",
    });
  }
});



/**
 * GET /api/nutrition/weekly?startDate=YYYY-MM-DD
 * Fetch nutrition entries for seven days and calculate daily totals.
 */
router.get("/weekly", async (req, res) => {
  try {
    const { startDate: dateString } = req.query;

    if (
      typeof dateString !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ) {
      return res.status(400).json({
        error: "Provide startDate in YYYY-MM-DD format.",
      });
    }

    const startDate = new Date(`${dateString}T00:00:00.000Z`);

    if (
      Number.isNaN(startDate.getTime()) ||
      startDate.toISOString().slice(0, 10) !== dateString
    ) {
      return res.status(400).json({ error: "Invalid start date." });
    }

    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 7);

    const entries = await prisma.nutritionEntry.findMany({
      where: {
        entryDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Create all seven days, including days with no entries.
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startDate);
      date.setUTCDate(date.getUTCDate() + index);

      return {
        date: date.toISOString().slice(0, 10),
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        entries: 0,
      };
    });

    const dailyTotals = new Map(
      days.map((day) => [day.date, day])
    );

    for (const entry of entries) {
      const date = new Date(entry.entryDate)
        .toISOString()
        .slice(0, 10);

      const day = dailyTotals.get(date);

      if (!day) continue;

      day.calories += Number(entry.calories || 0);
      day.protein += Number(entry.protein || 0);
      day.carbs += Number(entry.carbs || 0);
      day.fat += Number(entry.fat || 0);
      day.entries += 1;
    }

    return res.json({ days });
  } catch (error) {
    console.error("Error fetching weekly nutrition:", error);

    return res.status(500).json({
      error: "Failed to fetch weekly nutrition.",
    });
  }
});


// GET /api/nutrition?date=YYYY-MM-DD — fetch entries for a day
router.get("/", async (req, res) => {
  try {
    const dateString = req.query.date;

    if (
      typeof dateString !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ) {
      return res.status(400).json({
        error: "Provide a date in YYYY-MM-DD format.",
      });
    }

    const startDate = new Date(`${dateString}T00:00:00.000Z`);

    if (
      Number.isNaN(startDate.getTime()) ||
      startDate.toISOString().slice(0, 10) !== dateString
    ) {
      return res.status(400).json({ error: "Invalid date." });
    }

    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 1);

    const cacheKey = nutritionCacheKey(dateString);

    try {
      const cachedData = await redis.get(cacheKey);

      if (cachedData !== null) {
        try {
          return res.json(JSON.parse(cachedData));
        } catch {
          await redis.del(cacheKey).catch(() => { });
        }
      }
    } catch (error) {
      console.error("Nutrition cache read failed:", error.message);
    }


    const entries = await prisma.nutritionEntry.findMany({
      where: {
        entryDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { createdAt: "asc" },
    });


    try {
      await redis.set(
        cacheKey,
        JSON.stringify(entries),
        "EX",
        secondsUntilMidnight()
      );
    } catch (error) {
      console.error("Nutrition cache write failed:", error.message);
    }

    return res.json(entries);

  } catch (error) {
    console.error("Error fetching nutrition entries:", error);
    return res.status(500).json({ error: "Failed to fetch nutrition entries." });
  }
});

router.get("/micronutrients", async (req, res) => {
  try {
    const { date } = req.query;

    // Validate YYYY-MM-DD format.
    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return res.status(400).json({
        error: "A valid date in YYYY-MM-DD format is required.",
      });
    }

    const entryDate = new Date(`${date}T00:00:00.000Z`);

    // Reject impossible calendar dates, such as 2026-02-30.
    if (
      Number.isNaN(entryDate.getTime()) ||
      entryDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).json({
        error: "Invalid calendar date.",
      });
    }

    // Fetch every catalog nutrient, including those with zero intake.
    const nutrients = await prisma.nutrient.findMany({
      orderBy: { name: "asc" },
      include: {
        intakes: {
          where: { entryDate },
          select: {
            amount: true,
            source: true,
          },
        },
      },
    });

    const result = nutrients.map((nutrient) => {
      const fromFood = nutrient.intakes
        .filter((intake) => intake.source === "FOOD")
        .reduce((sum, intake) => sum + intake.amount, 0);

      const fromSupplements = nutrient.intakes
        .filter((intake) => intake.source === "SUPPLEMENT")
        .reduce((sum, intake) => sum + intake.amount, 0);

      return {
        key: nutrient.key,
        name: nutrient.name,
        category: nutrient.category,
        unit: nutrient.unit,
        fromFood,
        fromSupplements,
        amount: fromFood + fromSupplements,
        target: nutrient.dailyTarget
      };
    });

    return res.json({ nutrients: result });
  } catch (error) {
    console.error("Error fetching micronutrient totals:", error);

    return res.status(500).json({
      error: "Failed to fetch micronutrient totals.",
    });
  }
});
// DELETE /api/nutrition/:id — delete a food entry
// router.delete("/:id", async (req, res) => {
//   try {
//     const { id } = req.params;

//     const existingEntry = await prisma.nutritionEntry.findUnique({
//       where: { id },
//     });

//     if (!existingEntry) {
//       return res.status(404).json({ error: "Nutrition entry not found." });
//     }

//     await prisma.nutritionEntry.delete({ where: { id } });

//     return res.json({ message: "Nutrition entry deleted successfully." });
//   } catch (error) {
//     console.error("Error deleting nutrition entry:", error);
//     return res.status(500).json({ error: "Failed to delete nutrition entry." });
//   }
// });


// // DELETE /api/nutrition/:id — delete one nutrition entry
// router.delete("/:id", async (req, res) => {
//   try {
//     const { id } = req.params;

//     const deletedEntry = await prisma.nutritionEntry.delete({
//       where: { id },
//     });

//     return res.status(200).json({
//       message: "Nutrition entry deleted successfully.",
//       entry: deletedEntry,
//     });
//   } catch (error) {
//     if (error.code === "P2025") {
//       return res.status(404).json({
//         error: "Nutrition entry not found.",
//       });
//     }

//     console.error("Error deleting nutrition entry:", error);

//     return res.status(500).json({
//       error: "Failed to delete nutrition entry.",
//     });
//   }
// });


router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existingEntry = await prisma.nutritionEntry.findUnique({
      where: { id },
      select: {
        id: true,
        entryDate: true,
      },
    });

    if (!existingEntry) {
      return res.status(404).json({
        error: "Nutrition entry not found.",
      });
    }

    await prisma.nutritionEntry.delete({
      where: { id },
    });

    // Get the date of the deleted food.
    const date = new Date(existingEntry.entryDate)
      .toISOString()
      .slice(0, 10);

    // Clear the cache for that date.
    await invalidateNutritionCache(date);

    return res.status(200).json({
      message: "Nutrition entry deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting nutrition entry:", error);

    return res.status(500).json({
      error: "Failed to delete nutrition entry.",
    });
  }
});


export default router;
