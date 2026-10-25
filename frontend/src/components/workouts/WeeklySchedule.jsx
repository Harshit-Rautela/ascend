
import { useEffect, useMemo, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Dumbbell,
    Plus,
    RotateCcw,
    CalendarDays,
    Minus,
    Check,
    LoaderCircle,
} from "lucide-react";
import "./workouts.css";
import WeeklyPlanEditor from "./WeeklyPlanEditor";

const API_URL = "http://localhost:5000/api/training-plans";
const WORKOUTS_API_URL = "http://localhost:5000/api/workouts";

const DAYS = [
    { name: "Monday", value: 1 },
    { name: "Tuesday", value: 2 },
    { name: "Wednesday", value: 3 },
    { name: "Thursday", value: 4 },
    { name: "Friday", value: 5 },
    { name: "Saturday", value: 6 },
    { name: "Sunday", value: 0 },
];

const SUPPORTED_MEASUREMENT_TYPES = new Set([
    "WEIGHT_REPS",
    "BODYWEIGHT_REPS",
]);

function getCurrentDay() {
    return new Date().getDay();
}

// Returns a local calendar date as YYYY-MM-DD.
// This intentionally avoids toISOString(), which converts to UTC.
function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Returns the date for a weekday in the current Monday-Sunday week.
function getDateForDay(dayOfWeek) {
    const today = new Date();
    const currentDay = today.getDay();

    // Monday = 0, Tuesday = 1, ..., Sunday = 6.
    const offsetFromMonday = (currentDay + 6) % 7;
    const monday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - offsetFromMonday
    );

    const targetOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    monday.setDate(monday.getDate() + targetOffset);

    return formatLocalDate(monday);
}

function getPlannedSets(item) {
    const value = item.targetSets ?? item.sets;

    if (value == null || !Number.isFinite(Number(value))) {
        return 0;
    }

    return Math.max(0, Math.floor(Number(value)));
}

function isSetTracked(item) {
    const exercise = item.exercise ?? item;

    return SUPPORTED_MEASUREMENT_TYPES.has(
        exercise.measurementType
    );
}

function getExerciseId(item) {
    const exercise = item.exercise ?? item;

    return item.exerciseId ?? exercise.id;
}

function getCompletedSetsFromSession(session) {
    const counts = {};

    for (const workoutExercise of session?.exercises ?? []) {
        const exerciseId =
            workoutExercise.exerciseId ?? workoutExercise.exercise?.id;

        if (!exerciseId) continue;

        counts[exerciseId] = (workoutExercise.sets ?? []).filter(
            (set) => set.isCompleted
        ).length;
    }

    return counts;
}

function getCompletionStatus(completedSets, plannedSets) {
    if (plannedSets <= 0) {
        return {
            percentage: 0,
            isComplete: false,
        };
    }

    const percentage = (completedSets / plannedSets) * 100;

    return {
        percentage,
        isComplete: percentage > 50,
    };
}

async function readJsonResponse(response, fallbackMessage) {
    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error(fallbackMessage);
    }

    if (!response.ok) {
        throw new Error(
            result.error || result.message || fallbackMessage
        );
    }

    return result;
}

function WeeklySchedule() {
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedDay, setSelectedDay] = useState(getCurrentDay());
    const [editingDay, setEditingDay] = useState(false);
    const [creatingPlan, setCreatingPlan] = useState(false);
    const [actionError, setActionError] = useState("");

    // Actual performance, keyed by exercise ID.
    const [completedCounts, setCompletedCounts] = useState({});
    const [loadedDate, setLoadedDate] = useState(null);
    const [performanceLoading, setPerformanceLoading] = useState(false);
    const [performanceError, setPerformanceError] = useState("");
    const [savingPerformance, setSavingPerformance] = useState(false);
    const [lastSavedDate, setLastSavedDate] = useState(null);

    const selectedDate = useMemo(
        () => getDateForDay(selectedDay),
        [selectedDay]
    );

    const selectedDayName =
        DAYS.find((day) => day.value === selectedDay)?.name ?? "Workout";

    const selectedDayData = plan?.days?.find(
        (day) => day.dayOfWeek === selectedDay
    );

    // Load the active weekly plan.
    useEffect(() => {
        let cancelled = false;

        async function fetchPlan() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(API_URL);

                if (response.status === 404) {
                    if (!cancelled) setPlan(null);
                    return;
                }

                const result = await readJsonResponse(
                    response,
                    "Could not load your training plan."
                );

                if (!cancelled) {
                    setPlan(result.plan ?? result);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.message ||
                        "Unable to connect to the training plan service."
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchPlan();

        return () => {
            cancelled = true;
        };
    }, []);

    // Load saved performance for the currently selected date.
    useEffect(() => {
        let cancelled = false;

        async function fetchWorkoutPerformance() {
            setPerformanceLoading(true);
            setPerformanceError("");
            setLoadedDate(null);
            setLastSavedDate(null);
            setCompletedCounts({});

            try {
                const response = await fetch(
                    `${WORKOUTS_API_URL}?date=${encodeURIComponent(selectedDate)}`
                );

                const result = await readJsonResponse(
                    response,
                    "Could not load workout performance."
                );

                if (cancelled) return;

                const session = result.session ?? result.workout ?? null;

                setCompletedCounts(getCompletedSetsFromSession(session));
                setLoadedDate(selectedDate);
            } catch (err) {
                if (cancelled) return;

                setPerformanceError(
                    err.message || "Could not load saved workout performance."
                );

                // Do not enable saving if loading failed. Otherwise, the
                // default zero counts could overwrite existing saved data.
            } finally {
                if (!cancelled) setPerformanceLoading(false);
            }
        }

        fetchWorkoutPerformance();

        return () => {
            cancelled = true;
        };
    }, [selectedDate]);

    // Persist performance after the user pauses clicking.
    // Never save while a different date is still loading.
    useEffect(() => {
        if (!selectedDayData || selectedDayData.isRestDay) return;
        if (loadedDate !== selectedDate) return;
        if (performanceLoading || performanceError) return;

        const exercises = (selectedDayData.exercises ?? [])
            .filter(isSetTracked)
            .map((item) => ({
                exerciseId: getExerciseId(item),
                completedSets: Math.min(
                    getPlannedSets(item),
                    Math.max(
                        0,
                        Number(completedCounts[getExerciseId(item)] ?? 0)
                    )
                ),
            }))
            .filter(
                (item) => item.exerciseId && Number.isFinite(item.completedSets)
            );

        if (exercises.length === 0) return;

        let cancelled = false;

        const timeoutId = setTimeout(async () => {
            try {
                setSavingPerformance(true);
                setPerformanceError("");

                const response = await fetch(
                    `${WORKOUTS_API_URL}?date=${encodeURIComponent(selectedDate)}`,
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ exercises }),
                    }
                );

                await readJsonResponse(
                    response,
                    "Could not save workout performance."
                );

                if (!cancelled) {
                    setLastSavedDate(selectedDate);
                }
            } catch (err) {
                if (!cancelled) {
                    setPerformanceError(
                        err.message || "Could not save workout performance."
                    );
                }
            } finally {
                if (!cancelled) {
                    setSavingPerformance(false);
                }
            }
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [
        completedCounts,
        loadedDate,
        selectedDate,
        selectedDayData,
        performanceLoading,
        performanceError,
    ]);

    function moveDay(direction) {
        setSelectedDay((current) => (current + direction + 7) % 7);
    }

    async function handleCreatePlan() {
        try {
            setCreatingPlan(true);
            setActionError("");

            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: "My Weekly Plan" }),
            });

            const result = await readJsonResponse(
                response,
                "Could not create your plan."
            );

            setPlan(result.plan ?? result);
        } catch (err) {
            setActionError(err.message);
        } finally {
            setCreatingPlan(false);
        }
    }

    function handleDaySaved(savedDay) {
        setPlan((current) => {
            if (!current) return current;

            return {
                ...current,
                days: [
                    ...(current.days ?? []).filter(
                        (day) => day.dayOfWeek !== savedDay.dayOfWeek
                    ),
                    savedDay,
                ].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
            };
        });

        setEditingDay(false);
    }

    function changeCompletedSets(exerciseId, plannedSets, delta) {
        if (!exerciseId || plannedSets <= 0) return;

        setCompletedCounts((current) => {
            const currentCount = Number(current[exerciseId] ?? 0);
            const nextCount = Math.max(
                0,
                Math.min(plannedSets, currentCount + delta)
            );

            if (nextCount === currentCount) return current;

            return {
                ...current,
                [exerciseId]: nextCount,
            };
        });

        setPerformanceError("");
        setLastSavedDate(null);
    }

    if (loading) {
        return (
            <section className="workouts-page">
                <div className="workouts-loading">
                    <Dumbbell size={26} />
                    <p>Loading your training plan...</p>
                </div>
            </section>
        );
    }

    return (
        <section className="workouts-page">
            <div className="workouts-heading">
                <div>
                    <div className="workouts-eyebrow">
                        <CalendarDays size={15} />
                        YOUR TRAINING
                    </div>

                    <h1>
                        Weekly <span>schedule.</span>
                    </h1>

                    <p>Plan your sessions. Build consistency. Get stronger.</p>
                </div>

                <button
                    className="workout-primary-button"
                    onClick={handleCreatePlan}
                    disabled={creatingPlan}
                >
                    <Plus size={18} />
                    {creatingPlan ? "Creating..." : "Create plan"}
                </button>
            </div>

            {error && (
                <div className="workouts-error" role="alert">
                    <strong>Couldn't load your training plan.</strong>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>
                        Try again
                    </button>
                </div>
            )}

            {!error && !plan && (
                <div className="workouts-empty">
                    <div className="workouts-empty-icon">
                        <Dumbbell size={28} />
                    </div>

                    <h2>Your training journey starts here.</h2>

                    <p>
                        Create a weekly plan to organize your workouts, choose
                        exercises, and schedule recovery days.
                    </p>

                    <button
                        className="workout-primary-button"
                        onClick={handleCreatePlan}
                        disabled={creatingPlan}
                    >
                        <Plus size={18} />
                        {creatingPlan ? "Creating..." : "Create your first plan"}
                    </button>
                </div>
            )}

            {plan && (
                <>
                    <div className="workouts-plan-summary">
                        <div>
                            <span className="workouts-muted-label">ACTIVE PLAN</span>
                            <h2>{plan.name || "My training plan"}</h2>
                        </div>

                        <span className="workouts-active-badge">Active</span>
                    </div>

                    <div className="workouts-day-strip">
                        {DAYS.map((day) => {
                            const dayData = plan.days?.find(
                                (item) => item.dayOfWeek === day.value
                            );

                            const isSelected = selectedDay === day.value;
                            const hasExercises = (dayData?.exercises?.length ?? 0) > 0;

                            return (
                                <button
                                    key={day.value}
                                    className={`workouts-day-button ${isSelected ? "selected" : ""
                                        }`}
                                    onClick={() => setSelectedDay(day.value)}
                                    aria-pressed={isSelected}
                                >
                                    <span className="workouts-day-short">
                                        {day.name.slice(0, 3)}
                                    </span>

                                    <span className="workouts-day-status">
                                        {dayData?.isRestDay
                                            ? "Rest"
                                            : hasExercises
                                                ? `${dayData.exercises.length} ${dayData.exercises.length === 1
                                                    ? "exercise"
                                                    : "exercises"
                                                }`
                                                : "Not planned"}
                                    </span>

                                    <span
                                        className={`workouts-day-indicator ${dayData?.isRestDay
                                                ? "rest"
                                                : hasExercises
                                                    ? "planned"
                                                    : ""
                                            }`}
                                    />
                                </button>
                            );
                        })}
                    </div>

                    <article className="workouts-day-panel">
                        <div className="workouts-day-panel-heading">
                            <div>
                                <span className="workouts-muted-label">DAILY PLAN</span>
                                <h2>{selectedDayName}</h2>
                                <p className="workouts-selected-date">{selectedDate}</p>
                            </div>

                            <div className="workouts-day-controls">
                                <button
                                    className="workouts-icon-button"
                                    onClick={() => moveDay(-1)}
                                    aria-label="Previous day"
                                >
                                    <ChevronLeft size={19} />
                                </button>

                                <button
                                    className="workouts-icon-button"
                                    onClick={() => moveDay(1)}
                                    aria-label="Next day"
                                >
                                    <ChevronRight size={19} />
                                </button>
                            </div>
                        </div>

                        {performanceLoading && (
                            <div className="workouts-performance-status">
                                <LoaderCircle size={16} />
                                Loading saved performance...
                            </div>
                        )}

                        {!performanceLoading && savingPerformance && (
                            <div className="workouts-performance-status">
                                <LoaderCircle size={16} />
                                Saving progress...
                            </div>
                        )}

                        {!performanceLoading &&
                            !savingPerformance &&
                            lastSavedDate === selectedDate &&
                            !performanceError && (
                                <div className="workouts-performance-status">
                                    <Check size={16} />
                                    Progress saved
                                </div>
                            )}

                        {performanceError && (
                            <div className="workouts-error" role="alert">
                                <p>{performanceError}</p>
                                <button
                                    onClick={() => {
                                        setLoadedDate(null);
                                        setPerformanceError("");
                                    }}
                                >
                                    Reload performance
                                </button>
                            </div>
                        )}

                        {selectedDayData?.isRestDay ? (
                            <div className="workouts-rest-state">
                                <RotateCcw size={25} />
                                <h3>Recovery day</h3>
                                <p>Rest, recover, and get ready for your next session.</p>
                            </div>
                        ) : selectedDayData?.exercises?.length > 0 ? (
                            <div className="workouts-exercise-list">
                                {selectedDayData.exercises.map((item, index) => {
                                    const exercise = item.exercise ?? item;
                                    const exerciseId = getExerciseId(item);
                                    const plannedSets = getPlannedSets(item);
                                    const supportsSetTracking = isSetTracked(item);
                                    const completedSets = Number(
                                        completedCounts[exerciseId] ?? 0
                                    );

                                    const { percentage, isComplete } = getCompletionStatus(
                                        completedSets,
                                        plannedSets
                                    );

                                    return (
                                        <div
                                            className="workouts-exercise-row"
                                            key={item.id ?? exercise.id ?? index}
                                        >
                                            <div className="workouts-exercise-number">
                                                {String(index + 1).padStart(2, "0")}
                                            </div>

                                            <div className="workouts-exercise-info">
                                                <h3>{exercise.name || "Exercise"}</h3>

                                                <p>
                                                    {item.targetSets ?? item.sets ?? "—"} sets
                                                    <span> · </span>
                                                    {item.targetReps ?? item.reps ?? "—"} reps

                                                    {(item.targetWeightKg ?? item.weightKg) != null && (
                                                        <>
                                                            <span> · </span>
                                                            {item.targetWeightKg ?? item.weightKg} kg
                                                        </>
                                                    )}

                                                    {item.targetDurationSeconds != null && (
                                                        <>
                                                            <span> · </span>
                                                            {item.targetDurationSeconds} sec
                                                        </>
                                                    )}

                                                    {item.targetDistanceMeters != null && (
                                                        <>
                                                            <span> · </span>
                                                            {item.targetDistanceMeters} m
                                                        </>
                                                    )}
                                                </p>

                                                {supportsSetTracking ? (
                                                    <div className="workouts-set-tracker">
                                                        <div className="workouts-set-tracker-top">
                                                            <span>
                                                                Sets completed:{" "}
                                                                <strong>
                                                                    {completedSets}/{plannedSets}
                                                                </strong>
                                                            </span>

                                                            <span
                                                                className={`workouts-completion-badge ${isComplete ? "completed" : "incomplete"
                                                                    }`}
                                                            >
                                                                {isComplete ? "Completed" : "In progress"}
                                                            </span>
                                                        </div>

                                                        <div
                                                            className="workouts-progress-track"
                                                            role="progressbar"
                                                            aria-label={`${exercise.name} sets completed`}
                                                            aria-valuemin={0}
                                                            aria-valuemax={plannedSets}
                                                            aria-valuenow={completedSets}
                                                        >
                                                            <div
                                                                className="workouts-progress-fill"
                                                                style={{
                                                                    width: `${Math.min(100, percentage)}%`,
                                                                }}
                                                            />
                                                        </div>

                                                        <div className="workouts-set-controls">
                                                            <button
                                                                type="button"
                                                                className="workouts-set-button"
                                                                onClick={() =>
                                                                    changeCompletedSets(
                                                                        exerciseId,
                                                                        plannedSets,
                                                                        -1
                                                                    )
                                                                }
                                                                disabled={
                                                                    performanceLoading ||
                                                                    loadedDate !== selectedDate ||
                                                                    completedSets <= 0
                                                                }
                                                                aria-label={`Decrease completed sets for ${exercise.name}`}
                                                            >
                                                                <Minus size={16} />
                                                            </button>

                                                            <span className="workouts-set-count">
                                                                {completedSets} of {plannedSets}
                                                            </span>

                                                            <button
                                                                type="button"
                                                                className="workouts-set-button"
                                                                onClick={() =>
                                                                    changeCompletedSets(
                                                                        exerciseId,
                                                                        plannedSets,
                                                                        1
                                                                    )
                                                                }
                                                                disabled={
                                                                    performanceLoading ||
                                                                    loadedDate !== selectedDate ||
                                                                    completedSets >= plannedSets ||
                                                                    plannedSets <= 0
                                                                }
                                                                aria-label={`Increase completed sets for ${exercise.name}`}
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="workouts-measurement-note">
                                                        Performance tracking for this measurement type
                                                        is not available here yet.
                                                    </p>
                                                )}
                                            </div>

                                            <Dumbbell
                                                className="workouts-exercise-icon"
                                                size={19}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="workouts-unplanned-state">
                                <CalendarDays size={25} />
                                <h3>No session planned</h3>
                                <p>Add exercises to turn this into a training day.</p>
                            </div>
                        )}

                        <button
                            className="workouts-add-button"
                            onClick={() => setEditingDay(true)}
                        >
                            <Plus size={17} />
                            Edit {selectedDayName}
                        </button>
                    </article>
                </>
            )}

            {actionError && (
                <div className="workouts-error" role="alert">
                    {actionError}
                </div>
            )}

            {editingDay && selectedDayData && (
                <WeeklyPlanEditor
                    day={selectedDayData}
                    dayName={selectedDayName}
                    onClose={() => setEditingDay(false)}
                    onSaved={handleDaySaved}
                />
            )}
        </section>
    );
}

export default WeeklySchedule;
