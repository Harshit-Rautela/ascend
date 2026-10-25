
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  RefreshCw,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/workouts";

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function shiftDate(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  return getLocalDateString(date);
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatSet(set, measurementType) {
  const parts = [];

  if (measurementType === "WEIGHT_REPS") {
    if (set.weightKg != null) parts.push(`${set.weightKg} kg`);
    if (set.reps != null) parts.push(`${set.reps} reps`);
  } else if (measurementType === "BODYWEIGHT_REPS") {
    if (set.reps != null) parts.push(`${set.reps} reps`);
  } else if (measurementType === "DURATION") {
    if (set.durationSeconds != null) {
      parts.push(`${set.durationSeconds} sec`);
    }
  } else if (measurementType === "DISTANCE") {
    if (set.distanceMeters != null) {
      parts.push(`${set.distanceMeters} m`);
    }
  }

  return parts.length ? parts.join(" × ") : "No measurements recorded";
}

function WorkoutLog() {
  const [selectedDate, setSelectedDate] = useState(getLocalDateString);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchWorkout = useCallback(
    async (isRefresh = false) => {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await fetch(
          `${API_URL}?date=${encodeURIComponent(selectedDate)}`
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load workout.");
        }

        setSession(result.session ?? null);
      } catch (err) {
        setSession(null);
        setError(err.message || "Unable to load workout.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate]
  );

  useEffect(() => {
    fetchWorkout();
  }, [fetchWorkout]);

  const completedSets =
    session?.exercises?.reduce(
      (total, exercise) =>
        total +
        (exercise.sets || []).filter((set) => set.isCompleted).length,
      0
    ) ?? 0;

  const totalSets =
    session?.exercises?.reduce(
      (total, exercise) => total + (exercise.sets || []).length,
      0
    ) ?? 0;

  function changeDate(days) {
    setSelectedDate((current) => shiftDate(current, days));
  }

  return (
    <section className="workout-log">
      <header className="workout-log-header">
        <div>
          <h2>Workout Log</h2>
          <p>Review your actual performance for any date.</p>
        </div>

        <button
          type="button"
          className="workout-log-refresh"
          onClick={() => fetchWorkout(true)}
          disabled={loading || refreshing}
        >
          <RefreshCw size={16} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <div className="workout-log-date-picker">
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => changeDate(-1)}
          disabled={loading || refreshing}
        >
          <ChevronLeft size={20} />
        </button>

        <label>
          <CalendarDays size={18} />
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            aria-label="Select workout date"
          />
        </label>

        <button
          type="button"
          aria-label="Next day"
          onClick={() => changeDate(1)}
          disabled={
            loading ||
            refreshing ||
            selectedDate >= getLocalDateString()
          }
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <p className="workout-log-selected-date">
        {formatDate(selectedDate)}
      </p>

      {loading ? (
        <div className="workout-log-state" role="status">
          Loading workout...
        </div>
      ) : error ? (
        <div className="workout-log-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => fetchWorkout()}>
            Try again
          </button>
        </div>
      ) : !session ? (
        <div className="workout-log-empty">
          <CalendarDays size={30} />
          <h3>No workout recorded</h3>
          <p>
            There is no saved workout for this date. Choose another date
            to review your training history.
          </p>
        </div>
      ) : (
        <>
          <div className="workout-log-summary">
            <div className="workout-log-stat">
              <CalendarDays size={20} />
              <div>
                <strong>{session.exercises.length}</strong>
                <span>Exercises</span>
              </div>
            </div>

            <div className="workout-log-stat">
              <Dumbbell size={20} />
              <div>
                <strong>
                  {completedSets}/{totalSets}
                </strong>
                <span>Sets completed</span>
              </div>
            </div>
          </div>

          <article className="workout-log-session">
            <header className="workout-log-session-header">
              <div>
                <h3>{formatDate(selectedDate)}</h3>
                <p>
                  {session.exercises.length}{" "}
                  {session.exercises.length === 1 ? "exercise" : "exercises"}
                  {" · "}
                  {completedSets}/{totalSets} sets completed
                </p>
              </div>

              <span
                className={`workout-log-status ${
                  session.status === "COMPLETED"
                    ? "is-completed"
                    : "is-in-progress"
                }`}
              >
                {session.status === "COMPLETED"
                  ? "Completed"
                  : "In progress"}
              </span>
            </header>

            {session.exercises.map((exercise) => (
              <div className="workout-log-exercise" key={exercise.id}>
                <div className="workout-log-exercise-title">
                  <Dumbbell size={17} />
                  <strong>
                    {exercise.exercise?.name || "Unknown exercise"}
                  </strong>
                </div>

                {exercise.sets.length === 0 ? (
                  <p className="workout-log-muted">No sets recorded.</p>
                ) : (
                  <div className="workout-log-sets">
                    {exercise.sets.map((set) => (
                      <div className="workout-log-set" key={set.id}>
                        <span>Set {set.setNumber}</span>

                        <span className="workout-log-set-value">
                          {formatSet(
                            set,
                            exercise.exercise?.measurementType
                          )}
                        </span>

                        <span
                          className={`workout-log-set-status ${
                            set.isCompleted ? "is-done" : "is-pending"
                          }`}
                        >
                          {set.isCompleted
                            ? "Completed"
                            : "Not completed"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </article>
        </>
      )}
    </section>
  );
}

export default WorkoutLog;
