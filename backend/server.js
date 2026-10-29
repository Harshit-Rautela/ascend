
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./prisma.js";
import nutritionRouter from "./routes/nutrition.js";
import exerciseRouter from "./routes/exercise.js";
import trainingPlansRouter from "./routes/trainingPlans.js";
import workoutsRouter from "./routes/workouts.js";
import habitsRouter from "./routes/habits.js";
import statsRouter from "./routes/stats.js";
import quoteRoutes from "./routes/quotes.js";
import waterRoutes from "./routes/waterIntake.js";




dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/api/exercise", exerciseRouter);
app.use("/api/nutrition", nutritionRouter);
app.use("/api/training-plans", trainingPlansRouter);
app.use("/api/workouts", workoutsRouter);
app.use("/api/habits", habitsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/quotes", quoteRoutes);
app.use("/api/water", waterRoutes);
// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "success",
    message: "Ascend API is running!",
  });
});

// Save a weight entry
app.post("/api/weight", async (req, res) => {
  try {
    const { weightKg, entryDate, notes } = req.body;

    if (
      typeof weightKg !== "number" ||
      !Number.isFinite(weightKg) ||
      weightKg < 20 ||
      weightKg > 500
    ) {
      return res.status(400).json({
        status: "error",
        message: "Weight must be a number between 20 and 500 kg.",
      });
    }

    if (
      typeof entryDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entryDate)
    ) {
      return res.status(400).json({
        status: "error",
        message: "entryDate must use YYYY-MM-DD format.",
      });
    }

    const parsedDate = new Date(`${entryDate}T00:00:00.000Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== entryDate
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please provide a valid calendar date.",
      });
    }

    if (notes !== undefined && notes !== null && typeof notes !== "string") {
      return res.status(400).json({
        status: "error",
        message: "Notes must be text.",
      });
    }

    const weightEntry = await prisma.weightEntry.create({
      data: {
        weightKg,
        entryDate: parsedDate,
        notes: notes?.trim() || null,
      },
    });

    return res.status(201).json({
      status: "success",
      data: weightEntry,
    });
  } catch (error) {
    console.error("Error saving weight:", error);
    return res.status(500).json({
      status: "error",
      message: "Could not save weight entry.",
    });
  }
});

// Get weight history, newest date first
app.get("/api/weight", async (req, res) => {
  try {
    const weightHistory = await prisma.weightEntry.findMany({
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    });

    return res.json({
      status: "success",
      count: weightHistory.length,
      data: weightHistory,
    });
  } catch (error) {
    console.error("Error fetching weight history:", error);
    return res.status(500).json({
      status: "error",
      message: "Could not fetch weight history.",
    });
  }
});


app.listen(PORT, () => {
  console.log(`Ascend server running on port ${PORT}`);
});

