/**
 * Fetches historical sleep records and calculates averages, trends, and period comparisons.
 * Provides structured sleep analytics to sleepAI.js for Gemini to interpret.
 */
import prisma from "../prisma.js";

/**
 * Sleep analytics service.
 *
 * Uses UTC calendar dates because SleepEntry.sleepDate is stored
 * as a PostgreSQL DATE.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_DAYS = 30;

function getUtcDate(date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  );
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getDateRanges(referenceDate = new Date()) {
  const endDate = getUtcDate(referenceDate);
  endDate.setUTCDate(endDate.getUTCDate() + 1);

  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - PERIOD_DAYS);

  const previousStartDate = new Date(startDate);
  previousStartDate.setUTCDate(
    previousStartDate.getUTCDate() - PERIOD_DAYS
  );

  return {
    current: {
      startDate,
      endDate,
    },
    previous: {
      startDate: previousStartDate,
      endDate: startDate,
    },
  };
}

function calculateAverage(entries, field) {
  const values = entries
    .map((entry) => entry[field])
    .filter(
      (value) => typeof value === "number" && Number.isFinite(value)
    );

  if (values.length === 0) {
    return {
      average: null,
      recordedDays: 0,
    };
  }

  const total = values.reduce((sum, value) => sum + value, 0);

  return {
    average: Number((total / values.length).toFixed(2)),
    recordedDays: values.length,
  };
}

/**
 * Treat bedtimes shortly after midnight as part of the
 * previous evening. Example: 00:30 becomes 1470 minutes.
 */
function getNormalizedBedtimeMinutes(bedtime) {
  if (typeof bedtime !== "string") return null;

  const match = bedtime.match(/^([01]\d|2[0-3]):([0-5]\d)$/);

  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  let total = hours * 60 + minutes;

  if (total < 12 * 60) {
    total += 24 * 60;
  }

  return total;
}

function calculateBedtimeConsistency(entries) {
  const values = entries
    .map((entry) => getNormalizedBedtimeMinutes(entry.bedtime))
    .filter((value) => value !== null);

  if (values.length < 2) {
    return {
      averageBedtime: null,
      variabilityMinutes: null,
      recordedDays: values.length,
    };
  }

  const mean =
    values.reduce((sum, value) => sum + value, 0) / values.length;

  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;

  const standardDeviation = Math.sqrt(variance);

  const averageMinutes = Math.round(mean) % (24 * 60);

  const hours = Math.floor(averageMinutes / 60);
  const minutes = averageMinutes % 60;

  return {
    averageBedtime: `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}`,
    variabilityMinutes: Number(standardDeviation.toFixed(1)),
    recordedDays: values.length,
  };
}

function calculatePeriodMetrics(entries, range) {
  return {
    period: {
      startDate: formatDate(range.startDate),
      endDate: formatDate(
        new Date(range.endDate.getTime() - DAY_MS)
      ),
    },

    totalRecordedDays: entries.length,

    sleepDuration: calculateAverage(entries, "durationMinutes"),
    timeInBed: calculateAverage(entries, "timeInBedMinutes"),
    sleepQuality: calculateAverage(entries, "quality"),
    sleepScore: calculateAverage(entries, "sleepScore"),
    heartRate: calculateAverage(entries, "heartRate"),
    hrv: calculateAverage(entries, "hrv"),
    energy: calculateAverage(entries, "energy"),
    awakeMinutes: calculateAverage(entries, "awakeMinutes"),
    lightSleepMinutes: calculateAverage(
      entries,
      "lightSleepMinutes"
    ),
    deepSleepMinutes: calculateAverage(
      entries,
      "deepSleepMinutes"
    ),

    bedtimeConsistency: calculateBedtimeConsistency(entries),
  };
}

function calculateMetricChanges(current, previous) {
  const metricNames = [
    "sleepDuration",
    "timeInBed",
    "sleepQuality",
    "sleepScore",
    "heartRate",
    "hrv",
    "energy",
    "awakeMinutes",
    "lightSleepMinutes",
    "deepSleepMinutes",
  ];

  return Object.fromEntries(
    metricNames.map((metric) => {
      const currentAverage = current[metric].average;
      const previousAverage = previous[metric].average;

      if (
        currentAverage === null ||
        previousAverage === null
      ) {
        return [
          metric,
          {
            difference: null,
            percentageChange: null,
            comparisonAvailable: false,
          },
        ];
      }

      const difference = Number(
        (currentAverage - previousAverage).toFixed(2)
      );

      const percentageChange =
        previousAverage === 0
          ? null
          : Number(
              ((difference / Math.abs(previousAverage)) * 100).toFixed(2)
            );

      return [
        metric,
        {
          difference,
          percentageChange,
          comparisonAvailable: true,
        },
      ];
    })
  );
}

async function fetchSleepEntries(startDate, endDate) {
  return prisma.sleepEntry.findMany({
    where: {
      sleepDate: {
        gte: startDate,
        lt: endDate,
      },
    },
    orderBy: {
      sleepDate: "asc",
    },
    select: {
      sleepDate: true,
      bedtime: true,
      wakeTime: true,
      timeInBedMinutes: true,
      durationMinutes: true,
      quality: true,
      sleepScore: true,
      awakeMinutes: true,
      lightSleepMinutes: true,
      deepSleepMinutes: true,
      heartRate: true,
      hrv: true,
      energy: true,
    },
  });
}

export async function getSleepAnalytics(referenceDate = new Date()) {
  const ranges = getDateRanges(referenceDate);

  const [currentEntries, previousEntries] = await Promise.all([
    fetchSleepEntries(
      ranges.current.startDate,
      ranges.current.endDate
    ),
    fetchSleepEntries(
      ranges.previous.startDate,
      ranges.previous.endDate
    ),
  ]);

  const currentMetrics = calculatePeriodMetrics(
    currentEntries,
    ranges.current
  );

  const previousMetrics = calculatePeriodMetrics(
    previousEntries,
    ranges.previous
  );

  return {
    generatedAt: new Date().toISOString(),

    currentPeriod: currentMetrics,
    previousPeriod: previousMetrics,

    changes: calculateMetricChanges(
      currentMetrics,
      previousMetrics
    ),

    dataCoverage: {
      currentPeriod: {
        recordedDays: currentEntries.length,
        expectedDays: PERIOD_DAYS,
      },
      previousPeriod: {
        recordedDays: previousEntries.length,
        expectedDays: PERIOD_DAYS,
      },
    },
  };
}


/**
 * Retrieves individual sleep records within a validated date range.
 * Used by the AI assistant when a question requires day-level details.
 */
export async function getSleepHistory({ startDate, endDate }) {
  const isValidDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const parsed = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  };

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new Error("A valid startDate and endDate are required (YYYY-MM-DD).");
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  if (start > end) {
    throw new Error("startDate must be before or equal to endDate.");
  }

  const days = Math.floor((end - start) / 86400000) + 1;

  if (days > 60) {
    throw new Error("Sleep history requests are limited to 60 days.");
  }

  const endExclusive = new Date(end.getTime() + 86400000);

  const entries = await prisma.sleepEntry.findMany({
    where: {
      sleepDate: {
        gte: start,
        lt: endExclusive,
      },
    },
    orderBy: {
      sleepDate: "asc",
    },
    select: {
      sleepDate: true,
      bedtime: true,
      wakeTime: true,
      timeInBedMinutes: true,
      durationMinutes: true,
      quality: true,
      sleepScore: true,
      awakeMinutes: true,
      lightSleepMinutes: true,
      deepSleepMinutes: true,
      heartRate: true,
      hrv: true,
      energy: true,
      notes: true,
    },
  });

  return {
    requestedPeriod: { startDate, endDate },
    recordedDays: entries.length,
    entries: entries.map((entry) => ({
      ...entry,
      sleepDate: entry.sleepDate.toISOString().slice(0, 10),
    })),
  };
}
