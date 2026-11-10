
import { Router } from "express";
import prisma from "../prisma.js";

const ALLOWED_HABIT_ICONS = new Set([
    "target",
    "book-open",
    "dumbbell",
    "brain",
    "sun",
    "code",
    "graduation-cap",
    "droplets",
    "heart",
    "apple",
    "bike",
    "moon",
]);

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


// GET /api/habits/analytics
// Aggregate analytics for the all-habits Consistency dashboard.

router.get("/analytics", async (req, res) => {
    try {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const todayKey = today.toISOString().slice(0, 10);

        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

        const startKey = thirtyDaysAgo.toISOString().slice(0, 10);

        const habits = await prisma.habit.findMany({
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
            include: {
                completions: {
                    select: {
                        completionDate: true,
                    },
                    orderBy: {
                        completionDate: "asc",
                    },
                },
            },
        });

        const getDateKey = (date) =>
            date.toISOString().slice(0, 10);

        const addDays = (date, amount) => {
            const result = new Date(date);
            result.setUTCDate(result.getUTCDate() + amount);
            return result;
        };

        const getStreaks = (completedDates) => {
            const sortedDates = [...completedDates].sort();

            if (sortedDates.length === 0) {
                return { currentStreak: 0, longestStreak: 0 };
            }

            const completedSet = new Set(sortedDates);

            // A streak remains active if the last completion
            // was today or yesterday.
            let currentStreak = 0;
            let cursor = new Date(today);

            if (!completedSet.has(getDateKey(cursor))) {
                cursor = addDays(cursor, -1);
            }

            while (completedSet.has(getDateKey(cursor))) {
                currentStreak++;
                cursor = addDays(cursor, -1);
            }

            let longestStreak = 0;
            let runningStreak = 0;
            let previousDate = null;

            for (const dateKey of sortedDates) {
                const date = new Date(`${dateKey}T00:00:00.000Z`);

                if (
                    previousDate &&
                    getDateKey(addDays(previousDate, 1)) === dateKey
                ) {
                    runningStreak++;
                } else {
                    runningStreak = 1;
                }

                longestStreak = Math.max(
                    longestStreak,
                    runningStreak
                );

                previousDate = date;
            }

            return { currentStreak, longestStreak };
        };

        let todayCompleted = 0;
        let todayEligible = 0;

        let totalCompleted30 = 0;
        let totalEligible30 = 0;

        let bestCurrentStreak = 0;
        let totalStreakDays = 0;

        const habitAnalytics = habits.map((habit) => {
            const createdKey = getDateKey(habit.createdAt);

            const completedDates = habit.completions.map(
                (completion) => getDateKey(completion.completionDate)
            );

            const completedSet = new Set(completedDates);

            const eligible30Days = Math.max(
                0,
                Math.floor(
                    (today.getTime() -
                        Math.max(
                            new Date(`${startKey}T00:00:00.000Z`).getTime(),
                            new Date(`${createdKey}T00:00:00.000Z`).getTime()
                        )) / 86400000
                ) + 1
            );

            const completed30Days = completedDates.filter(
                (date) => date >= startKey && date <= todayKey
            ).length;

            const streaks = getStreaks(completedDates);
            const last30Days = Array.from({ length: 30 }, (_, index) => {
                const date = addDays(thirtyDaysAgo, index);
                const key = getDateKey(date);

                const eligible = key >= createdKey && key <= todayKey;

                return {
                    date: key,
                    eligible,
                    completed: eligible && completedSet.has(key),
                    isToday: key === todayKey,
                };
            });
            const last7Days = Array.from({ length: 7 }, (_, index) => {
                const date = addDays(today, index - 6);
                const key = getDateKey(date);

                const eligible = key >= createdKey && key <= todayKey;

                return {
                    date: key,
                    eligible,
                    completed: eligible && completedSet.has(key),
                    isToday: key === todayKey,
                };
            });

            if (createdKey <= todayKey) {
                todayEligible++;
                if (completedSet.has(todayKey)) {
                    todayCompleted++;
                }
            }

            totalEligible30 += eligible30Days;
            totalCompleted30 += completed30Days;

            bestCurrentStreak = Math.max(
                bestCurrentStreak,
                streaks.currentStreak
            );

            totalStreakDays += streaks.currentStreak;

            return {
                id: habit.id,
                title: habit.title,
                description: habit.description,
                icon: habit.icon,
                createdAt: habit.createdAt,
                completionRate: eligible30Days
                    ? Math.round(
                        (completed30Days / eligible30Days) * 100
                    )
                    : 0,
                completedDays: completed30Days,
                eligibleDays: eligible30Days,
                last7Days,
                last30Days,
                currentStreak: streaks.currentStreak,
                longestStreak: streaks.longestStreak,
            };
        });
        console.log(
            "ANALYTICS ROUTE:",
            habitAnalytics.map((habit) => ({
                id: habit.id,
                title: habit.title,
                last7Days: habit.last7Days,
                last7DaysLength: habit.last7Days?.length,
            }))
        );

        return res.json({
            debugRoute: "habits-analytics-last7-v1",
            overview: {
                activeHabits: habits.length,
                todayCompleted,
                todayEligible,
                todayCompletionRate: todayEligible
                    ? Math.round(
                        (todayCompleted / todayEligible) * 100
                    )
                    : 0,
                completionRate30Days: totalEligible30
                    ? Math.round(
                        (totalCompleted30 / totalEligible30) * 100
                    )
                    : 0,
                bestCurrentStreak,
                totalStreakDays,
                totalCompletions: totalCompleted30,
            },
            habits: habitAnalytics,
        });
    } catch (error) {
        console.error("Error fetching habit analytics:", error);

        return res.status(500).json({
            error: "Failed to fetch habit analytics.",
        });
    }
});


/**
 * GET /api/habits/history/chart
 *
 * Returns aggregate daily completion percentages
 * for the last 30 calendar days, including today.
 */
router.get("/history/chart", async (req, res) => {
    try {
        // Normalize today to UTC midnight.
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const todayKey = today.toISOString().slice(0, 10);

        // Calculate the beginning of the 30-day range.
        const startDate = new Date(today);
        startDate.setUTCDate(startDate.getUTCDate() - 29);

        const startKey = startDate.toISOString().slice(0, 10);

        // Exclusive end boundary: tomorrow at UTC midnight.
        const endDateExclusive = new Date(today);
        endDateExclusive.setUTCDate(
            endDateExclusive.getUTCDate() + 1
        );

        // Fetch active habits that existed before the end
        // of the requested date range, with their completions
        // inside that range.
        const habits = await prisma.habit.findMany({
            where: {
                isActive: true,
                createdAt: {
                    lt: endDateExclusive,
                },
            },
            select: {
                id: true,
                createdAt: true,
                completions: {
                    where: {
                        completionDate: {
                            gte: startDate,
                            lt: endDateExclusive,
                        },
                    },
                    select: {
                        completionDate: true,
                    },
                },
            },
        });

        // Build a map of completed dates for each habit.
        const habitCompletionMap = habits.map((habit) => ({
            createdKey: habit.createdAt.toISOString().slice(0, 10),

            completedDates: new Set(
                habit.completions.map((completion) =>
                    completion.completionDate
                        .toISOString()
                        .slice(0, 10)
                )
            ),
        }));

        const data = [];

        // Generate one aggregate entry for every calendar day.
        for (let i = 0; i < 30; i++) {
            const date = new Date(startDate);

            date.setUTCDate(date.getUTCDate() + i);

            const dateKey = date.toISOString().slice(0, 10);

            let eligible = 0;
            let completed = 0;

            for (const habit of habitCompletionMap) {
                // A habit is eligible only from its creation date.
                if (habit.createdKey > dateKey) {
                    continue;
                }

                eligible++;

                if (habit.completedDates.has(dateKey)) {
                    completed++;
                }
            }

            data.push({
                date: dateKey,
                completed,
                eligible,

                // null means no habits were eligible that day.
                percentage: eligible
                    ? Math.round((completed / eligible) * 100)
                    : null,
            });
        }

        return res.json({
            period: "daily",
            days: 30,
            startDate: startKey,
            endDate: todayKey,
            data,
        });
    } catch (error) {
        console.error(
            "Error fetching habit history chart:",
            error
        );

        return res.status(500).json({
            error: "Failed to fetch habit history chart.",
        });
    }
});


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
        const { title, description, icon = "target" } = req.body ?? {};

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
        if (
            typeof icon !== "string" ||
            !ALLOWED_HABIT_ICONS.has(icon)
        ) {
            return res.status(400).json({
                error: "Invalid habit icon.",
            });
        }
        const habit = await prisma.habit.create({
            data: {
                title: title.trim(),
                description:
                    typeof description === "string" && description.trim()
                        ? description.trim()
                        : null,
                icon,
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
            icon: habit.icon,

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
        const { title, description, isActive, icon } = req.body ?? {};
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
        if (icon !== undefined) {
            if (
                typeof icon !== "string" ||
                !ALLOWED_HABIT_ICONS.has(icon)
            ) {
                return res.status(400).json({
                    error: "Invalid habit icon.",
                });
            }

            data.icon = icon;
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

