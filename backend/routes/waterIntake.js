import { Router } from "express";
import prisma from "../prisma.js";

const router = Router();

const DAILY_GOAL_ML = 2500;

function isValidDate(date) {
  if (typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

// Get water intake for a specific day.
router.get("/", async (req, res, next) => {
  try {
    const { date } = req.query;

    if (!isValidDate(date)) {
      return res.status(400).json({
        message: "A valid date is required in YYYY-MM-DD format.",
      });
    }

    const entryDate = new Date(`${date}T00:00:00.000Z`);

    const [entries, aggregate] = await Promise.all([
      prisma.waterIntake.findMany({
        where: { entryDate },
        orderBy: { createdAt: "desc" },
      }),

      prisma.waterIntake.aggregate({
        where: { entryDate },
        _sum: { amountMl: true },
      }),
    ]);

    const totalMl = aggregate._sum.amountMl ?? 0;

    return res.json({
      date,
      entries,
      totalMl,
      goalMl: DAILY_GOAL_ML,
      remainingMl: Math.max(0, DAILY_GOAL_ML - totalMl),
      percentage: Math.min(
        100,
        Math.round((totalMl / DAILY_GOAL_ML) * 100)
      ),
    });
  } catch (error) {
    next(error);
  }
});

// Record a drink.
router.post("/", async (req, res, next) => {
  try {
    const { amountMl, date } = req.body;

    if (
      !Number.isInteger(amountMl) ||
      amountMl < 1 ||
      amountMl > 2000
    ) {
      return res.status(400).json({
        message: "amountMl must be an integer between 1 and 2000.",
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        message: "A valid date is required in YYYY-MM-DD format.",
      });
    }

    const entry = await prisma.waterIntake.create({
      data: {
        amountMl,
        entryDate: new Date(`${date}T00:00:00.000Z`),
      },
    });

    return res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

export default router;