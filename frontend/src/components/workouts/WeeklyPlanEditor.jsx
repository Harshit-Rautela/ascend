
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  X,
  Search,
  ChevronDown,
  Check,
} from "lucide-react";

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


function ExerciseDropdown({
  exercises,
  selectedExercise,
  onSelect,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const availableExercises = [
    ...exercises,
    ...(selectedExercise &&
      !exercises.some(
        (exercise) => exercise.id === selectedExercise.id
      )
      ? [selectedExercise]
      : []),
  ];

  const filteredResults = availableExercises.filter((exercise) => {
    const query = search.trim().toLowerCase();

    return (
      exercise.name?.toLowerCase().includes(query) ||
      exercise.primaryMuscle?.toLowerCase().includes(query) ||
      exercise.equipment?.toLowerCase().includes(query)
    );
  });

  function handleSelect(exercise) {
    onSelect(exercise.id);
    setIsOpen(false);
    setSearch("");
  }

  return (
    <div className="exercise-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className={`exercise-dropdown-trigger ${isOpen ? "is-open" : ""
          }`}
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span
          className={
            selectedExercise
              ? "exercise-dropdown-value"
              : "exercise-dropdown-placeholder"
          }
        >
          {selectedExercise?.name || "Choose an exercise"}
        </span>

        <ChevronDown
          size={18}
          className="exercise-dropdown-chevron"
        />
      </button>

      {isOpen && (
        <div className="exercise-dropdown-menu">
          <div className="exercise-dropdown-search">
            <Search size={16} />

            <input
              type="text"
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search exercises..."
              aria-label="Search exercises"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div
            className="exercise-dropdown-results"
            role="listbox"
            aria-label="Available exercises"
          >
            {filteredResults.length > 0 ? (
              filteredResults.map((exercise) => {
                const isSelected =
                  selectedExercise?.id === exercise.id;

                return (
                  <button
                    type="button"
                    key={exercise.id}
                    className={`exercise-dropdown-option ${isSelected ? "selected" : ""
                      }`}
                    onClick={() => handleSelect(exercise)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="exercise-dropdown-option-info">
                      <strong>{exercise.name}</strong>

                      <div className="exercise-dropdown-option-meta">
                        {exercise.primaryMuscle && (
                          <span className="exercise-muscle-tag">
                            {exercise.primaryMuscle}
                          </span>
                        )}

                        {exercise.equipment && (
                          <span className="exercise-equipment">
                            {exercise.equipment}
                          </span>
                        )}

                        {!exercise.primaryMuscle && !exercise.equipment && (
                          <span className="exercise-equipment">Exercise</span>
                        )}
                      </div>
                    </span>

                    {isSelected && (
                      <Check
                        size={17}
                        className="exercise-dropdown-check"
                      />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="exercise-dropdown-empty">
                <Search size={20} />
                <span>No exercises found</span>
                <small>Try another search term</small>
              </div>
            )}
          </div>

          <div className="exercise-dropdown-footer">
            {filteredResults.length}{" "}
            {filteredResults.length === 1
              ? "exercise"
              : "exercises"}{" "}
            available
          </div>
        </div>
      )}
    </div>
  );
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
  const [targetMuscles, setTargetMuscles] = useState(
    day?.targetMuscles ?? []
  );
  const [exercises, setExercises] = useState(
    day?.exercises?.map(toFormExercise) ?? []
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const availableMuscles = [
    ...new Set(
      exerciseLibrary
        .map((exercise) => exercise.primaryMuscle?.trim())
        .filter(Boolean)
        .map((muscle) => muscle.toUpperCase())
    ),
  ].sort();

  const filteredExercises = exerciseLibrary.filter((exercise) =>
    targetMuscles.includes(exercise.primaryMuscle?.trim().toUpperCase())
  );

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
      setTargetMuscles([]);
    }
  }

  function toggleTargetMuscle(muscle) {
    setTargetMuscles((current) =>
      current.includes(muscle)
        ? current.filter((item) => item !== muscle)
        : [...current, muscle]
    );
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
            throw new Error(`${field.label} must be a valid non-negative ${field.step === "1" ? "integer" : "number"
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
            targetMuscles: isRestDay ? [] : targetMuscles,
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
                <div className="plan-editor-muscles">
                  <div className="plan-editor-muscles-heading">
                    <h3>Target muscles</h3>
                    <span>Select the muscles you want to train</span>
                  </div>

                  <div className="plan-editor-muscle-options">
                    {availableMuscles.map((muscle) => (
                      <label
                        key={muscle}
                        className={`plan-editor-muscle-option ${targetMuscles.includes(muscle) ? "selected" : ""
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={targetMuscles.includes(muscle)}
                          onChange={() => toggleTargetMuscle(muscle)}
                        />
                        {muscle}
                      </label>
                    ))}
                  </div>

                  {targetMuscles.length === 0 && (
                    <p className="workouts-muted-label">
                      Select at least one target muscle to choose exercises.
                    </p>
                  )}
                </div>
                <div className="plan-editor-exercises-heading">
                  <h3>Exercises</h3>
                  <button
                    type="button"
                    className="workouts-add-button"
                    onClick={addExercise}
                    disabled={targetMuscles.length === 0}
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
                        <div className="plan-editor-exercise-title">
                          <span className="plan-editor-exercise-number">
                            {String(index + 1).padStart(2, "0")}
                          </span>

                          <div className="plan-editor-exercise-title-text">
                            <strong>Exercise {index + 1}</strong>
                            <span>
                              {selectedExercise?.name || "Choose an exercise"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="workouts-icon-button plan-editor-remove-button"
                          onClick={() => removeExercise(index)}
                          aria-label={`Remove exercise ${index + 1}`}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>

                      <div className="plan-editor-exercise-body">

                        <div className="plan-editor-field plan-editor-exercise-select">
                          <label>Exercise</label>

                          <ExerciseDropdown
                            exercises={filteredExercises}
                            selectedExercise={selectedExercise}
                            onSelect={(exerciseId) =>
                              updateExercise(index, "exerciseId", exerciseId)
                            }
                          />
                        </div>


                        {selectedExercise && (
                          <div className="plan-editor-target-section">
                            <span className="plan-editor-section-label">
                              TRAINING TARGETS
                            </span>

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
                          </div>
                        )}

                        <label className="plan-editor-field plan-editor-notes-field">
                          Exercise notes

                          <input
                            value={item.notes}
                            maxLength={500}
                            onChange={(event) =>
                              updateExercise(index, "notes", event.target.value)
                            }
                            placeholder="Add instructions or reminders..."
                          />
                        </label>
                      </div>
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
