import API_BASE_URL from "../../config/api.js";

async function request(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
    }

    return data;
}

// -----------------------------
// Body measurements
// -----------------------------

export function getBodyStats() {
    return request("/stats/body");
}

export function saveBodyStat(entry) {
    return request("/stats/body", {
        method: "POST",
        body: JSON.stringify(entry),
    });
}

export function getBodyStatsHistory(limit = 50) {
    return request(`/stats/body/history?limit=${limit}`);
}

// -----------------------------
// Biomarker categories
// -----------------------------

export function getBiomarkerCategories() {
    return request("/biomarkers/categories");
}

// -----------------------------
// Biomarker catalog
// -----------------------------

export function getBiomarkers(category) {
    const query = category
        ? `?category=${encodeURIComponent(category)}`
        : "";

    return request(`/biomarkers${query}`);
}

// -----------------------------
// Latest biomarker results
// -----------------------------

export function getLatestBiomarkers() {
    return request("/biomarkers/latest");
}

// -----------------------------
// Individual biomarker history
// -----------------------------

export function getBiomarkerHistory(biomarkerId, limit = 50) {
    return request(
        `/biomarkers/${encodeURIComponent(biomarkerId)}/results?limit=${limit}`
    );
}

// -----------------------------
// Add biomarker result
// -----------------------------

export function saveBiomarkerResult(biomarkerId, result) {
    return request(
        `/biomarkers/${encodeURIComponent(biomarkerId)}/results`,
        {
            method: "POST",
            body: JSON.stringify(result),
        }
    );
}

// -----------------------------
// Update biomarker result
// -----------------------------

export function updateBiomarkerResult(resultId, result) {
    return request(`/biomarkers/results/${encodeURIComponent(resultId)}`, {
        method: "PUT",
        body: JSON.stringify(result),
    });
}

// -----------------------------
// Delete biomarker result
// -----------------------------

export function deleteBiomarkerResult(resultId) {
    return request(`/biomarkers/results/${encodeURIComponent(resultId)}`, {
        method: "DELETE",
    });
}

// Analyze a PDF medical report.
// FormData is intentional: do not manually set Content-Type.
export async function analyzeMedicalReport(file) {
    const formData = new FormData();
    formData.append("report", file);

    const response = await fetch(
        `${API_BASE_URL}/stats/reports/analyze`,
        {
            method: "POST",
            body: formData,
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.error || "Unable to analyze medical report."
        );
    }

    return data;
}

// Save one user-confirmed extracted biomarker result.
// export function saveBiomarkerResult(biomarkerId, result) {
//   return request(`/biomarkers/${biomarkerId}/results`, {
//     method: "POST",
//     body: JSON.stringify(result),
//   });
// }