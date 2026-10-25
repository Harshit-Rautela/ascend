
import prisma from "./prisma.js";

const exercises = [
  // Strength — weight and reps
  {
    name: "Barbell Bench Press",
    category: "STRENGTH",
    equipment: "Barbell, Bench",
    measurementType: "WEIGHT_REPS",
    description: "Compound chest exercise targeting the chest, shoulders, and triceps.",
  },
  {
    name: "Barbell Squat",
    category: "STRENGTH",
    equipment: "Barbell, Squat Rack",
    measurementType: "WEIGHT_REPS",
    description: "Compound lower-body exercise targeting the quadriceps and glutes.",
  },
  {
    name: "Deadlift",
    category: "STRENGTH",
    equipment: "Barbell",
    measurementType: "WEIGHT_REPS",
    description: "Compound hip-hinge exercise targeting the posterior chain.",
  },
  {
    name: "Dumbbell Shoulder Press",
    category: "STRENGTH",
    equipment: "Dumbbells",
    measurementType: "WEIGHT_REPS",
    description: "Pressing exercise for the shoulders and triceps.",
  },
  {
    name: "Dumbbell Row",
    category: "STRENGTH",
    equipment: "Dumbbells, Bench",
    measurementType: "WEIGHT_REPS",
    description: "Pulling exercise targeting the back and biceps.",
  },
  {
    name: "Lat Pulldown",
    category: "STRENGTH",
    equipment: "Cable Machine",
    measurementType: "WEIGHT_REPS",
    description: "Vertical pulling exercise for the back and biceps.",
  },
  {
    name: "Leg Press",
    category: "STRENGTH",
    equipment: "Leg Press Machine",
    measurementType: "WEIGHT_REPS",
    description: "Machine-based lower-body pushing exercise.",
  },
  {
    name: "Dumbbell Bicep Curl",
    category: "STRENGTH",
    equipment: "Dumbbells",
    measurementType: "WEIGHT_REPS",
    description: "Isolation exercise targeting the biceps.",
  },

  // Bodyweight exercises
  {
    name: "Push-up",
    category: "STRENGTH",
    equipment: "None",
    measurementType: "BODYWEIGHT_REPS",
    description: "Bodyweight pushing exercise for the chest, shoulders, and triceps.",
  },
  {
    name: "Pull-up",
    category: "STRENGTH",
    equipment: "Pull-up Bar",
    measurementType: "BODYWEIGHT_REPS",
    description: "Bodyweight pulling exercise targeting the back and biceps.",
  },
  {
    name: "Bodyweight Squat",
    category: "STRENGTH",
    equipment: "None",
    measurementType: "BODYWEIGHT_REPS",
    description: "Squat variation performed without external weights.",
  },
  {
    name: "Plank",
    category: "STRENGTH",
    equipment: "Exercise Mat",
    measurementType: "DURATION",
    description: "Isometric core exercise performed for time.",
  },

  // Cardio
  {
    name: "Running",
    category: "CARDIO",
    equipment: "Running Shoes",
    measurementType: "DISTANCE",
    description: "Cardiovascular exercise tracked by distance.",
  },
  {
    name: "Cycling",
    category: "CARDIO",
    equipment: "Bicycle or Stationary Bike",
    measurementType: "DISTANCE",
    description: "Cardiovascular exercise tracked by distance.",
  },
  {
    name: "Jump Rope",
    category: "CARDIO",
    equipment: "Jump Rope",
    measurementType: "DURATION",
    description: "Cardiovascular conditioning using a skipping rope.",
  },

  // Mobility
  {
    name: "Cat-Cow Stretch",
    category: "MOBILITY",
    equipment: "Exercise Mat",
    measurementType: "DURATION",
    description: "Gentle spinal mobility movement.",
  },
  {
    name: "World's Greatest Stretch",
    category: "MOBILITY",
    equipment: "Exercise Mat",
    measurementType: "BODYWEIGHT_REPS",
    description: "Dynamic mobility movement for the hips and upper back.",
  },
  {
    name: "Shoulder Circles",
    category: "MOBILITY",
    equipment: "None",
    measurementType: "DURATION",
    description: "Simple movement to warm up the shoulder joints.",
  },
];


async function main() {
  let created = 0;
  let alreadyExisted = 0;

  for (const exercise of exercises) {
    const result = await prisma.exercise.upsert({
      where: { name: exercise.name },
      update: {},
      create: {
        ...exercise,
        isCustom: false,
      },
    });

    // upsert returns the existing or newly created record.
    // Count records separately only if you need exact creation metrics.
    console.log(`Ready: ${result.name}`);
  }

  console.log(`Exercise catalog ready: ${exercises.length} entries processed.`);
}


main()
  .catch((error) => {
    console.error("Failed to seed exercises:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
