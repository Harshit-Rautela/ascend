
import { Router } from "express";
import prisma from "../prisma.js";

const router = Router();

const validDayOfWeek = (value) =>
  Number.isInteger(value) && value >= 0 && value <= 6;

const validOptionalNumber = (value, { integer = false } = {}) =>
  value === undefined ||
  value === null ||
  (typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    (!integer || Number.isInteger(value)));

const dayInclude = {
  exercises: {
    orderBy: { sortOrder: "asc" },
    include: { exercise: true },
  },
};

// GET /api/training-plans — retrieve the active weekly plan
router.get("/", async (req, res) => {
    console.log("In training plans")
  try {
    const plan = await prisma.trainingPlan.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      include: {
        days: {
          orderBy: { dayOfWeek: "asc" },
          include: dayInclude,
        },
      },
    });

    if (!plan) {
      return res.status(404).json({
        error: "No active training plan exists. Create one first.",
      });
    }

    return res.json({ plan });
  } catch (error) {
    console.error("Error fetching training plan:", error);

    return res.status(500).json({
      error: "Failed to fetch training plan.",
    });
  }
});

// POST /api/training-plans — create a weekly plan with seven days
router.post("/", async (req, res) => {
  try {
    const name =
      typeof req.body?.name === "string" && req.body.name.trim()
        ? req.body.name.trim()
        : "My Weekly Plan";

    if (name.length > 100) {
      return res.status(400).json({
        error: "Plan name must not exceed 100 characters.",
      });
    }

    const existingPlan = await prisma.trainingPlan.findFirst({
      where: { isActive: true },
    });

    if (existingPlan) {
      return res.status(409).json({
        error: "An active training plan already exists.",
        planId: existingPlan.id,
      });
    }

    const plan = await prisma.trainingPlan.create({
      data: {
        name,
        isActive: true,
        days: {
          create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
            dayOfWeek,
            isRestDay: false,
          })),
        },
      },
      include: {
        days: {
          orderBy: { dayOfWeek: "asc" },
          include: dayInclude,
        },
      },
    });

    return res.status(201).json({ plan });
  } catch (error) {
    console.error("Error creating training plan:", error);

    return res.status(500).json({
      error: "Failed to create training plan.",
    });
  }
});

// PUT /api/training-plans/days/:dayOfWeek
// Replace the planned exercises and settings for one day.
router.put("/days/:dayOfWeek", async (req, res) => {
  try {
    const dayOfWeek = Number(req.params.dayOfWeek);
    const { isRestDay = false, notes = null, exercises = [] } = req.body ?? {};

    if (!validDayOfWeek(dayOfWeek)) {
      return res.status(400).json({
        error: "dayOfWeek must be an integer from 0 (Sunday) to 6 (Saturday).",
      });
    }

    if (
      typeof isRestDay !== "boolean" ||
      (notes !== null &&
        (typeof notes !== "string" || notes.length > 500)) ||
      !Array.isArray(exercises)
    ) {
      return res.status(400).json({
        error: "Invalid day settings or exercises.",
      });
    }

    if (isRestDay && exercises.length > 0) {
      return res.status(400).json({
        error: "A rest day cannot contain planned exercises.",
      });
    }

    if (exercises.length > 100) {
      return res.status(400).json({
        error: "A day cannot contain more than 100 exercises.",
      });
    }

    const seenExerciseIds = new Set();

    for (const [index, item] of exercises.entries()) {
      if (
        !item ||
        typeof item.exerciseId !== "string" ||
        !item.exerciseId.trim() ||
        seenExerciseIds.has(item.exerciseId)
      ) {
        return res.status(400).json({
          error: "Every exercise must have a unique, valid exerciseId.",
        });
      }

      seenExerciseIds.add(item.exerciseId);

      if (
        !validOptionalNumber(item.targetSets, { integer: true }) ||
        !validOptionalNumber(item.targetReps, { integer: true }) ||
        !validOptionalNumber(item.targetWeightKg) ||
        !validOptionalNumber(item.targetDurationSeconds, {
          integer: true,
        }) ||
        !validOptionalNumber(item.targetDistanceMeters)
      ) {
        return res.status(400).json({
          error: `Invalid target values for exercise at position ${index}.`,
        });
      }

      if (
        item.notes != null &&
        (typeof item.notes !== "string" || item.notes.length > 500)
      ) {
        return res.status(400).json({
          error: `Invalid notes for exercise at position ${index}.`,
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const plan = await tx.trainingPlan.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

      if (!plan) {
        return null;
      }

      // Ensure every requested exercise exists before changing the plan.
      if (seenExerciseIds.size > 0) {
        const matchingExercises = await tx.exercise.count({
          where: { id: { in: [...seenExerciseIds] } },
        });

        if (matchingExercises !== seenExerciseIds.size) {
          throw new Error("INVALID_EXERCISE_IDS");
        }
      }

      const day = await tx.planDay.upsert({
        where: {
          trainingPlanId_dayOfWeek: {
            trainingPlanId: plan.id,
            dayOfWeek,
          },
        },
        create: {
          trainingPlanId: plan.id,
          dayOfWeek,
          isRestDay,
          notes: notes?.trim() || null,
        },
        update: {
          isRestDay,
          notes: notes?.trim() || null,
        },
      });

      // Replace only this day's planned exercises.
      await tx.planExercise.deleteMany({
        where: { planDayId: day.id },
      });

      if (exercises.length > 0) {
        await tx.planExercise.createMany({
          data: exercises.map((item, sortOrder) => ({
            planDayId: day.id,
            exerciseId: item.exerciseId,
            sortOrder,
            targetSets: item.targetSets ?? null,
            targetReps: item.targetReps ?? null,
            targetWeightKg: item.targetWeightKg ?? null,
            targetDurationSeconds: item.targetDurationSeconds ?? null,
            targetDistanceMeters: item.targetDistanceMeters ?? null,
            notes: item.notes?.trim() || null,
          })),
        });
      }

      return tx.planDay.findUnique({
        where: { id: day.id },
        include: dayInclude,
      });
    });

    if (!result) {
      return res.status(404).json({
        error: "No active training plan exists. Create one first.",
      });
    }

    return res.json({ day: result });
  } catch (error) {
    if (error.message === "INVALID_EXERCISE_IDS") {
      return res.status(400).json({
        error: "One or more exercise IDs do not exist.",
      });
    }

    console.error("Error updating training plan day:", error);

    return res.status(500).json({
      error: "Failed to update training plan day.",
    });
  }
});

export default router;
