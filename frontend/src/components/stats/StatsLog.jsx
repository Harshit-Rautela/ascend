
import { useState } from "react";
import { saveBodyStat } from "./statsAPI";
import "./stats.css";

const today = new Date().toLocaleDateString("en-CA");

const metricOptions = [
  { value: "weight", label: "Body weight", unit: "kg" },
  { value: "bodyFat", label: "Body fat", unit: "%" },
  { value: "waist", label: "Waist", unit: "cm" },
];

export default function StatsLog({ onSaved }) {
  const [type, setType] = useState("weight");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedMetric = metricOptions.find(
    (metric) => metric.value === type
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const numericValue = Number(value);

    if (!value.trim() || !Number.isFinite(numericValue) || numericValue <= 0) {
      setError("Enter a valid positive value.");
      return;
    }

    if (!date) {
      setError("Select a date.");
      return;
    }

    try {
      setSaving(true);

      await saveBodyStat({
        type,
        value: numericValue,
        date,
        notes: notes.trim() || undefined,
      });

      setSuccess(`${selectedMetric.label} saved successfully.`);
      setValue("");
      setNotes("");

      if (onSaved) {
        await onSaved();
      }
    } catch (err) {
      setError(err.message || "Failed to save your entry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="stats-log-form">
      <h2>Log body stats</h2>
      <p>Record a measurement to update your performance overview.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="body-stat-type">Metric</label>
        <select
          id="body-stat-type"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          {metricOptions.map((metric) => (
            <option key={metric.value} value={metric.value}>
              {metric.label}
            </option>
          ))}
        </select>

        <label htmlFor="body-stat-value">
          Value ({selectedMetric.unit})
        </label>
        <input
          id="body-stat-value"
          type="number"
          min="0.01"
          step="any"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={`Enter ${selectedMetric.label.toLowerCase()}`}
          required
        />

        <label htmlFor="body-stat-date">Measurement date</label>
        <input
          id="body-stat-date"
          type="date"
          value={date}
          max={today}
          onChange={(event) => setDate(event.target.value)}
          required
        />

        <label htmlFor="body-stat-notes">Notes (optional)</label>
        <textarea
          id="body-stat-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Add any useful details..."
          rows={3}
        />

        {error && <p role="alert" className="stats-form-error">{error}</p>}
        {success && <p role="status" className="stats-form-success">{success}</p>}

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save measurement"}
        </button>
      </form>
    </section>
  );
}
