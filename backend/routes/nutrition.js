
import { Router } from "express";
import { analyzeFood } from "../services/nutritionAI.js";
import prisma from "../prisma.js";

const router = Router();

const validMealTypes = ["Breakfast", "Lunch", "Dinner", "Snacks"];

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
    } = req.body;

    if (
      typeof foodName !== "string" ||
      !foodName.trim() ||
      foodName.trim().length > 200
    ) {
      return res.status(400).json({ error: "A valid food name is required." });
    }

    if (!validMealTypes.includes(mealType)) {
      return res.status(400).json({ error: "Invalid meal type." });
    }

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
      return res.status(400).json({ error: "Invalid entry date." });
    }

    const entry = await prisma.nutritionEntry.create({
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

    return res.status(201).json(entry);
  } catch (error) {
    console.error("Error saving nutrition entry:", error);
    return res.status(500).json({ error: "Failed to save nutrition entry." });
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

    const entries = await prisma.nutritionEntry.findMany({
      where: {
        entryDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.json(entries);
  } catch (error) {
    console.error("Error fetching nutrition entries:", error);
    return res.status(500).json({ error: "Failed to fetch nutrition entries." });
  }
});

// DELETE /api/nutrition/:id — delete a food entry
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existingEntry = await prisma.nutritionEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return res.status(404).json({ error: "Nutrition entry not found." });
    }

    await prisma.nutritionEntry.delete({ where: { id } });

    return res.json({ message: "Nutrition entry deleted successfully." });
  } catch (error) {
    console.error("Error deleting nutrition entry:", error);
    return res.status(500).json({ error: "Failed to delete nutrition entry." });
  }
});


 // DELETE /api/nutrition/:id — delete one nutrition entry
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const deletedEntry = await prisma.nutritionEntry.delete({
            where: { id },
        });

        return res.status(200).json({
            message: "Nutrition entry deleted successfully.",
            entry: deletedEntry,
        });
    } catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({
                error: "Nutrition entry not found.",
            });
        }

        console.error("Error deleting nutrition entry:", error);

        return res.status(500).json({
            error: "Failed to delete nutrition entry.",
        });
    }
});


export default router;
