
import { useState, useEffect, useCallback } from "react";

import {
    getBodyStats,
    getBiomarkerCategories,
    getBiomarkers,
    getLatestBiomarkers,
} from "./statsAPI";

// Handles API responses that return either an array
// directly or an array inside a named property.
function extractArray(data, possibleKeys = []) {
    if (Array.isArray(data)) {
        return data;
    }

    for (const key of possibleKeys) {
        if (Array.isArray(data?.[key])) {
            return data[key];
        }
    }

    return [];
}

export default function useStats() {
    const [bodyStats, setBodyStats] = useState({
        weight: null,
        bodyFat: null,
        waist: null,
    });

    const [categories, setCategories] = useState([]);
    const [biomarkers, setBiomarkers] = useState([]);
    const [latestResults, setLatestResults] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadStats = useCallback(async () => {
        setError("");

        const results = await Promise.allSettled([
            getBodyStats(),
            getBiomarkerCategories(),
            getBiomarkers(),
            getLatestBiomarkers(),
        ]);

        const errors = [];

        // Body measurements
        if (results[0].status === "fulfilled") {
            const data = results[0].value;

            setBodyStats({
                weight: data.weight ?? null,
                bodyFat: data.bodyFat ?? null,
                waist: data.waist ?? null,
            });
        } else {
            errors.push("Failed to load body measurements.");
        }

        // Biomarker categories
        if (results[1].status === "fulfilled") {
            setCategories(
                extractArray(results[1].value, ["categories"])
            );
        } else {
            errors.push("Failed to load biomarker categories.");
        }

        // Biomarker catalog
        if (results[2].status === "fulfilled") {
            setBiomarkers(
                extractArray(results[2].value, ["biomarkers"])
            );
        } else {
            errors.push("Failed to load biomarker catalog.");
        }

        // Latest biomarker results
        if (results[3].status === "fulfilled") {
            setLatestResults(
                extractArray(results[3].value, [
                    "results",
                    "latestResults",
                ])
            );
        } else {
            errors.push("Failed to load latest biomarker results.");
        }

        setError(errors.join(" "));
        setLoading(false);
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    return {
        bodyStats,
        categories,
        biomarkers,
        latestResults,
        loading,
        error,
        refresh: loadStats,
    };
}
