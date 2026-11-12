
import { Router } from "express";
import prisma from "../prisma.js";
import { CATEGORY_DETAILS } from "../utils/biomarkerCategories.js";

const router = Router();


function parseLimit(value) {
    const raw = value ?? "50";

    if (
        typeof raw !== "string" ||
        !/^\d+$/.test(raw) ||
        Number(raw) < 1 ||
        Number(raw) > 100
    ) {
        return null;
    }

    return Number(raw);
}
// GET /api/biomarkers/categories
router.get("/categories", async (req, res) => {
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
            },
        });

        const groupedCategories = Object.entries(CATEGORY_DETAILS)
            .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
            .map(([category, details]) => ({
                key: category,
                label: details.label,
                description: details.description,
                biomarkers: biomarkers.filter(
                    (biomarker) => biomarker.category === category
                ),
            }));

        return res.status(200).json({
            success: true,
            categories: groupedCategories,
        });
    } catch (error) {
        console.error("Error fetching biomarker categories:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to fetch biomarker categories.",
        });
    }
});



// GET /api/biomarkers/latest
// Fetch the latest recorded result for every biomarker.
router.get("/latest", async (req, res) => {
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
                        { id: "desc" }
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

        const results = biomarkers.map((biomarker) => {
            const { results, ...biomarkerDetails } = biomarker;

            return {
                biomarker: biomarkerDetails,
                latestResult: results[0] ?? null,
            };
        });

        return res.status(200).json({
            success: true,
            count: results.length,
            results,
        });
    } catch (error) {
        console.error("Error fetching latest biomarker results:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to fetch latest biomarker results.",
        });
    }
});



const ALLOWED_SOURCES = [
    "MANUAL",
    "LAB_REPORT",
    "WEARABLE",
    "FITNESS_TEST",
];

function isOptionalString(value, maxLength) {
    return (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.length <= maxLength)
    );
}

function isOptionalNumber(value) {
    return (
        value === undefined ||
        value === null ||
        (typeof value === "number" && Number.isFinite(value))
    );
}

function parseMeasurementDate(value) {
    if (
        typeof value !== "string" ||
        value.trim() === "" ||
        !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)
    ) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    // Reject impossible calendar dates such as 2026-02-31.
    const datePart = value.slice(0, 10);
    const calendarDate = new Date(`${datePart}T00:00:00.000Z`);

    if (
        Number.isNaN(calendarDate.getTime()) ||
        calendarDate.toISOString().slice(0, 10) !== datePart
    ) {
        return null;
    }

    return date;
}

// POST /api/biomarkers/:biomarkerId/results
router.post("/:biomarkerId/results", async (req, res) => {
    try {
        const { biomarkerId } = req.params;

        const {
            valueNumeric,
            valueText,
            unit,
            measuredAt,
            referenceLow,
            referenceHigh,
            referenceRange,
            labFlag,
            source = "MANUAL",
            sourceName,
            notes,
        } = req.body ?? {};

        // 1. Validate required fields.
        if (typeof unit !== "string" || !unit.trim() || unit.length > 50) {
            return res.status(400).json({
                success: false,
                error: "A valid unit is required (maximum 50 characters).",
            });
        }

        const parsedDate = parseMeasurementDate(measuredAt);

        if (!parsedDate) {
            return res.status(400).json({
                success: false,
                error: "Provide a valid measuredAt date or datetime.",
            });
        }

        // 2. Validate optional numeric fields.
        if (
            !isOptionalNumber(referenceLow) ||
            !isOptionalNumber(referenceHigh)
        ) {
            return res.status(400).json({
                success: false,
                error: "Reference limits must be finite numbers.",
            });
        }

        if (
            referenceLow != null &&
            referenceHigh != null &&
            referenceLow > referenceHigh
        ) {
            return res.status(400).json({
                success: false,
                error: "referenceLow cannot exceed referenceHigh.",
            });
        }

        // 3. Validate optional string fields.
        if (
            !isOptionalString(referenceRange, 200) ||
            !isOptionalString(labFlag, 50) ||
            !isOptionalString(sourceName, 150) ||
            !isOptionalString(notes, 1000)
        ) {
            return res.status(400).json({
                success: false,
                error: "One or more optional fields have invalid values or exceed their length limits.",
            });
        }

        // 4. Validate source.
        if (!ALLOWED_SOURCES.includes(source)) {
            return res.status(400).json({
                success: false,
                error: `Source must be one of: ${ALLOWED_SOURCES.join(", ")}.`,
            });
        }

        // 5. Find the biomarker.
        const biomarker = await prisma.biomarker.findUnique({
            where: { id: biomarkerId },
            select: {
                id: true,
                key: true,
                name: true,
                dataType: true,
            },
        });

        if (!biomarker) {
            return res.status(404).json({
                success: false,
                error: "Biomarker not found.",
            });
        }

        // 6. Validate the result according to biomarker data type.
        let resultValue;

        if (biomarker.dataType === "NUMERIC") {
            if (
                typeof valueNumeric !== "number" ||
                !Number.isFinite(valueNumeric) ||
                valueText !== undefined && valueText !== null
            ) {
                return res.status(400).json({
                    success: false,
                    error: "This biomarker requires a numeric value and does not accept a text value.",
                });
            }

            resultValue = {
                valueNumeric,
                valueText: null,
            };
        } else if (biomarker.dataType === "TEXT") {
            if (
                typeof valueText !== "string" ||
                !valueText.trim() ||
                valueText.length > 500 ||
                valueNumeric !== undefined && valueNumeric !== null
            ) {
                return res.status(400).json({
                    success: false,
                    error: "This biomarker requires a non-empty text value and does not accept a numeric value.",
                });
            }

            if (referenceLow != null || referenceHigh != null) {
                return res.status(400).json({
                    success: false,
                    error: "Numeric reference limits are not supported for text biomarkers.",
                });
            }

            resultValue = {
                valueNumeric: null,
                valueText: valueText.trim(),
            };
        } else {
            return res.status(400).json({
                success: false,
                error: "Unsupported biomarker data type.",
            });
        }

        // 7. Save the result.
        const result = await prisma.biomarkerResult.create({
            data: {
                biomarkerId,
                ...resultValue,
                unit: unit.trim(),
                measuredAt: parsedDate,
                referenceLow: referenceLow ?? null,
                referenceHigh: referenceHigh ?? null,
                referenceRange: referenceRange?.trim() || null,
                labFlag: labFlag?.trim() || null,
                source,
                sourceName: sourceName?.trim() || null,
                notes: notes?.trim() || null,
            },
        });

        return res.status(201).json({
            success: true,
            message: "Biomarker result saved successfully.",
            result: {
                biomarker,
                ...result,
            },
        });
    } catch (error) {
        console.error("Error saving biomarker result:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to save biomarker result.",
        });
    }
});


// GET /api/biomarkers
router.get("/", async (req, res) => {
    try {
        const biomarkers = await prisma.biomarker.findMany({
            orderBy: [
                { category: "asc" },
                { name: "asc" },
            ],
            select: {
                id: true,
                key: true,
                name: true,
                category: true,
                dataType: true,
                defaultUnit: true,
                description: true,
            },
        });

        return res.status(200).json({
            success: true,
            count: biomarkers.length,
            biomarkers,
        });
    } catch (error) {
        console.error("Error fetching biomarkers:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to fetch biomarkers.",
        });
    }
});



// GET /api/biomarkers/:biomarkerId/results?limit=50
router.get("/:biomarkerId/results", async (req, res) => {
    try {
        const { biomarkerId } = req.params;
        const limit = parseLimit(req.query.limit);

        if (limit === null) {
            return res.status(400).json({
                success: false,
                error: "Limit must be between 1 and 100.",
            });
        }

        const biomarker = await prisma.biomarker.findUnique({
            where: { id: biomarkerId },
            select: {
                id: true,
                key: true,
                name: true,
                category: true,
                dataType: true,
                defaultUnit: true,
            },
        });

        if (!biomarker) {
            return res.status(404).json({
                success: false,
                error: "Biomarker not found.",
            });
        }

        const results = await prisma.biomarkerResult.findMany({
            where: { biomarkerId },
            orderBy: [
                { measuredAt: "desc" },
                { createdAt: "desc" },
                { id: "desc" },
            ],
            take: limit,
        });

        return res.status(200).json({
            success: true,
            biomarker,
            count: results.length,
            results,
        });
    } catch (error) {
        console.error("Error fetching biomarker history:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to fetch biomarker history.",
        });
    }
});


// PUT /api/biomarkers/results/:resultId
router.put("/results/:resultId", async (req, res) => {
    try {
        const { resultId } = req.params;

        const {
            valueNumeric,
            valueText,
            unit,
            measuredAt,
            referenceLow,
            referenceHigh,
            referenceRange,
            labFlag,
            source,
            sourceName,
            notes,
        } = req.body ?? {};

        // 1. Find the existing result and its biomarker.
        const existingResult = await prisma.biomarkerResult.findUnique({
            where: { id: resultId },
            include: {
                biomarker: {
                    select: {
                        id: true,
                        key: true,
                        name: true,
                        dataType: true,
                    },
                },
            },
        });

        if (!existingResult) {
            return res.status(404).json({
                success: false,
                error: "Biomarker result not found.",
            });
        }

        const resolvedSource =
            source === undefined ? existingResult.source : source;

        if (!ALLOWED_SOURCES.includes(resolvedSource)) {
            return res.status(400).json({
                success: false,
                error: "Invalid biomarker source.",
            });
        }
        const { biomarker } = existingResult;

        // 2. Validate unit and date.
        if (
            typeof unit !== "string" ||
            !unit.trim() ||
            unit.length > 50
        ) {
            return res.status(400).json({
                success: false,
                error: "A valid unit is required.",
            });
        }

        const parsedDate = parseMeasurementDate(measuredAt);

        if (!parsedDate) {
            return res.status(400).json({
                success: false,
                error: "Provide a valid measuredAt date or datetime.",
            });
        }

        // 3. Validate optional numeric fields.
        if (
            !isOptionalNumber(referenceLow) ||
            !isOptionalNumber(referenceHigh)
        ) {
            return res.status(400).json({
                success: false,
                error: "Reference limits must be finite numbers.",
            });
        }

        if (
            referenceLow != null &&
            referenceHigh != null &&
            referenceLow > referenceHigh
        ) {
            return res.status(400).json({
                success: false,
                error: "referenceLow cannot exceed referenceHigh.",
            });
        }

        // 4. Validate optional strings.
        if (
            !isOptionalString(referenceRange, 200) ||
            !isOptionalString(labFlag, 50) ||
            !isOptionalString(sourceName, 150) ||
            !isOptionalString(notes, 1000)
        ) {
            return res.status(400).json({
                success: false,
                error: "One or more optional fields are invalid.",
            });
        }

        // 5. Validate source.
        if (!ALLOWED_SOURCES.includes(source)) {
            return res.status(400).json({
                success: false,
                error: "Invalid biomarker source.",
            });
        }

        // 6. Validate value against biomarker data type.
        let resultValue;

        if (biomarker.dataType === "NUMERIC") {
            if (
                typeof valueNumeric !== "number" ||
                !Number.isFinite(valueNumeric) ||
                (valueText !== undefined && valueText !== null)
            ) {
                return res.status(400).json({
                    success: false,
                    error: "This biomarker requires a numeric value.",
                });
            }

            resultValue = {
                valueNumeric,
                valueText: null,
            };
        } else if (biomarker.dataType === "TEXT") {
            if (
                typeof valueText !== "string" ||
                !valueText.trim() ||
                valueText.length > 500 ||
                (valueNumeric !== undefined && valueNumeric !== null)
            ) {
                return res.status(400).json({
                    success: false,
                    error: "This biomarker requires a valid text value.",
                });
            }

            if (referenceLow != null || referenceHigh != null) {
                return res.status(400).json({
                    success: false,
                    error: "Numeric reference limits are not supported for text biomarkers.",
                });
            }

            resultValue = {
                valueNumeric: null,
                valueText: valueText.trim(),
            };
        } else {
            return res.status(400).json({
                success: false,
                error: "Unsupported biomarker data type.",
            });
        }

        // 7. Update the result.
        const updatedResult = await prisma.biomarkerResult.update({
            where: { id: resultId },
            data: {
                ...resultValue,
                unit: unit.trim(),
                measuredAt: parsedDate,
                referenceLow: referenceLow ?? null,
                referenceHigh: referenceHigh ?? null,
                referenceRange: referenceRange?.trim() || null,
                labFlag: labFlag?.trim() || null,
                source,
                sourceName: sourceName?.trim() || null,
                notes: notes?.trim() || null,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Biomarker result updated successfully.",
            result: {
                biomarker,
                ...updatedResult,
            },
        });
    } catch (error) {
        console.error("Error updating biomarker result:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to update biomarker result.",
        });
    }
});

// DELETE /api/biomarkers/results/:resultId
router.delete("/results/:resultId", async (req, res) => {
    try {
        const { resultId } = req.params;

        const existingResult = await prisma.biomarkerResult.findUnique({
            where: { id: resultId },
            select: { id: true },
        });

        if (!existingResult) {
            return res.status(404).json({
                success: false,
                error: "Biomarker result not found.",
            });
        }

        await prisma.biomarkerResult.delete({
            where: { id: resultId },
        });

        return res.status(200).json({
            success: true,
            message: "Biomarker result deleted successfully.",
        });
    } catch (error) {
        console.error("Error deleting biomarker result:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to delete biomarker result.",
        });
    }
});

export default router