
import { Router } from "express";
import prisma from "../prisma.js";
import { CATEGORY_DETAILS } from "../utils/biomarkerCategories.js";
import { uploadSinglePdf } from "../middleware/pdfUpload.js";
import { analyzeMedicalReport } from "../services/medicalReportAI.js";
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

router.get("/overview", async (req, res) => {
  try {
    const biomarkers = await prisma.biomarker.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        key: true,
        name: true,
        category: true,
        dataType: true,
        defaultUnit: true,
        description: true,

        results: {
          orderBy: [
            { measuredAt: "desc" },
            { createdAt: "desc" },
            { id: "desc" },
          ],
          take: 1,
          select: {
            id: true,
            valueNumeric: true,
            valueText: true,
            unit: true,
            measuredAt: true,
            referenceLow: true,
            referenceHigh: true,
            referenceRange: true,
            labFlag: true,
            source: true,
            sourceName: true,
            notes: true,
          },
        },
      },
    });

    const categories = Object.entries(CATEGORY_DETAILS)
      .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
      .map(([category, details]) => ({
        key: category,
        label: details.label,
        description: details.description,

        biomarkers: biomarkers
          .filter((biomarker) => biomarker.category === category)
          .map(({ results, ...biomarker }) => ({
            ...biomarker,
            latestResult: results[0] ?? null,
          })),
      }));

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("Error fetching Stats overview:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to fetch Stats overview.",
    });
  }
});


router.post(
  "/reports/analyze",
  uploadSinglePdf,
  async (req, res) => {
    try {
      // 1. Ensure a PDF was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "Please upload a PDF report.",
        });
      }

      const pdfBuffer = req.file.buffer;

      // 2. Verify actual PDF signature
      const pdfSignature = pdfBuffer
        .subarray(0, 5)
        .toString("ascii");

      if (pdfSignature !== "%PDF-") {
        return res.status(400).json({
          success: false,
          error: "Invalid PDF file.",
        });
      }

      // 3. Fetch the biomarker catalog from the database
      const biomarkers = await prisma.biomarker.findMany({
        select: {
          id: true,
          key: true,
          name: true,
          category: true,
          dataType: true,
          defaultUnit: true,
        },
      });

      // 4. Send PDF to Gemini for extraction
      const extraction = await analyzeMedicalReport(
        pdfBuffer,
        biomarkers
      );

      // 5. Match extracted measurements against our catalog
      const biomarkerByKey = new Map(
        biomarkers.map((biomarker) => [
          biomarker.key,
          biomarker,
        ])
      );

      const measurements = extraction.measurements.map((item) => {
        const matchedBiomarker = biomarkerByKey.get(
          item.biomarkerKey
        );

        // Reject invalid or incompatible catalog matches
        if (
          !matchedBiomarker ||
          matchedBiomarker.dataType !== item.valueType
        ) {
          return {
            ...item,
            biomarkerKey: null,
            biomarkerId: null,
            biomarkerName: null,
            category: null,
            matched: false,
          };
        }

        return {
          ...item,
          biomarkerId: matchedBiomarker.id,
          biomarkerName: matchedBiomarker.name,
          category: matchedBiomarker.category,
          matched: true,
        };
      });

      // 6. Return extracted data for frontend review
      return res.status(200).json({
        success: true,

        report: {
          reportType: extraction.reportType,
          reportDate: extraction.reportDate,
        },

        measurements,

        unmatchedItems: extraction.unmatchedItems,

        summary: {
          totalMeasurements: measurements.length,

          matchedMeasurements: measurements.filter(
            (item) => item.matched
          ).length,

          unmatchedMeasurements:
            measurements.filter((item) => !item.matched).length +
            extraction.unmatchedItems.length,
        },
      });

    } catch (error) {
      // Do not log the PDF, its buffer, or extracted medical data.
      console.error(
        "Medical report analysis failed:",
        error.message
      );

      return res.status(502).json({
        success: false,
        error: "Unable to analyze the medical report. Please try again.",
      });

    } finally {
      // Release our reference to the uploaded PDF buffer.
      if (req.file) {
        req.file.buffer = null;
      }
    }
  }
);


export default router;
