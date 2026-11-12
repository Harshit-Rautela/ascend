
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Activity,
  CalendarDays,
  FlaskConical,
  Clock3,
  TrendingUp,
  Database,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { getBiomarkerHistory } from "./statsAPI";

function extractResults(data) {
  if (Array.isArray(data)) return data;
  return data?.results || data?.history || [];
}

function formatValue(result) {
  if (
    result.valueNumeric !== null &&
    result.valueNumeric !== undefined
  ) {
    return result.valueNumeric;
  }

  return result.valueText ?? "—";
}

function formatDate(date) {
  if (!date) return "Date not available";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Date not available";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(date) {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function getReferenceRange(result) {
  if (result.referenceRange) return result.referenceRange;

  if (
    result.referenceLow !== null &&
    result.referenceLow !== undefined &&
    result.referenceHigh !== null &&
    result.referenceHigh !== undefined
  ) {
    return `${result.referenceLow} – ${result.referenceHigh} ${
      result.unit || ""
    }`;
  }

  return "Not provided";
}

function formatSource(source) {
  const labels = {
    MANUAL: "Manual entry",
    LAB_REPORT: "Lab report",
    WEARABLE: "Wearable",
    FITNESS_TEST: "Fitness test",
  };

  return labels[source] || source || "Unknown source";
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;

  return (
    <div className="biomarker-chart-tooltip">
      <span>{formatDate(point.measuredAt)}</span>

      <strong>
        {point.value} {point.unit}
      </strong>
    </div>
  );
}

export default function BiomarkerDetails({
  biomarker,
  onBack,
}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        setLoading(true);
        setError("");

        const data = await getBiomarkerHistory(biomarker.id);
        const results = extractResults(data);

        if (!cancelled) {
          setHistory(results);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || "Failed to load biomarker history."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [biomarker.id]);

  // The API returns records newest-first.
  const latestResult = history[0] || null;

  // Only numeric measurements can be plotted.
  const numericResults = history.filter(
    (result) =>
      result.valueNumeric !== null &&
      result.valueNumeric !== undefined &&
      Number.isFinite(Number(result.valueNumeric))
  );

  // Use the most recent numeric result's unit as the chart unit.
  // Never connect measurements with different units.
  const chartUnit = numericResults[0]?.unit || "";

  const compatibleResults = numericResults.filter(
    (result) => result.unit === chartUnit
  );

  // Recharts should receive chronological data.
  const chartData = compatibleResults
    .map((result) => ({
      id: result.id,
      value: Number(result.valueNumeric),
      unit: result.unit,
      measuredAt: result.measuredAt,
      dateLabel: formatShortDate(result.measuredAt),
    }))
    .sort(
      (a, b) =>
        new Date(a.measuredAt) - new Date(b.measuredAt)
    );

  const hasNumericBiomarker =
    biomarker.dataType === "NUMERIC";

  const canShowTrend =
    hasNumericBiomarker && chartData.length >= 2;

  return (
    <section className="biomarker-details">

      {/* Back navigation */}
      <button
        type="button"
        className="biomarker-back-button"
        onClick={onBack}
      >
        <span className="biomarker-back-icon">
          <ArrowLeft size={17} />
        </span>

        <span>Back to biomarkers</span>
      </button>

      {/* Biomarker heading */}
      <header className="biomarker-details-header">
        <div className="biomarker-details-icon">
          <FlaskConical size={24} />
        </div>

        <div>
          <span className="stats-eyebrow">
            BIOMARKER DETAILS
          </span>

          <h2>{biomarker.name}</h2>

          <p>
            {biomarker.description ||
              "View your recorded measurements and history."}
          </p>
        </div>
      </header>

      {loading && (
        <div className="biomarker-loading-state" role="status">
          <span className="biomarker-loading-spinner" />
          <p>Loading measurement history...</p>
        </div>
      )}

      {error && (
        <div role="alert" className="biomarker-error-state">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Summary */}
          <section className="biomarker-summary-grid">

            <article className="biomarker-summary-card biomarker-summary-primary">
              <div className="biomarker-summary-label">
                <Activity size={16} />
                Latest measurement
              </div>

              <div className="biomarker-summary-value">
                {latestResult ? formatValue(latestResult) : "—"}

                {latestResult?.unit && (
                  <span>{latestResult.unit}</span>
                )}
              </div>

              <p>
                {latestResult
                  ? `Recorded on ${formatDate(latestResult.measuredAt)}`
                  : "No measurement recorded yet"}
              </p>
            </article>

            <article className="biomarker-summary-card">
              <div className="biomarker-summary-label">
                <FlaskConical size={16} />
                Reference range
              </div>

              <strong className="biomarker-summary-secondary-value">
                {latestResult
                  ? getReferenceRange(latestResult)
                  : "Not available"}
              </strong>

              <p>
                {latestResult
                  ? "Based on the latest recorded result"
                  : "No reference range recorded"}
              </p>
            </article>

            <article className="biomarker-summary-card">
              <div className="biomarker-summary-label">
                <Database size={16} />
                Total measurements
              </div>

              <strong className="biomarker-summary-count">
                {history.length}
              </strong>

              <p>
                {history.length === 1
                  ? "Recorded measurement"
                  : "Recorded measurements"}
              </p>
            </article>

          </section>

          {/* Trend chart */}
          {hasNumericBiomarker && (
            <section className="biomarker-chart-section">

              <div className="biomarker-section-heading">
                <div>
                  <h3>
                    <TrendingUp size={18} />
                    Measurement trend
                  </h3>

                  <p>
                    Historical values plotted over time.
                  </p>
                </div>

                {chartUnit && (
                  <span className="biomarker-chart-unit">
                    {chartUnit}
                  </span>
                )}
              </div>

              {canShowTrend ? (
                <>
                  <div className="biomarker-chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{
                          top: 12,
                          right: 18,
                          left: 0,
                          bottom: 4,
                        }}
                      >
                        <CartesianGrid
                          stroke="#263445"
                          strokeDasharray="4 4"
                          vertical={false}
                        />

                        <XAxis
                          dataKey="dateLabel"
                          tick={{
                            fill: "#94a3b8",
                            fontSize: 11,
                          }}
                          axisLine={false}
                          tickLine={false}
                          minTickGap={20}
                        />

                        <YAxis
                          tick={{
                            fill: "#94a3b8",
                            fontSize: 11,
                          }}
                          axisLine={false}
                          tickLine={false}
                          width={48}
                          domain={["auto", "auto"]}
                        />

                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{
                            stroke: "#64748b",
                            strokeDasharray: "4 4",
                          }}
                        />

                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#4ade80"
                          strokeWidth={2.5}
                          dot={{
                            r: 4,
                            fill: "#4ade80",
                            stroke: "#0b1220",
                            strokeWidth: 2,
                          }}
                          activeDot={{
                            r: 6,
                            fill: "#86efac",
                            stroke: "#0b1220",
                            strokeWidth: 2,
                          }}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {compatibleResults.length < numericResults.length && (
                    <p className="biomarker-chart-note">
                      The chart shows measurements in {chartUnit}.
                      Results recorded in other units are excluded
                      to avoid misleading comparisons.
                    </p>
                  )}
                </>
              ) : (
                <div className="biomarker-chart-empty">
                  <TrendingUp size={25} />

                  <h4>
                    {chartData.length === 1
                      ? "Not enough data for a trend"
                      : "No numeric measurements available"}
                  </h4>

                  <p>
                    {chartData.length === 1
                      ? "A trend visualization requires at least two compatible measurements."
                      : "Numeric measurement history will appear here when available."}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Measurement history */}
          <section className="biomarker-history-section">

            <div className="biomarker-history-heading">
              <div>
                <h3>Measurement history</h3>

                <p>
                  Your previously recorded results.
                </p>
              </div>

              <span>
                {history.length}{" "}
                {history.length === 1 ? "record" : "records"}
              </span>
            </div>

            {history.length > 0 ? (
              <div className="biomarker-history-list">
                {history.map((result) => (
                  <article
                    className="biomarker-history-item"
                    key={result.id}
                  >
                    <div className="biomarker-history-icon">
                      <Activity size={18} />
                    </div>

                    <div className="biomarker-history-info">
                      <strong>
                        {formatValue(result)}{" "}
                        {result.unit || ""}
                      </strong>

                      <span>
                        <CalendarDays size={13} />
                        {formatDate(result.measuredAt)}
                      </span>
                    </div>

                    <div className="biomarker-history-meta">
                      <span>
                        {formatSource(result.source)}
                      </span>

                      {result.labFlag && (
                        <small>{result.labFlag}</small>
                      )}

                      {result.sourceName && (
                        <small>{result.sourceName}</small>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="biomarker-history-empty">
                <Clock3 size={28} />

                <h4>No measurements yet</h4>

                <p>
                  There are no recorded results for this biomarker.
                </p>
              </div>
            )}

          </section>
        </>
      )}
    </section>
  );
}
