
import { Router } from "express";
import prisma from "../prisma.js";

const router = Router();
console.log("Exercise router loaded");

const validCategories = [
    "STRENGTH",
    "CARDIO",
    "MOBILITY",
    "OTHER",
];

const validMeasurementTypes = [
    "WEIGHT_REPS",
    "BODYWEIGHT_REPS",
    "DURATION",
    "DISTANCE",
    "CARDIO",
];

// GET /api/exercises — fetch the exercise catalog
router.get("/", async (req, res) => {
    console.log("GET /api/exercise reached");
    try {
        const exercises = await prisma.exercise.findMany({
            orderBy: [{ category: "asc" }, { name: "asc" }],
        });

        return res.json({ exercises });
    } catch (error) {
        console.error("Error fetching exercises:", error);

        return res.status(500).json({
            error: "Failed to fetch exercises.",
        });
    }
});

// POST /api/exercises — add a custom exercise
router.post("/", async (req, res) => {
    try {
        const {
            name,
            category,
            equipment,
            measurementType,
            description,
        } = req.body;

        // Validate exercise name
        if (
            typeof name !== "string" ||
            !name.trim() ||
            name.trim().length > 100
        ) {
            return res.status(400).json({
                error: "Exercise name must be between 1 and 100 characters.",
            });
        }

        // Validate category
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                error: "Invalid exercise category.",
            });
        }

        // Validate how performance is measured
        if (!validMeasurementTypes.includes(measurementType)) {
            return res.status(400).json({
                error: "Invalid exercise measurement type.",
            });
        }

        // Validate optional fields
        if (
            equipment != null &&
            (typeof equipment !== "string" || equipment.trim().length > 100)
        ) {
            return res.status(400).json({
                error: "Equipment must be a string of at most 100 characters.",
            });
        }

        if (
            description != null &&
            (typeof description !== "string" ||
                description.trim().length > 500)
        ) {
            return res.status(400).json({
                error: "Description must be a string of at most 500 characters.",
            });
        }

        const exercise = await prisma.exercise.create({
            data: {
                name: name.trim(),
                category,
                equipment: equipment?.trim() || null,
                measurementType,
                description: description?.trim() || null,
                isCustom: true,
            },
        });

        return res.status(201).json({ exercise });
    } catch (error) {
        // Prisma P2002 means a unique constraint was violated.
        if (error.code === "P2002") {
            return res.status(409).json({
                error: "An exercise with this name already exists.",
            });
        }

        console.error("Error creating exercise:", error);

        return res.status(500).json({
            error: "Failed to create exercise.",
        });
    }
});


router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existingExercise = await prisma.exercise.findUnique({
      where: { id },
    });

    if (!existingExercise) {
      return res.status(404).json({
        error: "Exercise not found.",
      });
    }

    if (!existingExercise.isCustom) {
      return res.status(403).json({
        error: "Standard exercises cannot be edited.",
      });
    }

    const {
      name,
      category,
      equipment,
      measurementType,
      description,
    } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({
        error: "Exercise name cannot be empty.",
      });
    }

    if (name !== undefined && name.trim().length > 100) {
      return res.status(400).json({
        error: "Exercise name cannot exceed 100 characters.",
      });
    }

    if (
      category !== undefined &&
      !["STRENGTH", "CARDIO", "MOBILITY", "OTHER"].includes(category)
    ) {
      return res.status(400).json({
        error: "Invalid exercise category.",
      });
    }

    if (
      measurementType !== undefined &&
      ![
        "WEIGHT_REPS",
        "BODYWEIGHT_REPS",
        "DURATION",
        "DISTANCE",
        "CARDIO",
      ].includes(measurementType)
    ) {
      return res.status(400).json({
        error: "Invalid measurement type.",
      });
    }

    if (
      equipment !== undefined &&
      equipment !== null &&
      (typeof equipment !== "string" || equipment.length > 100)
    ) {
      return res.status(400).json({
        error: "Equipment must be at most 100 characters.",
      });
    }

    if (
      description !== undefined &&
      description !== null &&
      (typeof description !== "string" || description.length > 500)
    ) {
      return res.status(400).json({
        error: "Description must be at most 500 characters.",
      });
    }

    if (
      measurementType !== undefined &&
      measurementType !== existingExercise.measurementType
    ) {
      const workoutUsage = await prisma.workoutExercise.count({
        where: { exerciseId: id },
      });

      if (workoutUsage > 0) {
        return res.status(409).json({
          error:
            "Measurement type cannot be changed because this exercise is already used in workouts.",
        });
      }
    }

    const exercise = await prisma.exercise.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(category !== undefined && { category }),
        ...(equipment !== undefined && { equipment }),
        ...(measurementType !== undefined && { measurementType }),
        ...(description !== undefined && { description }),
      },
    });

    return res.json({ exercise });
  } catch (error) {
    console.error("Error updating exercise:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        error: "An exercise with this name already exists.",
      });
    }

    return res.status(500).json({
      error: "Failed to update exercise.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const exercise = await prisma.exercise.findUnique({
      where: { id },
    });

    if (!exercise) {
      return res.status(404).json({
        error: "Exercise not found.",
      });
    }

    if (!exercise.isCustom) {
      return res.status(403).json({
        error: "Standard exercises cannot be deleted.",
      });
    }

    await prisma.exercise.delete({
      where: { id },
    });

    return res.json({
      message: "Exercise deleted successfully.",
      id,
    });
  } catch (error) {
    // PostgreSQL foreign-key restriction.
    if (error.code === "P2003") {
      return res.status(409).json({
        error: "This exercise is used in a workout plan or workout history and cannot be deleted.",
      });
    }

    console.error("Error deleting exercise:", error);

    return res.status(500).json({
      error: "Failed to delete exercise.",
    });
  }
});


export default router;
