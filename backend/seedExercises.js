
import prisma from "./prisma.js";

const exercises = [
  // ==========================================
  // STRENGTH — WEIGHT AND REPS
  // ==========================================

  {
    name: "Barbell Bench Press",
    category: "STRENGTH",
    equipment: "Barbell, Bench",
    measurementType: "WEIGHT_REPS",
    description:
      "Compound chest exercise targeting the chest, shoulders, and triceps.",
    primaryMuscle: "CHEST",
    secondaryMuscles: ["TRICEPS", "SHOULDERS"],
    exerciseType: "COMPOUND",
    movementPattern: "HORIZONTAL_PUSH",
    imageUrl: null,
    videoUrl: null,
  },
  {
    name: "Barbell Squat",
    category: "STRENGTH",
    equipment: "Barbell, Squat Rack",
    measurementType: "WEIGHT_REPS",
    description:
      "Compound lower-body exercise targeting the quadriceps and glutes.",
    primaryMuscle: "QUADRICEPS",
    secondaryMuscles: ["GLUTES", "HAMSTRINGS", "ABS"],
    exerciseType: "COMPOUND",
    movementPattern: "SQUAT",
    imageUrl: null,
    videoUrl: null,
  },
  {
    name: "Deadlift",
    category: "STRENGTH",
    equipment: "Barbell",
    measurementType: "WEIGHT_REPS",
    description:
      "Compound hip-hinge exercise targeting the posterior chain.",
    primaryMuscle: "HAMSTRINGS",
    secondaryMuscles: ["GLUTES", "LOWER_BACK", "TRAPS"],
    exerciseType: "COMPOUND",
    movementPattern: "HINGE",
    imageUrl: null,
    videoUrl: null,
  },
  {
    name: "Dumbbell Shoulder Press",
    category: "STRENGTH",
    equipment: "Dumbbells",
    measurementType: "WEIGHT_REPS",
    description:
      "Pressing exercise targeting the shoulders and triceps.",
    primaryMuscle: "SHOULDERS",
    secondaryMuscles: ["TRICEPS", "ABS"],
    exerciseType: "COMPOUND",
    movementPattern: "VERTICAL_PUSH",
    imageUrl: null,
    videoUrl: null,
  },
  {
    name: "Dumbbell Row",
    category: "STRENGTH",
    equipment: "Dumbbells, Bench",
    measurementType: "WEIGHT_REPS",
    description:
      "Pulling exercise targeting the back and biceps.",
    primaryMuscle: "BACK",
    secondaryMuscles: ["LATS", "BICEPS", "TRAPS"],
    exerciseType: "COMPOUND",
    movementPattern: "HORIZONTAL_PULL",
    imageUrl: null,
    videoUrl: null,
  },
  {
    name: "Lat Pulldown",
    category: "STRENGTH",
    equipment: "Cable Machine",
    measurementType: "WEIGHT_REPS",
    description:
      "Vertical pulling exercise targeting the lats and biceps.",
    primaryMuscle: "LATS",
    secondaryMuscles: ["BICEPS", "BACK"],
    exerciseType: "COMPOUND",
    movementPattern: "VERTICAL_PULL",
    imageUrl: null,
    videoUrl: null,
  },
  {
    name: "Leg Press",
    category: "STRENGTH",
    equipment: "Leg Press Machine",
    measurementType: "WEIGHT_REPS",
    description:
      "Machine-based lower-body pushing exercise targeting the quadriceps and glutes.",
    primaryMuscle: "QUADRICEPS",
    secondaryMuscles: ["GLUTES", "HAMSTRINGS"],
    exerciseType: "COMPOUND",
    movementPattern: "SQUAT",
    imageUrl: null,
    videoUrl: null,
  },
  {
    name: "Dumbbell Bicep Curl",
    category: "STRENGTH",
    equipment: "Dumbbells",
    measurementType: "WEIGHT_REPS",
    description:
      "Isolation exercise targeting the biceps.",
    primaryMuscle: "BICEPS",
    secondaryMuscles: ["FOREARMS"],
    exerciseType: "ISOLATION",
    movementPattern: "FLEXION",
    imageUrl: null,
    videoUrl: null,
  },

  // ==========================================
  // BODYWEIGHT EXERCISES
  // ==========================================

  {
    name: "Push-up",
    category: "STRENGTH",
    equipment: "None",
    measurementType: "BODYWEIGHT_REPS",
    description:
      "Bodyweight pushing exercise targeting the chest, shoulders, and triceps.",
    primaryMuscle: "CHEST",
    secondaryMuscles: ["TRICEPS", "SHOULDERS", "ABS"],
    exerciseType: "COMPOUND",
    movementPattern: "HORIZONTAL_PUSH",
    imageUrl: null,
    videoUrl: null,
  },
  {
    name: "Pull-up",
    category: "STRENGTH",
    equipment: "Pull-up Bar",
    measurementType: "BODYWEIGHT_REPS",
    description:
      "Bodyweight pulling exercise targeting the back and biceps.",
    primaryMuscle: "LATS",
    secondaryMuscles: ["BICEPS", "BACK", "FOREARMS"],
    exerciseType: "COMPOUND",
    movementPattern: "VERTICAL_PULL",
    imageUrl: null,
    videoUrl: null,
  },
  {
    name: "Bodyweight Squat",
    category: "STRENGTH",
    equipment: "None",
    measurementType: "BODYWEIGHT_REPS",
    description:
      "Squat variation performed without external weights, targeting the quadriceps and glutes.",
    primaryMuscle: "QUADRICEPS",
    secondaryMuscles: ["GLUTES", "HAMSTRINGS"],
    exerciseType: "COMPOUND",
    movementPattern: "SQUAT",
    imageUrl: null,
    videoUrl: null,
  },
  {
    name: "Plank",
    category: "STRENGTH",
    equipment: "Exercise Mat",
    measurementType: "DURATION",
    description:
      "Isometric core exercise that develops abdominal stability and endurance.",
    primaryMuscle: "ABS",
    secondaryMuscles: ["OBLIQUES", "SHOULDERS", "GLUTES"],
    exerciseType: "ISOLATION",
    movementPattern: "ANTI_ROTATION",
    imageUrl: null,
    videoUrl: null,
  },

  // ==========================================
  // CARDIO
  // ==========================================

  {
    name: "Running",
    category: "CARDIO",
    equipment: "Running Shoes",
    measurementType: "DISTANCE",
    description:
      "Cardiovascular activity that improves aerobic endurance and stamina.",
    primaryMuscle: "QUADRICEPS",
    secondaryMuscles: ["HAMSTRINGS", "GLUTES", "CALVES"],
    exerciseType: "COMPOUND",
    movementPattern: "OTHER",
    imageUrl: null,
    videoUrl: null,
  },
  {
    name: "Cycling",
    category: "CARDIO",
    equipment: "Bicycle or Stationary Bike",
    measurementType: "DISTANCE",
    description:
      "Low-impact cardiovascular activity that develops lower-body endurance.",
    primaryMuscle: "QUADRICEPS",
    secondaryMuscles: ["GLUTES", "HAMSTRINGS", "CALVES"],
    exerciseType: "COMPOUND",
    movementPattern: "OTHER",
    imageUrl: null,
    videoUrl: null,
  },
  {
    name: "Jump Rope",
    category: "CARDIO",
    equipment: "Jump Rope",
    measurementType: "DURATION",
    description:
      "Cardiovascular conditioning exercise that improves coordination and endurance.",
    primaryMuscle: "CALVES",
    secondaryMuscles: ["QUADRICEPS", "SHOULDERS", "ABS"],
    exerciseType: "COMPOUND",
    movementPattern: "OTHER",
    imageUrl: null,
    videoUrl: null,
  },

  // ==========================================
  // MOBILITY
  // ==========================================

  {
    name: "Cat-Cow Stretch",
    category: "MOBILITY",
    equipment: "Exercise Mat",
    measurementType: "DURATION",
    description:
      "Gentle spinal mobility movement that alternates between spinal flexion and extension.",
    primaryMuscle: "LOWER_BACK",
    secondaryMuscles: ["ABS"],
    exerciseType: "COMPOUND",
    movementPattern: "FLEXION",
    imageUrl: null,
    videoUrl: null,
  },
  {
    name: "World's Greatest Stretch",
    category: "MOBILITY",
    equipment: "Exercise Mat",
    measurementType: "BODYWEIGHT_REPS",
    description:
      "Dynamic mobility movement that improves hip, thoracic spine, and upper-body mobility.",
    primaryMuscle: "HIP_FLEXORS",
    secondaryMuscles: ["GLUTES", "HAMSTRINGS", "OBLIQUES"],
    exerciseType: "COMPOUND",
    movementPattern: "LUNGE",
    imageUrl: null,
    videoUrl: null,
  },
  {
    name: "Shoulder Circles",
    category: "MOBILITY",
    equipment: "None",
    measurementType: "DURATION",
    description:
      "Controlled shoulder movement that helps warm up the shoulder joints and surrounding muscles.",
    primaryMuscle: "SHOULDERS",
    secondaryMuscles: ["TRAPS"],
    exerciseType: "ISOLATION",
    movementPattern: "OTHER",
    imageUrl: null,
    videoUrl: null,
  },
];

// Fields that should be refreshed whenever the seed runs.
const exerciseUpdateFields = [
  "category",
  "equipment",
  "measurementType",
  "description",
  "primaryMuscle",
  "secondaryMuscles",
  "exerciseType",
  "movementPattern",
  "imageUrl",
  "videoUrl",
];

async function main() {
  let created = 0;
  let updated = 0;

  for (const exercise of exercises) {
    // Check whether this exercise already exists.
    const existingExercise = await prisma.exercise.findUnique({
      where: { name: exercise.name },
      select: {
        id: true,
        isCustom: true,
      },
    });

    // Never overwrite a custom exercise with a matching name.
    if (existingExercise?.isCustom) {
      console.log(`Skipped custom exercise: ${exercise.name}`);
      continue;
    }

    const updateData = Object.fromEntries(
      exerciseUpdateFields.map((field) => [
        field,
        exercise[field],
      ])
    );

    await prisma.exercise.upsert({
      where: { name: exercise.name },

      update: updateData,

      create: {
        ...exercise,
        isCustom: false,
      },
    });

    if (existingExercise) {
      updated++;
      console.log(`Updated: ${exercise.name}`);
    } else {
      created++;
      console.log(`Created: ${exercise.name}`);
    }
  }

  console.log("\nExercise catalog seeding completed.");
  console.log(`New exercises: ${created}`);
  console.log(`Updated exercises: ${updated}`);
  console.log(`Total predefined exercises: ${exercises.length}`);
}

main()
  .catch((error) => {
    console.error("Failed to seed exercises:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
