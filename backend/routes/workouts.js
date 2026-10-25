
import { Router } from "express";
import prisma from "../prisma.js";

const router = Router();

// Validate YYYY-MM-DD and interpret it consistently as a calendar date.
function parseDate(value) {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return null;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
    ) {
        return null;
    }

    return date;
}

function getDateRange(date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setUTCDate(end.getUTCDate() + 1);

    return { gte: start, lt: end };
}

// GET /api/workouts?date=YYYY-MM-DD
// Retrieve saved performance for one calendar date.
router.get("/", async (req, res) => {
    try {
        const date = parseDate(req.query.date);

        if (!date) {
            return res.status(400).json({
                error: "Provide a valid date using YYYY-MM-DD.",
            });
        }

        const session = await prisma.workoutSession.findFirst({
            where: {
                performedAt: getDateRange(date),
            },
            include: {
                exercises: {
                    orderBy: { sortOrder: "asc" },
                    include: {
                        exercise: true,
                        sets: {
                            orderBy: { setNumber: "asc" },
                        },
                    },
                },
            },
        });

        return res.json({ session });
    } catch (error) {
        console.error("Error fetching workout:", error);

        return res.status(500).json({
            error: "Failed to fetch workout.",
        });
    }
});

// PUT /api/workouts?date=YYYY-MM-DD
//
// Body:
// {
//   "exercises": [
//     { "exerciseId": "exercise-id", "completedSets": 2 }
//   ]
// }
//
// The server gets each exercise's targetSets from the saved weekly plan.
// The client cannot override the planned number of sets.


/**
 * GET /api/workouts/history
 *
 * Read-only workout history.
 * Returns the 50 most recent sessions with their exercises and sets.
 */
router.get("/history", async (req, res) => {
    try {
        const rawLimit = req.query.limit ?? "50";
        const limit = Number(rawLimit);

        if (
            typeof rawLimit !== "string" ||
            !/^\d+$/.test(rawLimit) ||
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 100
        ) {
            return res.status(400).json({
                error: "Limit must be an integer between 1 and 100.",
            });
        }

        const sessions = await prisma.workoutSession.findMany({
            orderBy: [
                { performedAt: "desc" },
                { createdAt: "desc" },
            ],
            take: limit,
            include: {
                exercises: {
                    orderBy: { sortOrder: "asc" },
                    include: {
                        exercise: true,
                        sets: {
                            orderBy: { setNumber: "asc" },
                        },
                    },
                },
            },
        });

        return res.json({ sessions });
    } catch (error) {
        console.error("Error fetching workout history:", error);

        return res.status(500).json({
            error: "Failed to fetch workout history.",
        });
    }
});

router.put("/", async (req, res) => {
    try {
        const date = parseDate(req.query.date);

        if (!date) {
            return res.status(400).json({
                error: "Provide a valid date using YYYY-MM-DD.",
            });
        }

        const { exercises } = req.body ?? {};

        if (!Array.isArray(exercises) || exercises.length > 100) {
            return res.status(400).json({
                error: "Exercises must be an array containing at most 100 items.",
            });
        }

        const seenIds = new Set();

        for (const item of exercises) {
            if (
                !item ||
                typeof item.exerciseId !== "string" ||
                !item.exerciseId.trim() ||
                seenIds.has(item.exerciseId) ||
                !Number.isInteger(item.completedSets) ||
                item.completedSets < 0
            ) {
                return res.status(400).json({
                    error:
                        "Each exercise needs a unique exerciseId and a non-negative integer completedSets.",
                });
            }

            seenIds.add(item.exerciseId);
        }

        const dayOfWeek = date.getUTCDay();

        const result = await prisma.$transaction(async (tx) => {
            const plan = await tx.trainingPlan.findFirst({
                where: { isActive: true },
                orderBy: { createdAt: "asc" },
                include: {
                    days: {
                        where: { dayOfWeek },
                        include: {
                            exercises: {
                                orderBy: { sortOrder: "asc" },
                                include: { exercise: true },
                            },
                        },
                    },
                },
            });

            if (!plan) {
                throw new Error("NO_ACTIVE_PLAN");
            }

            const planDay = plan.days[0];

            if (!planDay) {
                throw new Error("NO_PLAN_DAY");
            }

            const plannedByExerciseId = new Map(
                planDay.exercises.map((item) => [item.exerciseId, item])
            );

            // Validate against the actual plan, not arbitrary client-supplied IDs.
            for (const item of exercises) {
                const planned = plannedByExerciseId.get(item.exerciseId);

                if (!planned) {
                    throw new Error("EXERCISE_NOT_IN_PLAN");
                }

                if (
                    !Number.isInteger(planned.targetSets) ||
                    planned.targetSets < 1
                ) {
                    throw new Error("INVALID_TARGET_SETS");
                }

                if (item.completedSets > planned.targetSets) {
                    throw new Error("TOO_MANY_COMPLETED_SETS");
                }

                if (
                    !["WEIGHT_REPS", "BODYWEIGHT_REPS"].includes(
                        planned.exercise.measurementType
                    )
                ) {
                    throw new Error("UNSUPPORTED_MEASUREMENT_TYPE");
                }
            }

            const range = getDateRange(date);

            let session = await tx.workoutSession.findFirst({
                where: { performedAt: range },
                orderBy: { createdAt: "asc" },
            });

            if (!session) {
                session = await tx.workoutSession.create({
                    data: {
                        performedAt: date,
                        status: "IN_PROGRESS",
                    },
                });
            }

            for (const item of exercises) {
                const planned = plannedByExerciseId.get(item.exerciseId);

                let workoutExercise = await tx.workoutExercise.findFirst({
                    where: {
                        workoutSessionId: session.id,
                        exerciseId: item.exerciseId,
                    },
                });

                if (!workoutExercise) {
                    // Use the plan order, but avoid a sortOrder collision if the plan
                    // contains different exercises added to this session over time.
                    workoutExercise = await tx.workoutExercise.create({
                        data: {
                            workoutSessionId: session.id,
                            exerciseId: item.exerciseId,
                            sortOrder: planned.sortOrder,
                        },
                    });
                }

                // Keep one record per planned set. Completed sets are the first N sets.
                for (let setNumber = 1; setNumber <= planned.targetSets; setNumber++) {
                    const isCompleted = setNumber <= item.completedSets;

                    await tx.workoutSet.upsert({
                        where: {
                            workoutExerciseId_setNumber: {
                                workoutExerciseId: workoutExercise.id,
                                setNumber,
                            },
                        },
                        create: {
                            workoutExerciseId: workoutExercise.id,
                            setNumber,
                            isCompleted,
                            weightKg: planned.targetWeightKg ?? null,
                            reps: planned.targetReps ?? null,
                        },
                        update: {
                            isCompleted,
                        },
                    });
                }
            }

            return tx.workoutSession.findUnique({
                where: { id: session.id },
                include: {
                    exercises: {
                        orderBy: { sortOrder: "asc" },
                        include: {
                            exercise: true,
                            sets: { orderBy: { setNumber: "asc" } },
                        },
                    },
                },
            });
        });

        return res.json({ session: result });
    } catch (error) {
        if (error.message === "NO_ACTIVE_PLAN" || error.message === "NO_PLAN_DAY") {
            return res.status(404).json({
                error: "No active plan or plan day exists for this date.",
            });
        }

        if (error.message === "EXERCISE_NOT_IN_PLAN") {
            return res.status(400).json({
                error: "An exercise is not part of the selected day's plan.",
            });
        }

        if (error.message === "INVALID_TARGET_SETS") {
            return res.status(400).json({
                error: "Each exercise must have a positive targetSets value.",
            });
        }

        if (error.message === "TOO_MANY_COMPLETED_SETS") {
            return res.status(400).json({
                error: "Completed sets cannot exceed the planned number of sets.",
            });
        }

        if (error.message === "UNSUPPORTED_MEASUREMENT_TYPE") {
            return res.status(400).json({
                error:
                    "Set counters currently support WEIGHT_REPS and BODYWEIGHT_REPS exercises.",
            });
        }

        console.error("Error saving workout:", error);

        return res.status(500).json({
            error: "Failed to save workout.",
        });
    }
});

export default router;
