
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


const validMuscles = [
  "CHEST",
  "BACK",
  "LATS",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "FOREARMS",
  "ABS",
  "OBLIQUES",
  "QUADRICEPS",
  "HAMSTRINGS",
  "GLUTES",
  "CALVES",
  "HIP_FLEXORS",
  "ADDUCTORS",
  "ABDUCTORS",
  "LOWER_BACK",
  "TRAPS",
];

const validExerciseTypes = [
  "COMPOUND",
  "ISOLATION",
];

const validMovementPatterns = [
  "HORIZONTAL_PUSH",
  "VERTICAL_PUSH",
  "HORIZONTAL_PULL",
  "VERTICAL_PULL",
  "SQUAT",
  "HINGE",
  "LUNGE",
  "CARRY",
  "ROTATION",
  "ANTI_ROTATION",
  "FLEXION",
  "EXTENSION",
  "ABDUCTION",
  "ADDUCTION",
  "OTHER",
];

const isValidOptionalEnum = (value, allowedValues) => {
  return value == null || allowedValues.includes(value);
};

const isValidStringArray = (value, allowedValues) => {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "string" &&
        allowedValues.includes(item)
    ) &&
    new Set(value).size === value.length
  );
};

const isValidUrl = (value) => {
  if (value == null || value === "") return true;

  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

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
      primaryMuscle,
      secondaryMuscles,
      exerciseType,
      movementPattern,
      imageUrl,
      imagePublicId,
      videoUrl,
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
    // Validate primary muscle
    if (!isValidOptionalEnum(primaryMuscle, validMuscles)) {
      return res.status(400).json({
        error: "Invalid primary muscle.",
      });
    }

    // Validate secondary muscles
    if (
      secondaryMuscles !== undefined &&
      !isValidStringArray(secondaryMuscles, validMuscles)
    ) {
      return res.status(400).json({
        error: "Secondary muscles must be an array of valid muscle groups without duplicates.",
      });
    }

    // Validate exercise type
    if (!isValidOptionalEnum(exerciseType, validExerciseTypes)) {
      return res.status(400).json({
        error: "Invalid exercise type.",
      });
    }

    // Validate movement pattern
    if (!isValidOptionalEnum(movementPattern, validMovementPatterns)) {
      return res.status(400).json({
        error: "Invalid movement pattern.",
      });
    }

    // Validate image URL
    if (!isValidUrl(imageUrl)) {
      return res.status(400).json({
        error: "Invalid image URL.",
      });
    }

    // Validate video URL
    if (!isValidUrl(videoUrl)) {
      return res.status(400).json({
        error: "Invalid video URL.",
      });
    }

    const exercise = await prisma.exercise.create({
      data: {
        name: name.trim(),
        category,
        equipment: equipment?.trim() || null,
        measurementType,
        description: description?.trim() || null,

        primaryMuscle: primaryMuscle || null,
        secondaryMuscles: secondaryMuscles || [],
        exerciseType: exerciseType || null,
        movementPattern: movementPattern || null,
        imageUrl: imageUrl?.trim() || null,
        imagePublicId: imagePublicId?.trim() || null,
        videoUrl: videoUrl?.trim() || null,

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
      primaryMuscle,
      secondaryMuscles,
      exerciseType,
      movementPattern,
      imageUrl,
      imagePublicId,
      videoUrl,
    } = req.body;

    if (
      name !== undefined &&
      (
        typeof name !== "string" ||
        !name.trim() ||
        name.trim().length > 100
      )
    ) {
      return res.status(400).json({
        error: "Exercise name must be between 1 and 100 characters.",
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
    // Validate primary muscle
    if (!isValidOptionalEnum(primaryMuscle, validMuscles)) {
      return res.status(400).json({
        error: "Invalid primary muscle.",
      });
    }

    // Validate secondary muscles
    if (
      secondaryMuscles !== undefined &&
      !isValidStringArray(secondaryMuscles, validMuscles)
    ) {
      return res.status(400).json({
        error: "Secondary muscles must be an array of valid muscle groups without duplicates.",
      });
    }

    // Validate exercise type
    if (!isValidOptionalEnum(exerciseType, validExerciseTypes)) {
      return res.status(400).json({
        error: "Invalid exercise type.",
      });
    }

    // Validate movement pattern
    if (!isValidOptionalEnum(movementPattern, validMovementPatterns)) {
      return res.status(400).json({
        error: "Invalid movement pattern.",
      });
    }

    // Validate image URL
    if (!isValidUrl(imageUrl)) {
      return res.status(400).json({
        error: "Invalid image URL.",
      });
    }

    // Validate video URL
    if (!isValidUrl(videoUrl)) {
      return res.status(400).json({
        error: "Invalid video URL.",
      });
    }

    const exercise = await prisma.exercise.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(category !== undefined && { category }),
        ...(equipment !== undefined && {
          equipment: equipment?.trim() || null,
        }),
        ...(measurementType !== undefined && { measurementType }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),

        ...(primaryMuscle !== undefined && { primaryMuscle }),
        ...(secondaryMuscles !== undefined && { secondaryMuscles }),
        ...(exerciseType !== undefined && { exerciseType }),
        ...(movementPattern !== undefined && { movementPattern }),
        ...(imageUrl !== undefined && {
          imageUrl: imageUrl?.trim() || null,
        }),
        ...(imagePublicId !== undefined && {
          imagePublicId: imagePublicId?.trim() || null,
        }),
        ...(videoUrl !== undefined && { videoUrl: videoUrl?.trim() || null, }),
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
