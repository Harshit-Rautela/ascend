
import { Router } from "express";
import prisma from "../prisma.js";

const router = Router();
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

// GET /api/habits
// Retrieve all active habits.
router.get("/", async (req, res) => {
    try {
        const habits = await prisma.habit.findMany({
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
        });

        return res.json({ habits });
    } catch (error) {
        console.error("Error fetching habits:", error);

        return res.status(500).json({
            error: "Failed to fetch habits.",
        });
    }
});


/**
 * GET /api/habits/:id/consistency?days=90
 *
 * Returns the selected active habit's completion history.
 * The range includes today and the previous days.
 */
router.get("/:id/consistency", async (req, res) => {
    try {
        const requestedDays = Number(req.query.days ?? 90);

        if (
            !Number.isInteger(requestedDays) ||
            requestedDays < 1 ||
            requestedDays > 90
        ) {
            return res.status(400).json({
                error: "days must be an integer between 1 and 90.",
            });
        }

        const habit = await prisma.habit.findFirst({
            where: {
                id: req.params.id,
                isActive: true,
            },
            select: {
                id: true,
                title: true,
                createdAt: true,
            },
        });

        if (!habit) {
            return res.status(404).json({
                error: "Active habit not found.",
            });
        }

        // Use UTC calendar dates, consistent with parseDate().
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const startDate = new Date(today);
        startDate.setUTCDate(
            startDate.getUTCDate() - (requestedDays - 1)
        );

        const endDateExclusive = new Date(today);
        endDateExclusive.setUTCDate(
            endDateExclusive.getUTCDate() + 1
        );

        const completions = await prisma.habitCompletion.findMany({
            where: {
                habitId: habit.id,
                completionDate: {
                    gte: startDate,
                    lt: endDateExclusive,
                },
            },
            select: {
                completionDate: true,
            },
        });

        const completedDates = new Set(
            completions.map((completion) =>
                completion.completionDate
                    .toISOString()
                    .slice(0, 10)
            )
        );

        const activity = [];

        for (let i = 0; i < requestedDays; i++) {
            const date = new Date(startDate);
            date.setUTCDate(date.getUTCDate() + i);

            const dateKey = date.toISOString().slice(0, 10);

            // Dates before the habit was created are not missed days.
            const eligible =
                dateKey >= habit.createdAt.toISOString().slice(0, 10);

            activity.push({
                date: dateKey,
                eligible,
                completed: eligible && completedDates.has(dateKey),
            });
        }

        return res.json({
            habit: {
                id: habit.id,
                title: habit.title,
            },
            days: requestedDays,
            activity,
        });
    } catch (error) {
        console.error(
            "Error fetching habit consistency:",
            error
        );

        return res.status(500).json({
            error: "Failed to fetch habit consistency.",
        });
    }
});


router.post("/", async (req, res) => {
    try {
        const { title, description } = req.body ?? {};

        if (typeof title !== "string" || !title.trim()) {
            return res.status(400).json({
                error: "Habit title is required.",
            });
        }

        if (
            description !== undefined &&
            description !== null &&
            typeof description !== "string"
        ) {
            return res.status(400).json({
                error: "Description must be a string or null.",
            });
        }

        const habit = await prisma.habit.create({
            data: {
                title: title.trim(),
                description:
                    typeof description === "string" && description.trim()
                        ? description.trim()
                        : null,
            },
        });

        return res.status(201).json({ habit });
    } catch (error) {
        console.error("Error creating habit:", error);

        return res.status(500).json({
            error: "Failed to create habit.",
        });
    }
});

// GET /api/habits/daily?date=YYYY-MM-DD

router.get("/daily", async (req, res) => {
    try {
        const date = parseDate(req.query.date);

        if (!date) {
            return res.status(400).json({
                error: "Provide a valid date using YYYY-MM-DD.",
            });
        }

        // Start of the day after the selected date (UTC)
        const nextDay = new Date(date);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);

        const habits = await prisma.habit.findMany({
            where: {
                isActive: true,
                createdAt: {
                    lt: nextDay,
                },
            },
            orderBy: {
                createdAt: "asc",
            },
            include: {
                completions: {
                    where: {
                        completionDate: date,
                    },
                    select: {
                        id: true,
                    },
                },
            },
        });

        const dailyHabits = habits.map((habit) => ({
            id: habit.id,
            title: habit.title,
            description: habit.description,
            completed: habit.completions.length > 0,
        }));

        return res.json({
            date: req.query.date,
            habits: dailyHabits,
        });
    } catch (error) {
        console.error("Error fetching daily habits:", error);

        return res.status(500).json({
            error: "Failed to fetch daily habits.",
        });
    }
});


// POST /api/habits/:id/completions
router.post("/:id/completions", async (req, res) => {
    try {
        const { date } = req.body;
        const completionDate = parseDate(date);

        if (!completionDate) {
            return res.status(400).json({
                error: "Provide a valid date using YYYY-MM-DD.",
            });
        }

        const habit = await prisma.habit.findUnique({
            where: { id: req.params.id },
        });

        if (!habit || !habit.isActive) {
            return res.status(404).json({
                error: "Active habit not found.",
            });
        }

        const completion = await prisma.habitCompletion.upsert({
            where: {
                habitId_completionDate: {
                    habitId: req.params.id,
                    completionDate,
                },
            },
            update: {},
            create: {
                habitId: req.params.id,
                completionDate,
            },
        });

        return res.status(200).json({
            message: "Habit marked as completed.",
            completion,
        });
    } catch (error) {
        console.error("Error completing habit:", error);
        return res.status(500).json({
            error: "Failed to complete habit.",
        });
    }
});

// DELETE /api/habits/:id/completions?date=YYYY-MM-DD
router.delete("/:id/completions", async (req, res) => {
    try {
        const date = parseDate(req.query.date);

        if (!date) {
            return res.status(400).json({
                error: "Provide a valid date using YYYY-MM-DD.",
            });
        }

        const result = await prisma.habitCompletion.deleteMany({
            where: {
                habitId: req.params.id,
                completionDate: date,
            },
        });

        if (result.count === 0) {
            return res.status(404).json({
                error: "Completion record not found.",
            });
        }

        return res.json({
            message: "Habit completion undone.",
        });
    } catch (error) {
        console.error("Error undoing habit completion:", error);
        return res.status(500).json({
            error: "Failed to undo habit completion.",
        });
    }
});

router.patch("/:id", async (req, res) => {
    try {
        const { title, description, isActive } = req.body ?? {};
        const data = {};

        if (title !== undefined) {
            if (typeof title !== "string" || !title.trim()) {
                return res.status(400).json({
                    error: "Habit title must be a non-empty string.",
                });
            }

            data.title = title.trim();
        }

        if (description !== undefined) {
            if (
                description !== null &&
                typeof description !== "string"
            ) {
                return res.status(400).json({
                    error: "Description must be a string or null.",
                });
            }

            data.description =
                typeof description === "string" && description.trim()
                    ? description.trim()
                    : null;
        }

        if (isActive !== undefined) {
            if (typeof isActive !== "boolean") {
                return res.status(400).json({
                    error: "isActive must be a boolean.",
                });
            }

            data.isActive = isActive;
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({
                error: "Provide at least one field to update.",
            });
        }

        const habit = await prisma.habit.update({
            where: { id: req.params.id },
            data,
        });

        return res.json({ habit });
    } catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({
                error: "Habit not found.",
            });
        }

        console.error("Error updating habit:", error);

        return res.status(500).json({
            error: "Failed to update habit.",
        });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const habit = await prisma.habit.delete({
            where: { id: req.params.id },
        });

        return res.json({
            message: "Habit deleted successfully.",
            habit,
        });
    } catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({
                error: "Habit not found.",
            });
        }

        console.error("Error deleting habit:", error);

        return res.status(500).json({
            error: "Failed to delete habit.",
        });
    }
});


export default router;

