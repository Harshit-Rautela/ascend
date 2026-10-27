
const API_BASE_URL = "http://localhost:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }

  return data;
}

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
