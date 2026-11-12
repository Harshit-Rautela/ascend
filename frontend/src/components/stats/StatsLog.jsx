
import { useEffect, useState } from "react";
import { Scale, FlaskConical } from "lucide-react";

import {
  saveBodyStat,
  getBiomarkers,
  saveBiomarkerResult,
} from "./statsAPI";

import BiomarkerSelect from "./components/BiomarkerSelect";
import MedicalReportImport from "./components/MedicalReportImport";
import "./stats.css";

const today = new Date().toLocaleDateString("en-CA");

const metricOptions = [
  { value: "weight", label: "Body weight", unit: "kg" },
  { value: "bodyFat", label: "Body fat", unit: "%" },
  { value: "waist", label: "Waist", unit: "cm" },
];

export default function StatsLog({ onSaved }) {
  const [mode, setMode] = useState("BODY");

  // Body measurement state
  const [type, setType] = useState("weight");

  // Biomarker state
  const [biomarkers, setBiomarkers] = useState([]);
  const [selectedBiomarkerId, setSelectedBiomarkerId] = useState("");

  // Shared form state
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("kg");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");

  // Biomarker reference range
  const [referenceLow, setReferenceLow] = useState("");
  const [referenceHigh, setReferenceHigh] = useState("");
  const [referenceRange, setReferenceRange] = useState("");

  const [saving, setSaving] = useState(false);
  const [loadingBiomarkers, setLoadingBiomarkers] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedMetric = metricOptions.find(
    (metric) => metric.value === type
  );

  const selectedBiomarker = biomarkers.find(
    (biomarker) => biomarker.id === selectedBiomarkerId
  );

  // Load biomarker catalog when biomarker logging is selected.
  useEffect(() => {
    if (mode !== "BIOMARKER" || biomarkers.length > 0) return;

    let cancelled = false;

    async function loadBiomarkers() {
      try {
        setLoadingBiomarkers(true);
        setError("");

        const data = await getBiomarkers();

        const items = Array.isArray(data)
          ? data
          : data.biomarkers || [];

        if (!cancelled) {
          setBiomarkers(items);

          if (items.length > 0) {
            setSelectedBiomarkerId(items[0].id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load biomarkers.");
        }
      } finally {
        if (!cancelled) {
          setLoadingBiomarkers(false);
        }
      }
    }

    loadBiomarkers();

    return () => {
      cancelled = true;
    };
  }, [mode, biomarkers.length]);

  // Update the unit when the selected biomarker changes.
  useEffect(() => {
    if (selectedBiomarker) {
      setUnit(selectedBiomarker.defaultUnit || "");
      setValue("");
    }
  }, [selectedBiomarkerId]);

  // Update body measurement unit.
  useEffect(() => {
    if (mode === "BODY" && selectedMetric) {
      setUnit(selectedMetric.unit);
    }
  }, [mode, type]);

  function resetForm() {
    setValue("");
    setNotes("");
    setReferenceLow("");
    setReferenceHigh("");
    setReferenceRange("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!date) {
      setError("Select a measurement date.");
      return;
    }

    try {
      setSaving(true);

      if (mode === "BODY") {
        const numericValue = Number(value);

        if (
          !value.trim() ||
          !Number.isFinite(numericValue) ||
          numericValue <= 0
        ) {
          setError("Enter a valid positive value.");
          return;
        }

        await saveBodyStat({
          type,
          value: numericValue,
          date,
          notes: notes.trim() || undefined,
        });

        setSuccess(`${selectedMetric.label} saved successfully.`);
      } else {
        if (!selectedBiomarker) {
          setError("Select a biomarker.");
          return;
        }

        if (!unit.trim()) {
          setError("Enter a measurement unit.");
          return;
        }

        const isNumeric =
          selectedBiomarker.dataType === "NUMERIC";

        const numericValue = Number(value);

        if (!value.trim()) {
          setError("Enter a measurement value.");
          return;
        }

        if (isNumeric && !Number.isFinite(numericValue)) {
          setError("Enter a valid numeric value.");
          return;
        }

        if (!isNumeric && value.trim().length > 500) {
          setError("Text value cannot exceed 500 characters.");
          return;
        }

        const low =
          referenceLow.trim() === ""
            ? undefined
            : Number(referenceLow);

        const high =
          referenceHigh.trim() === ""
            ? undefined
            : Number(referenceHigh);

        if (
          (low !== undefined && !Number.isFinite(low)) ||
          (high !== undefined && !Number.isFinite(high))
        ) {
          setError("Enter valid reference range values.");
          return;
        }

        if (
          low !== undefined &&
          high !== undefined &&
          low > high
        ) {
          setError("Reference minimum cannot exceed maximum.");
          return;
        }

        await saveBiomarkerResult(selectedBiomarker.id, {
          ...(isNumeric
            ? { valueNumeric: numericValue }
            : { valueText: value.trim() }),
          unit: unit.trim(),
          measuredAt: date,
          referenceLow: low,
          referenceHigh: high,
          referenceRange: referenceRange.trim() || undefined,
          notes: notes.trim() || undefined,
          source: "MANUAL",
        });

        setSuccess(`${selectedBiomarker.name} saved successfully.`);
      }

      resetForm();

      if (onSaved) {
        await onSaved();
      }
    } catch (err) {
      setError(err.message || "Failed to save measurement.");
    } finally {
      setSaving(false);
    }
  }

  function handleModeChange(nextMode) {
    setMode(nextMode);
    resetForm();
    setError("");
    setSuccess("");
  }

  return (
    <section className="stats-log-page">
      {/* Page heading */}
      <div className="stats-log-heading">
        <div>
          <span className="stats-log-eyebrow">HEALTH JOURNAL</span>
          <h2>Log your health data</h2>
          <p>
            Keep your measurements and lab results together in one place.
          </p>
        </div>
      </div>

      {/* Measurement type selector */}
      <div
        className="stats-log-modes"
        role="group"
        aria-label="Measurement type"
      >
        <button
          type="button"
          className={mode === "BODY" ? "active" : ""}
          aria-pressed={mode === "BODY"}
          onClick={() => handleModeChange("BODY")}
        >
          <Scale size={17} aria-hidden="true" />
          Body measurements
        </button>

        <button
          type="button"
          className={mode === "BIOMARKER" ? "active" : ""}
          aria-pressed={mode === "BIOMARKER"}
          onClick={() => handleModeChange("BIOMARKER")}
        >
          <FlaskConical size={17} aria-hidden="true" />
          Biomarkers
        </button>
      </div>

      {/* Main two-card layout */}
      <div className="stats-log-layout">
        {/* Manual entry card */}
        <section
          className="stats-log-form"
          aria-labelledby="stats-log-form-title"
        >
          <div className="stats-log-card-heading">
            <div className="stats-log-card-icon" aria-hidden="true">
              {mode === "BODY" ? (
                <Scale size={19} />
              ) : (
                <FlaskConical size={19} />
              )}
            </div>

            <div>
              <h3 id="stats-log-form-title">
                {mode === "BODY"
                  ? "Manual body measurement"
                  : "Manual biomarker result"}
              </h3>

              <p>
                {mode === "BODY"
                  ? "Add a new measurement to your health history."
                  : "Enter the result exactly as it appears on your lab report."}
              </p>
            </div>
          </div>

          {loadingBiomarkers ? (
            <p className="stats-loading" role="status">
              Loading biomarker catalog...
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Measurement selector */}
              {mode === "BODY" ? (
                <div className="stats-field-group">
                  <label htmlFor="body-stat-type">Measurement</label>

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
                </div>
              ) : (
                <div className="stats-field-group">
                  <label htmlFor="biomarker-select">Biomarker</label>

                  <BiomarkerSelect
                    biomarkers={biomarkers}
                    value={selectedBiomarkerId}
                    onChange={setSelectedBiomarkerId}
                  />

                  {selectedBiomarker && (
                    <p className="stats-field-hint">
                      {selectedBiomarker.description ||
                        "Enter the measured value for this biomarker."}
                    </p>
                  )}
                </div>
              )}

              {/* Measurement value */}
              <div className="stats-field-group">
                <label htmlFor="stats-value">
                  {mode === "BODY"
                    ? "Measurement value"
                    : "Result value"}
                </label>

                <div className="stats-value-input-wrap">
                  <input
                    id="stats-value"
                    className="stats-value-input"
                    type="text"
                    inputMode={
                      mode === "BODY" ||
                      selectedBiomarker?.dataType === "NUMERIC"
                        ? "decimal"
                        : "text"
                    }
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder={
                      mode === "BODY"
                        ? "Enter your measurement"
                        : "Enter the lab result"
                    }
                    required
                  />

                  <span className="stats-value-unit">
                    {mode === "BODY"
                      ? selectedMetric?.unit
                      : unit || "unit"}
                  </span>
                </div>
              </div>

              {/* Biomarker-specific fields */}
              {mode === "BIOMARKER" && (
                <>
                  <div className="stats-field-group">
                    <label htmlFor="biomarker-unit">Result unit</label>

                    <input
                      id="biomarker-unit"
                      value={unit}
                      onChange={(event) => setUnit(event.target.value)}
                      placeholder="e.g. mg/dL, %, bpm"
                      maxLength={50}
                      required
                    />
                  </div>

                  {selectedBiomarker?.dataType === "NUMERIC" && (
                    <div className="stats-field-group">
                      <label>
                        Reference interval{" "}
                        <span className="stats-optional">Optional</span>
                      </label>

                      <div className="stats-reference-inputs">
                        <input
                          type="number"
                          step="any"
                          aria-label="Reference minimum"
                          placeholder="Minimum"
                          value={referenceLow}
                          onChange={(event) =>
                            setReferenceLow(event.target.value)
                          }
                        />

                        <input
                          type="number"
                          step="any"
                          aria-label="Reference maximum"
                          placeholder="Maximum"
                          value={referenceHigh}
                          onChange={(event) =>
                            setReferenceHigh(event.target.value)
                          }
                        />
                      </div>

                      <p className="stats-field-hint">
                        Use the reference interval printed by the laboratory
                        for this result.
                      </p>
                    </div>
                  )}

                  <div className="stats-field-group">
                    <label htmlFor="reference-range">
                      Reference range note{" "}
                      <span className="stats-optional">Optional</span>
                    </label>

                    <input
                      id="reference-range"
                      value={referenceRange}
                      onChange={(event) =>
                        setReferenceRange(event.target.value)
                      }
                      placeholder="e.g. 4.0 – 5.6 %"
                    />
                  </div>
                </>
              )}

              {/* Date */}
              <div className="stats-field-group">
                <label htmlFor="stats-date">Measurement date</label>

                <input
                  id="stats-date"
                  type="date"
                  value={date}
                  max={today}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </div>

              {/* Notes */}
              <div className="stats-field-group">
                <label htmlFor="stats-notes">
                  Notes <span className="stats-optional">Optional</span>
                </label>

                <textarea
                  id="stats-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add context, symptoms, or anything worth remembering..."
                  rows={3}
                />
              </div>

              {/* Feedback */}
              {error && (
                <p role="alert" className="stats-form-error">
                  {error}
                </p>
              )}

              {success && (
                <p role="status" className="stats-form-success">
                  {success}
                </p>
              )}

              {mode === "BIOMARKER" &&
                !loadingBiomarkers &&
                biomarkers.length === 0 && (
                  <p className="stats-form-error">
                    No biomarkers are available. Please check the biomarker
                    catalog.
                  </p>
                )}

              {/* Submit */}
              <button
                className="stats-log-submit"
                type="submit"
                disabled={
                  saving ||
                  (mode === "BIOMARKER" && biomarkers.length === 0)
                }
              >
                {saving ? "Saving measurement..." : "Save measurement"}
              </button>
            </form>
          )}
        </section>

        {/* Medical report import card */}
        <section
          className="stats-log-import-card"
          aria-label="Import a medical report"
        >
          <div className="stats-log-import-intro">
            <span className="stats-log-eyebrow">AI-ASSISTED ENTRY</span>

            <h3>Import a medical report</h3>

            <p>
              Upload a PDF lab report and review the extracted results before
              anything is saved.
            </p>
          </div>

          <MedicalReportImport onSaved={onSaved} />
        </section>
      </div>
    </section>
  );
}
