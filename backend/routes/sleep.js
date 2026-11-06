
import { Router } from "express";
import prisma from "../prisma.js";

const router = Router();

// Validate YYYY-MM-DD and ensure it is a real calendar date.
function parseDate(dateString) {
  if (
    typeof dateString !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateString)
  ) {
    return null;
  }

  const date = new Date(`${dateString}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== dateString
  ) {
    return null;
  }

  return date;
}

// Calculate sleep duration from local clock times.
function calculateTimeInBed(bedtime, wakeTime) {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

  if (!timeRegex.test(bedtime) || !timeRegex.test(wakeTime)) {
    return null;
  }

  const [bedHours, bedMinutes] = bedtime.split(":").map(Number);
  const [wakeHours, wakeMinutes] = wakeTime.split(":").map(Number);

  const bedTotal = bedHours * 60 + bedMinutes;
  let wakeTotal = wakeHours * 60 + wakeMinutes;

  // Account for overnight sleep.
  if (wakeTotal < bedTotal) {
    wakeTotal += 24 * 60;
  }

  const duration = wakeTotal - bedTotal;

  if (duration <= 0 || duration > 24 * 60) {
    return null;
  }

  return duration;
}
// Validate and prepare sleep request data.
function validateSleepData(body) {
  const {
    sleepDate,
    bedtime,
    wakeTime,
    quality,
    sleepScore = null,
    awakeMinutes = null,
    lightSleepMinutes = null,
    deepSleepMinutes = null,
    heartRate = null,
    hrv = null,
    energy = null,
    notes = null,
  } = body || {};

  const date = parseDate(sleepDate);

  if (!date) {
    return { error: "sleepDate must be a valid YYYY-MM-DD date." };
  }

  if (
    typeof bedtime !== "string" ||
    typeof wakeTime !== "string"
  ) {
    return { error: "Valid bedtime and wakeTime are required." };
  }

  const timeInBedMinutes = calculateTimeInBed(bedtime, wakeTime);
  if (timeInBedMinutes === null) {
    return {
      error: "Invalid sleep times. Wake time must be after bedtime, including overnight sleep.",
    };
  }

  if (!Number.isInteger(quality) || quality < 1 || quality > 5) {
    return { error: "Sleep quality must be an integer between 1 and 5." };
  }

  // Validate optional numeric fields.
  const optionalFields = {
    sleepScore: {
      value: sleepScore,
      min: 0,
      max: 100,
      label: "Sleep score",
    },
    awakeMinutes: {
      value: awakeMinutes,
      min: 0,
      max: 1440,
      integer: true,
      label: "Awake duration",
    },
    lightSleepMinutes: {
      value: lightSleepMinutes,
      min: 0,
      max: 1440,
      integer: true,
      label: "Light sleep duration",
    },
    deepSleepMinutes: {
      value: deepSleepMinutes,
      min: 0,
      max: 1440,
      integer: true,
      label: "Deep sleep duration",
    },
    heartRate: {
      value: heartRate,
      min: 1,
      max: 300,
      integer: true,
      label: "Heart rate",
    },
    hrv: {
      value: hrv,
      min: 0,
      max: 1000,
      integer: true,
      label: "HRV",
    },
    energy: {
      value: energy,
      min: 0,
      max: 100,
      integer: true,
      label: "Energy",
    },
  };
  let durationMinutes = null;


  for (const [field, config] of Object.entries(optionalFields)) {
    const value = config.value;

    if (
      value !== null &&
      (
        !Number.isFinite(value) ||
        (config.integer && !Number.isInteger(value)) ||
        value < config.min ||
        value > config.max
      )
    ) {
      return {
        error: `${config.label} must be a valid number between ${config.min} and ${config.max}.`,
      };
    }
  }

  // Sleep stage measurements should be provided together.
  const stageValues = [
    awakeMinutes,
    lightSleepMinutes,
    deepSleepMinutes,
  ];

  const hasStageData = stageValues.some((value) => value !== null);

  if (hasStageData) {
    durationMinutes = lightSleepMinutes + deepSleepMinutes;

    if (durationMinutes + awakeMinutes !== timeInBedMinutes) {
      return {
        error: "Awake, light sleep, and deep sleep durations must add up to time in bed.",
      };
    }
  }

  // Validate notes.
  if (
    notes !== null &&
    (typeof notes !== "string" || notes.trim().length > 500)
  ) {
    return { error: "Notes must be 500 characters or fewer." };
  }

  return {
    data: {
      sleepDate: date,
      bedtime,
      wakeTime,
      timeInBedMinutes,
      durationMinutes,
      quality,
      sleepScore,
      awakeMinutes,
      lightSleepMinutes,
      deepSleepMinutes,
      heartRate,
      hrv,
      energy,
      notes: notes?.trim() || null,
    },
  };
}

// POST /api/sleep — create or replace a sleep entry.
router.post("/", async (req, res) => {
  try {
    const validation = validateSleepData(req.body);

    if (validation.error) {
      return res.status(400).json({
        error: validation.error,
      });
    }

    const entry = await prisma.sleepEntry.upsert({
      where: {
        sleepDate: validation.data.sleepDate,
      },
      create: validation.data,
      update: {
        bedtime: validation.data.bedtime,
        wakeTime: validation.data.wakeTime,
        timeInBedMinutes: validation.data.timeInBedMinutes,

        durationMinutes: validation.data.durationMinutes,
        quality: validation.data.quality,
        sleepScore: validation.data.sleepScore,
        awakeMinutes: validation.data.awakeMinutes,
        lightSleepMinutes: validation.data.lightSleepMinutes,
        deepSleepMinutes: validation.data.deepSleepMinutes,
        heartRate: validation.data.heartRate,
        hrv: validation.data.hrv,
        energy: validation.data.energy,
        notes: validation.data.notes,
      },
    });

    return res.status(200).json(entry);
  } catch (error) {
    console.error("Error saving sleep entry:", error);

    return res.status(500).json({
      error: "Failed to save sleep entry.",
    });
  }
});

/**
 * GET /api/sleep/weekly?startDate=YYYY-MM-DD
 * Fetch seven days of sleep data.
 */


/**
 * GET /api/sleep/monthly?month=YYYY-MM
 * Fetch every calendar day in the requested month.
 */
router.get("/monthly", async (req, res) => {
  try {
    const { month } = req.query;

    // Validate YYYY-MM format.
    if (
      typeof month !== "string" ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)
    ) {
      return res.status(400).json({
        error: "Provide a valid month in YYYY-MM format.",
      });
    }

    const [year, monthNumber] = month.split("-").map(Number);

    const startDate = new Date(
      Date.UTC(year, monthNumber - 1, 1)
    );

    const endDate = new Date(
      Date.UTC(year, monthNumber, 1)
    );

    const entries = await prisma.sleepEntry.findMany({
      where: {
        sleepDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: {
        sleepDate: "asc",
      },
    });

    const daysInMonth = new Date(
      Date.UTC(year, monthNumber, 0)
    ).getUTCDate();

    // Create an entry for every calendar day.
    const days = Array.from(
      { length: daysInMonth },
      (_, index) => {
        const date = new Date(
          Date.UTC(year, monthNumber - 1, index + 1)
        );

        return {
          date: date.toISOString().slice(0, 10),
          durationMinutes: null,
          timeInBedMinutes: null,
          quality: null,
          sleepScore: null,
          hasEntry: false,
          entry: null,
        };
      }
    );

    const dailyEntries = new Map(
      entries.map((entry) => [
        new Date(entry.sleepDate)
          .toISOString()
          .slice(0, 10),
        entry,
      ])
    );

    for (const day of days) {
      const entry = dailyEntries.get(day.date);

      if (entry) {
        day.durationMinutes = entry.durationMinutes;
        day.timeInBedMinutes = entry.timeInBedMinutes;
        day.quality = entry.quality;
        day.sleepScore = entry.sleepScore;
        day.hasEntry = true;
        day.entry = entry;
      }
    }

    return res.json({ days });
  } catch (error) {
    console.error("Error fetching monthly sleep:", error);

    return res.status(500).json({
      error: "Failed to fetch monthly sleep data.",
    });
  }
});

router.get("/weekly", async (req, res) => {
  try {
    const { startDate: dateString } = req.query;

    const startDate = parseDate(dateString);

    if (!startDate) {
      return res.status(400).json({
        error: "Provide a valid startDate in YYYY-MM-DD format.",
      });
    }

    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 7);

    const entries = await prisma.sleepEntry.findMany({
      where: {
        sleepDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: {
        sleepDate: "asc",
      },
    });

    // Include all seven days, even when no sleep was logged.
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startDate);
      date.setUTCDate(date.getUTCDate() + index);

      return {
        date: date.toISOString().slice(0, 10),
        durationMinutes: 0,
        timeInBedMinutes: null,
        quality: null,
        sleepScore: null,
        entry: null,
      };
    });

    const dailyEntries = new Map(
      entries.map((entry) => [
        new Date(entry.sleepDate).toISOString().slice(0, 10),
        entry,
      ])
    );

    for (const day of days) {
      const entry = dailyEntries.get(day.date);

      if (entry) {
        day.durationMinutes = entry.durationMinutes;
        day.timeInBedMinutes = entry.timeInBedMinutes;
        day.quality = entry.quality;
        day.sleepScore = entry.sleepScore;
        day.hasEntry = true;
        day.entry = entry;
      }
    }

    return res.json({ days });
  } catch (error) {
    console.error("Error fetching weekly sleep:", error);

    return res.status(500).json({
      error: "Failed to fetch weekly sleep data.",
    });
  }
});

// GET /api/sleep?date=YYYY-MM-DD
// Fetch one date's entry, or all entries if date is omitted.
router.get("/", async (req, res) => {
  try {
    const { date: dateString } = req.query;

    if (dateString !== undefined) {
      const date = parseDate(dateString);

      if (!date) {
        return res.status(400).json({
          error: "Provide a valid date in YYYY-MM-DD format.",
        });
      }

      const entry = await prisma.sleepEntry.findUnique({
        where: {
          sleepDate: date,
        },
      });

      return res.json(entry);
    }

    const entries = await prisma.sleepEntry.findMany({
      orderBy: {
        sleepDate: "desc",
      },
    });

    return res.json(entries);
  } catch (error) {
    console.error("Error fetching sleep entries:", error);

    return res.status(500).json({
      error: "Failed to fetch sleep entries.",
    });
  }
});

// PUT /api/sleep/:id — update a sleep entry.
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const validation = validateSleepData(req.body);

    if (validation.error) {
      return res.status(400).json({
        error: validation.error,
      });
    }

    const entry = await prisma.sleepEntry.update({
      where: { id },
      data: validation.data,
    });

    return res.json(entry);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        error: "Sleep entry not found.",
      });
    }

    if (error.code === "P2002") {
      return res.status(409).json({
        error: "A sleep entry already exists for this date.",
      });
    }

    console.error("Error updating sleep entry:", error);

    return res.status(500).json({
      error: "Failed to update sleep entry.",
    });
  }
});

// DELETE /api/sleep/:id — delete a sleep entry.
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existingEntry = await prisma.sleepEntry.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingEntry) {
      return res.status(404).json({
        error: "Sleep entry not found.",
      });
    }

    await prisma.sleepEntry.delete({
      where: { id },
    });

    return res.json({
      message: "Sleep entry deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting sleep entry:", error);

    return res.status(500).json({
      error: "Failed to delete sleep entry.",
    });
  }
});

export default router;
