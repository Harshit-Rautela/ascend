
import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

const EXERCISE_API = "http://localhost:5000/api/exercise";
const PLAN_API = "http://localhost:5000/api/training-plans";

const EMPTY_EXERCISE = {
  exerciseId: "",
  targetSets: "",
  targetReps: "",
  targetWeightKg: "",
  targetDurationSeconds: "",
  targetDistanceMeters: "",
  notes: "",
};

const FIELDS = [
  { key: "targetSets", label: "Sets", type: "number", step: "1" },
  { key: "targetReps", label: "Reps", type: "number", step: "1" },
  {
    key: "targetWeightKg",
    label: "Weight (kg)",
    type: "number",
    step: "0.5",
  },
  {
    key: "targetDurationSeconds",
    label: "Duration (sec)",
    type: "number",
    step: "1",
  },
  {
    key: "targetDistanceMeters",
    label: "Distance (m)",
    type: "number",
    step: "0.1",
  },
];

function toFormExercise(item) {
  return {
    exerciseId: item.exerciseId ?? item.exercise?.id ?? "",
    targetSets: item.targetSets ?? "",
    targetReps: item.targetReps ?? "",
    targetWeightKg: item.targetWeightKg ?? "",
    targetDurationSeconds: item.targetDurationSeconds ?? "",
    targetDistanceMeters: item.targetDistanceMeters ?? "",
    notes: item.notes ?? "",
  };
}

function toNumberOrNull(value) {
  if (value === "" || value == null) return null;
  return Number(value);
}

export default function WeeklyPlanEditor({
  day,
  dayName,
  onClose,
  onSaved,
}) {
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [isRestDay, setIsRestDay] = useState(day?.isRestDay ?? false);
  const [dayNotes, setDayNotes] = useState(day?.notes ?? "");
  const [exercises, setExercises] = useState(
    day?.exercises?.map(toFormExercise) ?? []
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadExercises() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(EXERCISE_API);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Could not load exercises.");
        }

        const list = Array.isArray(result)
          ? result
          : result.exercises ?? [];

        if (!cancelled) setExerciseLibrary(list);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load the exercise library.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadExercises();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateExercise(index, field, value) {
    setExercises((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  function addExercise() {
    setExercises((current) => [...current, { ...EMPTY_EXERCISE }]);
    setIsRestDay(false);
  }

  function removeExercise(index) {
    setExercises((current) => current.filter((_, i) => i !== index));
  }

  function changeRestDay(checked) {
    setIsRestDay(checked);

    if (checked) {
      setExercises([]);
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    setError("");

    if (dayNotes.length > 500) {
      setError("Day notes must not exceed 500 characters.");
      return;
    }

    if (exercises.some((item) => !item.exerciseId)) {
      setError("Choose an exercise for every row or remove the empty row.");
      return;
    }

    const ids = exercises.map((item) => item.exerciseId);

    if (new Set(ids).size !== ids.length) {
      setError("An exercise can only appear once per day.");
      return;
    }

    const payloadExercises = exercises.map((item) => {
      const exercise = exerciseLibrary.find(
        (entry) => entry.id === item.exerciseId
      );

      const payload = {
        exerciseId: item.exerciseId,
        notes: item.notes.trim() || null,
      };

      for (const field of FIELDS) {
        const value = item[field.key];

        if (value !== "" && value != null) {
          const number = Number(value);

          if (
            !Number.isFinite(number) ||
            number < 0 ||
            (field.step === "1" && !Number.isInteger(number))
          ) {
            throw new Error(`${field.label} must be a valid non-negative ${
              field.step === "1" ? "integer" : "number"
            }.`);
          }

          payload[field.key] = number;
        } else {
          payload[field.key] = null;
        }
      }

      // Avoid sending targets that don't match the exercise's measurement type.
      if (exercise?.measurementType === "DURATION") {
        payload.targetSets = null;
        payload.targetReps = null;
        payload.targetWeightKg = null;
        payload.targetDistanceMeters = null;
      } else if (exercise?.measurementType === "DISTANCE") {
        payload.targetSets = null;
        payload.targetReps = null;
        payload.targetWeightKg = null;
        payload.targetDurationSeconds = null;
      } else if (exercise?.measurementType === "CARDIO") {
        payload.targetSets = null;
        payload.targetReps = null;
        payload.targetWeightKg = null;
      } else if (exercise?.measurementType === "BODYWEIGHT_REPS") {
        payload.targetWeightKg = null;
        payload.targetDurationSeconds = null;
        payload.targetDistanceMeters = null;
      } else if (exercise?.measurementType === "WEIGHT_REPS") {
        payload.targetDurationSeconds = null;
        payload.targetDistanceMeters = null;
      }

      return payload;
    });

    try {
      setSaving(true);

      const response = await fetch(
        `${PLAN_API}/days/${day.dayOfWeek}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isRestDay,
            notes: dayNotes.trim() || null,
            exercises: isRestDay ? [] : payloadExercises,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save this workout day.");
      }

      onSaved(result.day);
    } catch (err) {
      setError(err.message || "Could not save this workout day.");
    } finally {
      setSaving(false);
    }
  }

  if (!day) return null;

  return (
    <div className="plan-editor-backdrop">
      <section
        className="plan-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-editor-title"
      >
        <header className="plan-editor-header">
          <div>
            <span className="workouts-muted-label">WEEKLY PLAN</span>
            <h2 id="plan-editor-title">Edit {dayName}</h2>
          </div>

          <button
            type="button"
            className="workouts-icon-button"
            onClick={onClose}
            aria-label="Close editor"
            disabled={saving}
          >
            <X size={19} />
          </button>
        </header>

        {error && (
          <div className="workouts-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <p>Loading exercise library...</p>
        ) : (
          <form onSubmit={handleSave}>
            <label className="plan-editor-rest-toggle">
              <input
                type="checkbox"
                checked={isRestDay}
                onChange={(event) => changeRestDay(event.target.checked)}
              />
              Make this a rest day
            </label>

            <label className="plan-editor-field">
              Day notes
              <textarea
                value={dayNotes}
                maxLength={500}
                onChange={(event) => setDayNotes(event.target.value)}
                placeholder="Optional notes for this day"
                disabled={isRestDay}
              />
            </label>

            {!isRestDay && (
              <>
                <div className="plan-editor-exercises-heading">
                  <h3>Exercises</h3>
                  <button
                    type="button"
                    className="workouts-add-button"
                    onClick={addExercise}
                  >
                    <Plus size={16} /> Add exercise
                  </button>
                </div>

                {exercises.map((item, index) => {
                  const selectedExercise = exerciseLibrary.find(
                    (exercise) => exercise.id === item.exerciseId
                  );

                  const measurementType = selectedExercise?.measurementType;

                  const visibleFields =
                    measurementType === "DURATION"
                      ? ["targetDurationSeconds"]
                      : measurementType === "DISTANCE"
                        ? ["targetDistanceMeters"]
                        : measurementType === "CARDIO"
                          ? [
                              "targetDurationSeconds",
                              "targetDistanceMeters",
                            ]
                          : measurementType === "BODYWEIGHT_REPS"
                            ? ["targetSets", "targetReps"]
                            : [
                                "targetSets",
                                "targetReps",
                                "targetWeightKg",
                              ];

                  return (
                    <article className="plan-editor-exercise" key={index}>
                      <div className="plan-editor-exercise-heading">
                        <strong>Exercise {index + 1}</strong>
                        <button
                          type="button"
                          className="workouts-icon-button"
                          onClick={() => removeExercise(index)}
                          aria-label={`Remove exercise ${index + 1}`}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>

                      <label className="plan-editor-field">
                        Exercise
                        <select
                          value={item.exerciseId}
                          onChange={(event) =>
                            updateExercise(
                              index,
                              "exerciseId",
                              event.target.value
                            )
                          }
                          required
                        >
                          <option value="">Choose an exercise</option>
                          {exerciseLibrary.map((exercise) => (
                            <option
                              key={exercise.id}
                              value={exercise.id}
                            >
                              {exercise.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      {selectedExercise && (
                        <div className="plan-editor-targets">
                          {FIELDS.filter((field) =>
                            visibleFields.includes(field.key)
                          ).map((field) => (
                            <label
                              className="plan-editor-field"
                              key={field.key}
                            >
                              {field.label}
                              <input
                                type="number"
                                min="0"
                                step={field.step}
                                value={item[field.key]}
                                onChange={(event) =>
                                  updateExercise(
                                    index,
                                    field.key,
                                    event.target.value
                                  )
                                }
                              />
                            </label>
                          ))}
                        </div>
                      )}

                      <label className="plan-editor-field">
                        Exercise notes
                        <input
                          value={item.notes}
                          maxLength={500}
                          onChange={(event) =>
                            updateExercise(index, "notes", event.target.value)
                          }
                          placeholder="Optional"
                        />
                      </label>
                    </article>
                  );
                })}
              </>
            )}

            <footer className="plan-editor-footer">
              <button
                type="button"
                className="workouts-icon-button"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="workout-primary-button"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
