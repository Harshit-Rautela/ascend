
import { Router } from "express";
import prisma from "../prisma.js";

const router = Router();

const ALLOWED_MEASUREMENTS = {
  bodyFat: { measurement: "Body Fat", unit: "%" },
  waist: { measurement: "Waist", unit: "cm" },
};

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

function isValidPositiveNumber(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  );
}

function parseLimit(value) {
  const raw = value ?? "50";

  if (
    typeof raw !== "string" ||
    !/^\d+$/.test(raw) ||
    !Number.isInteger(Number(raw)) ||
    Number(raw) < 1 ||
    Number(raw) > 100
  ) {
    return null;
  }

  return Number(raw);
}

// POST /api/stats/body
// Body: { type, value, date, notes? }
// type: "weight", "bodyFat", or "waist"
router.post("/body", async (req, res) => {
  try {
    const { type, value, date, notes } = req.body ?? {};
    const entryDate = parseDate(date);

    if (!["weight", "bodyFat", "waist"].includes(type)) {
      return res.status(400).json({
        error: "Type must be weight, bodyFat, or waist.",
      });
    }

    if (!isValidPositiveNumber(value)) {
      return res.status(400).json({
        error: "Value must be a positive number.",
      });
    }

    if (!entryDate) {
      return res.status(400).json({
        error: "Provide a valid date using YYYY-MM-DD.",
      });
    }

    if (
      notes !== undefined &&
      notes !== null &&
      typeof notes !== "string"
    ) {
      return res.status(400).json({
        error: "Notes must be a string.",
      });
    }

    if (typeof notes === "string" && notes.length > 1000) {
      return res.status(400).json({
        error: "Notes cannot exceed 1000 characters.",
      });
    }

    if (type === "weight") {
      const entry = await prisma.weightEntry.create({
        data: {
          weightKg: value,
          entryDate,
          notes: notes?.trim() || null,
        },
      });

      return res.status(201).json({ entry });
    }

    const config = ALLOWED_MEASUREMENTS[type];

    const entry = await prisma.bodyMeasurement.create({
      data: {
        measurement: config.measurement,
        value,
        unit: config.unit,
        measuredAt: entryDate,
        notes: notes?.trim() || null,
      },
    });

    return res.status(201).json({ entry });
  } catch (error) {
    console.error("Error saving body stat:", error);

    return res.status(500).json({
      error: "Failed to save body stat.",
    });
  }
});

// GET /api/stats/body
// Fetch the latest saved value for each body metric.
router.get("/body", async (req, res) => {
  try {
    const [weight, bodyFat, waist] = await Promise.all([
      prisma.weightEntry.findFirst({
        orderBy: [
          { entryDate: "desc" },
          { createdAt: "desc" },
        ],
      }),

      prisma.bodyMeasurement.findFirst({
        where: { measurement: "Body Fat" },
        orderBy: [
          { measuredAt: "desc" },
          { createdAt: "desc" },
        ],
      }),

      prisma.bodyMeasurement.findFirst({
        where: { measurement: "Waist" },
        orderBy: [
          { measuredAt: "desc" },
          { createdAt: "desc" },
        ],
      }),
    ]);

    return res.json({
      weight,
      bodyFat,
      waist,
    });
  } catch (error) {
    console.error("Error fetching body stats:", error);

    return res.status(500).json({
      error: "Failed to fetch body stats.",
    });
  }
});

// GET /api/stats/body/history?limit=50
router.get("/body/history", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);

    if (limit === null) {
      return res.status(400).json({
        error: "Limit must be an integer between 1 and 100.",
      });
    }

    const [weights, measurements] = await Promise.all([
      prisma.weightEntry.findMany({
        orderBy: [
          { entryDate: "desc" },
          { createdAt: "desc" },
        ],
        take: limit,
      }),

      prisma.bodyMeasurement.findMany({
        where: {
          measurement: { in: ["Body Fat", "Waist"] },
        },
        orderBy: [
          { measuredAt: "desc" },
          { createdAt: "desc" },
        ],
        take: limit,
      }),
    ]);

    return res.json({ weights, measurements });
  } catch (error) {
    console.error("Error fetching body stat history:", error);

    return res.status(500).json({
      error: "Failed to fetch body stat history.",
    });
  }
});

export default router;
