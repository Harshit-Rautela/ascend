
import { Router } from "express";
import prisma from "../prisma.js";

const router = Router();

function parseEntryDate(date) {
  if (typeof date !== "string") return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    return null;
  }

  return parsedDate;
}

// GET /api/steps?date=YYYY-MM-DD
router.get("/", async (req, res) => {
  console.log("GET /api/steps called");

  try {
    const entryDate = parseEntryDate(req.query.date);

    if (!entryDate) {
      return res.status(400).json({
        message: "A valid date in YYYY-MM-DD format is required.",
      });
    }

    const entry = await prisma.stepEntry.findUnique({
      where: { entryDate },
    });

    return res.status(200).json({ entry });
  } catch (error) {
    console.error("Get steps error:", error);
    console.error(error.stack);

    return res.status(500).json({
      message: "Could not retrieve step count.",
    });
  }
});

// POST /api/steps
router.post("/", async (req, res) => {
  console.log("POST /api/steps called");

  try {
    const { steps, date } = req.body;
    const entryDate = parseEntryDate(date);

    if (!entryDate) {
      return res.status(400).json({
        message: "A valid date in YYYY-MM-DD format is required.",
      });
    }

    if (
      !Number.isSafeInteger(steps) ||
      steps < 0 ||
      steps > 2147483647
    ) {
      return res.status(400).json({
        message: "Steps must be a valid non-negative whole number.",
      });
    }

    const entry = await prisma.stepEntry.upsert({
      where: { entryDate },
      update: { steps },
      create: { steps, entryDate },
    });

    return res.status(200).json({
      message: "Step count saved successfully.",
      entry,
    });
  } catch (error) {
    console.error("Save steps error:", error);

    return res.status(500).json({
      message: "Could not save step count.",
    });
  }
});

export default router;
