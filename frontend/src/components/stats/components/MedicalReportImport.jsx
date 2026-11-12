
import { useRef, useState } from "react";
import {
  analyzeMedicalReport,
  saveBiomarkerResult,
} from "../statsAPI";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const initialState = {
  file: null,
  extraction: null,
  selected: {},
  error: "",
  loading: false,
  saving: false,
  saveMessage: "",
};

function formatDate(value) {
  if (!value) return "";

  return value.slice(0, 10);
}

function getInitialSelection(measurements) {
  return Object.fromEntries(
    measurements.map((item, index) => [
      index,
      Boolean(item.matched),
    ])
  );
}

export default function MedicalReportImport({ onSaved }) {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [extraction, setExtraction] = useState(null);
  const [selected, setSelected] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const measurements = extraction?.measurements ?? [];

  function resetImport() {
    setFile(null);
    setExtraction(null);
    setSelected({});
    setError("");
    setSaveMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0];

    setError("");
    setExtraction(null);
    setSelected({});
    setSaveMessage("");

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (
      selectedFile.type !== "application/pdf" ||
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a valid PDF file.");
      setFile(null);
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("PDF size cannot exceed 10 MB.");
      setFile(null);
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  }

  async function handleAnalyze() {
    if (!file) {
      setError("Please select a PDF report first.");
      return;
    }

    setLoading(true);
    setError("");
    setExtraction(null);
    setSelected({});
    setSaveMessage("");

    try {
      const result = await analyzeMedicalReport(file);

      setExtraction(result);
      setSelected(
        getInitialSelection(result.measurements ?? [])
      );
    } catch (err) {
      setError(
        err.message || "Failed to analyze medical report."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateMeasurement(index, field, value) {
    setExtraction((previous) => ({
      ...previous,
      measurements: previous.measurements.map(
        (measurement, currentIndex) =>
          currentIndex === index
            ? { ...measurement, [field]: value }
            : measurement
      ),
    }));
  }

  function toggleSelection(index) {
    setSelected((previous) => ({
      ...previous,
      [index]: !previous[index],
    }));
  }

  function getSelectedMeasurements() {
    return measurements
      .map((measurement, index) => ({
        ...measurement,
        selected: Boolean(selected[index]),
      }))
      .filter((measurement) => measurement.selected);
  }

  function validateMeasurement(item) {
    if (!item.matched || !item.biomarkerId) {
      return "This measurement is not matched to a biomarker.";
    }

    if (item.valueType === "NUMERIC") {
      if (
        item.valueNumeric === null ||
        item.valueNumeric === "" ||
        !Number.isFinite(Number(item.valueNumeric))
      ) {
        return "Enter a valid numeric result.";
      }

      if (
        item.referenceLow !== null &&
        item.referenceLow !== "" &&
        !Number.isFinite(Number(item.referenceLow))
      ) {
        return "Invalid lower reference limit.";
      }

      if (
        item.referenceHigh !== null &&
        item.referenceHigh !== "" &&
        !Number.isFinite(Number(item.referenceHigh))
      ) {
        return "Invalid upper reference limit.";
      }

      if (
        item.referenceLow !== null &&
        item.referenceLow !== "" &&
        item.referenceHigh !== null &&
        item.referenceHigh !== "" &&
        Number(item.referenceLow) > Number(item.referenceHigh)
      ) {
        return "Lower reference limit cannot exceed upper limit.";
      }
    } else if (
      typeof item.valueText !== "string" ||
      !item.valueText.trim()
    ) {
      return "Enter a text result.";
    }

    if (!item.measuredAt) {
      return "Please confirm the measurement date.";
    }

    if (!item.unit?.trim()) {
      return "Please enter the measurement unit.";
    }

    return null;
  }

  async function handleSave() {
    const selectedMeasurements = getSelectedMeasurements();

    if (selectedMeasurements.length === 0) {
      setError("Select at least one matched measurement.");
      return;
    }

    for (const item of selectedMeasurements) {
      const validationError = validateMeasurement(item);

      if (validationError) {
        setError(`${item.name}: ${validationError}`);
        return;
      }
    }

    const confirmed = window.confirm(
      `Save ${selectedMeasurements.length} selected measurements to your Stats?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setSaveMessage("");

    let savedCount = 0;
    const failedItems = [];

    try {
      // Save individually so a failure can be reported by measurement.
      for (const item of selectedMeasurements) {
        try {
          const payload = {
            valueNumeric:
              item.valueType === "NUMERIC"
                ? Number(item.valueNumeric)
                : null,

            valueText:
              item.valueType === "TEXT"
                ? item.valueText.trim()
                : null,

            unit: item.unit.trim(),

            measuredAt: item.measuredAt,

            referenceLow:
              item.valueType === "NUMERIC" &&
              item.referenceLow !== null &&
              item.referenceLow !== ""
                ? Number(item.referenceLow)
                : null,

            referenceHigh:
              item.valueType === "NUMERIC" &&
              item.referenceHigh !== null &&
              item.referenceHigh !== ""
                ? Number(item.referenceHigh)
                : null,

            referenceRange: item.referenceRange || null,
            labFlag: item.labFlag || null,

            source: "LAB_REPORT",
            sourceName: extraction.report.reportType || "Medical report",

            notes: `Imported from medical report. Page ${item.page}. AI extraction confidence: ${item.confidence}.`,
          };

          await saveBiomarkerResult(
            item.biomarkerId,
            payload
          );

          savedCount++;
        } catch (err) {
          failedItems.push(item.name);
        }
      }

      if (savedCount > 0) {
        setSaveMessage(
          `${savedCount} measurement(s) saved successfully.`
        );

        // Refresh parent Stats data.
        if (onSaved) {
          await onSaved();
        }
      }

      if (failedItems.length > 0) {
        setError(
          `Could not save: ${failedItems.join(", ")}. ` +
          "Your successfully saved measurements were retained."
        );
      } else {
        // Remove saved measurements from the review selection.
        setSelected((previous) => {
          const updated = { ...previous };

          measurements.forEach((item, index) => {
            if (
              selected[index] &&
              item.matched &&
              !failedItems.includes(item.name)
            ) {
              updated[index] = false;
            }
          });

          return updated;
        });
      }
    } catch (err) {
      setError(
        err.message || "Unable to save measurements."
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <section className="medical-import">
      <div className="medical-import__header">
        <div>
          <h2>Import Medical Report</h2>
          <p>
            Upload a laboratory report and let AI extract
            your measurements for review.
          </p>
        </div>

        {extraction && (
          <button
            type="button"
            className="medical-import__secondary-btn"
            onClick={resetImport}
          >
            Start over
          </button>
        )}
      </div>

      {!extraction && (
        <div className="medical-import__upload">
          <div className="medical-import__upload-icon">
            <span>PDF</span>
          </div>

          <h3>Upload your medical report</h3>

          <p>
            Select a PDF report. Maximum file size: 10 MB.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
          />

          {file && (
            <div className="medical-import__file">
              <div>
                <strong>{file.name}</strong>
                <span>
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>

              <button
                type="button"
                onClick={resetImport}
                aria-label="Remove selected PDF"
              >
                Remove
              </button>
            </div>
          )}

          <button
            type="button"
            className="medical-import__primary-btn"
            disabled={!file || loading}
            onClick={handleAnalyze}
          >
            {loading ? "Analyzing report..." : "Analyze report"}
          </button>

          {loading && (
            <p className="medical-import__processing">
              AI is reading your report. This may take a moment.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="medical-import__error" role="alert">
          {error}
        </div>
      )}

      {saveMessage && (
        <div className="medical-import__success" role="status">
          {saveMessage}
        </div>
      )}

      {extraction && (
        <div className="medical-import__review">
          <div className="medical-import__report-info">
            <div>
              <span>Report type</span>
              <strong>
                {extraction.report?.reportType || "Medical report"}
              </strong>
            </div>

            <div>
              <span>Report date</span>
              <strong>
                {extraction.report?.reportDate || "Not identified"}
              </strong>
            </div>

            <div>
              <span>Extracted measurements</span>
              <strong>{measurements.length}</strong>
            </div>
          </div>

          <div className="medical-import__review-heading">
            <div>
              <h3>Review measurements</h3>
              <p>
                Verify every value against the original PDF.
                Edit incorrect or incomplete fields before saving.
              </p>
            </div>

            <span className="medical-import__count">
              {selectedCount} selected
            </span>
          </div>

          {measurements.length === 0 && (
            <p className="medical-import__empty">
              No measurements were extracted from this report.
            </p>
          )}

          {measurements.map((item, index) => (
            <article
              className="medical-import__result"
              key={`${item.biomarkerKey || item.name}-${index}`}
            >
              <div className="medical-import__result-top">
                <label className="medical-import__checkbox">
                  <input
                    type="checkbox"
                    checked={Boolean(selected[index])}
                    disabled={!item.matched}
                    onChange={() => toggleSelection(index)}
                  />

                  <strong>{item.name}</strong>
                </label>

                <span
                  className={
                    item.matched
                      ? "medical-import__matched"
                      : "medical-import__unmatched"
                  }
                >
                  {item.matched ? "Matched" : "Unmatched"}
                </span>
              </div>

              <div className="medical-import__metadata">
                {item.biomarkerName && (
                  <span>{item.biomarkerName}</span>
                )}
                <span>Page {item.page}</span>
                <span>
                  Confidence: {item.confidence}
                </span>
              </div>

              <div className="medical-import__fields">
                <label>
                  Value

                  <input
                    type={
                      item.valueType === "NUMERIC"
                        ? "number"
                        : "text"
                    }
                    step="any"
                    value={
                      item.valueType === "NUMERIC"
                        ? item.valueNumeric ?? ""
                        : item.valueText ?? ""
                    }
                    onChange={(event) =>
                      updateMeasurement(
                        index,
                        item.valueType === "NUMERIC"
                          ? "valueNumeric"
                          : "valueText",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Unit

                  <input
                    type="text"
                    value={item.unit ?? ""}
                    onChange={(event) =>
                      updateMeasurement(
                        index,
                        "unit",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Measurement date

                  <input
                    type="date"
                    value={formatDate(item.measuredAt)}
                    onChange={(event) =>
                      updateMeasurement(
                        index,
                        "measuredAt",
                        event.target.value
                      )
                    }
                  />
                </label>

                {item.valueType === "NUMERIC" && (
                  <>
                    <label>
                      Reference low

                      <input
                        type="number"
                        step="any"
                        value={item.referenceLow ?? ""}
                        onChange={(event) =>
                          updateMeasurement(
                            index,
                            "referenceLow",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      Reference high

                      <input
                        type="number"
                        step="any"
                        value={item.referenceHigh ?? ""}
                        onChange={(event) =>
                          updateMeasurement(
                            index,
                            "referenceHigh",
                            event.target.value
                          )
                        }
                      />
                    </label>
                  </>
                )}

                <label>
                  Printed reference range

                  <input
                    type="text"
                    value={item.referenceRange ?? ""}
                    onChange={(event) =>
                      updateMeasurement(
                        index,
                        "referenceRange",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Lab flag

                  <input
                    type="text"
                    value={item.labFlag ?? ""}
                    onChange={(event) =>
                      updateMeasurement(
                        index,
                        "labFlag",
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>
            </article>
          ))}

          {extraction.unmatchedItems?.length > 0 && (
            <div className="medical-import__unmatched-section">
              <h3>Other extracted items</h3>

              <p>
                These could not be matched to your biomarker catalog.
                They won't be saved automatically.
              </p>

              {extraction.unmatchedItems.map((item, index) => (
                <div
                  className="medical-import__unmatched-item"
                  key={`${item.name}-${index}`}
                >
                  <strong>{item.name}</strong>
                  <span>
                    {item.value} {item.unit}
                  </span>
                  <span>Page {item.page}</span>
                </div>
              ))}
            </div>
          )}

          <div className="medical-import__actions">
            <button
              type="button"
              className="medical-import__secondary-btn"
              onClick={resetImport}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="medical-import__primary-btn"
              onClick={handleSave}
              disabled={
                saving ||
                selectedCount === 0
              }
            >
              {saving
                ? "Saving..."
                : `Save ${selectedCount} selected`}
            </button>
          </div>
        </div>
      )}

      <p className="medical-import__privacy">
        Your PDF is sent to Gemini for analysis. Ascend does not
        store the uploaded PDF. Extracted results are saved only
        after you review and confirm them.
      </p>
    </section>
  );
}
