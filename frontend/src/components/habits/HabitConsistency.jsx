
import { useEffect, useMemo, useState } from "react";
import {
    ChartNoAxesCombined,
    LoaderCircle,
    CalendarDays,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/habits";
const DAYS_TO_SHOW = 90;

function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getLast90Days() {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    return Array.from({ length: DAYS_TO_SHOW }, (_, index) => {
        const date = new Date(today);
        date.setDate(date.getDate() - (DAYS_TO_SHOW - 1 - index));

        return getLocalDateString(date);
    });
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function Consistency() {
    const [availableHabits, setAvailableHabits] = useState([]);
    const [selectedHabitId, setSelectedHabitId] = useState("");
    const [activity, setActivity] = useState([]);
    const [habitTitle, setHabitTitle] = useState("");

    const [habitsLoading, setHabitsLoading] = useState(true);
    const [loading, setLoading] = useState(false);

    const [habitsError, setHabitsError] = useState("");
    const [error, setError] = useState("");

    const [selectedDay, setSelectedDay] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    const dates = useMemo(() => getLast90Days(), []);

    const activeHabits = useMemo(
        () => availableHabits.filter((habit) => habit.isActive !== false),
        [availableHabits]
    );

    // Fetch active habits independently of the daily habits endpoint.
    useEffect(() => {
        const controller = new AbortController();

        async function fetchActiveHabits() {
            setHabitsLoading(true);
            setHabitsError("");

            try {

                const response = await fetch(API_URL, {
                    signal: controller.signal,
                });

                const contentType = response.headers.get("content-type") || "";

                if (!contentType.includes("application/json")) {
                    const body = await response.text();

                    throw new Error(
                        `Expected JSON from ${API_URL}, but received ${contentType || "an unknown content type"}. Check your backend URL and port.`
                    );
                }

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error || result.message || "Could not load active habits."
                    );
                }

                // Support common API response shapes.
                const habitsData = Array.isArray(result)
                    ? result
                    : Array.isArray(result.habits)
                        ? result.habits
                        : Array.isArray(result.data)
                            ? result.data
                            : null;

                if (!habitsData) {
                    console.error("Unexpected habits API response:", result);

                    throw new Error(
                        "The habits API did not return an array. Check the console for its response."
                    );
                }

                const active = habitsData.filter(
                    (habit) => habit.isActive !== false
                );

                setAvailableHabits(active);

                setSelectedHabitId((currentId) =>
                    active.some((habit) => habit.id === currentId)
                        ? currentId
                        : active[0]?.id ?? ""
                );

            } catch (err) {
                if (err.name !== "AbortError") {
                    setHabitsError(
                        err.message || "Could not load active habits."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setHabitsLoading(false);
                }
            }
        }

        fetchActiveHabits();

        return () => controller.abort();
    }, []);

    // Fetch completion history for the selected habit.
    useEffect(() => {
        if (!selectedHabitId) {
            setActivity([]);
            setHabitTitle("");
            setLoading(false);
            setError("");
            return;
        }

        const controller = new AbortController();

        async function fetchConsistency() {
            setLoading(true);
            setError("");
            setSelectedDay(null);
            setActivity([]);

            try {
                const response = await fetch(
                    `${API_URL}/${encodeURIComponent(
                        selectedHabitId
                    )}/consistency?days=${DAYS_TO_SHOW}`,
                    { signal: controller.signal }
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error || "Could not load consistency data."
                    );
                }

                if (!Array.isArray(result.activity)) {
                    throw new Error("The consistency API returned invalid data.");
                }

                setHabitTitle(result.habit?.title ?? "");
                setActivity(result.activity);
            } catch (err) {
                if (err.name !== "AbortError") {
                    setError(
                        err.message || "Could not load consistency data."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchConsistency();

        return () => controller.abort();
    }, [selectedHabitId, retryCount]);

    const activityByDate = useMemo(
        () => new Map(activity.map((day) => [day.date, day])),
        [activity]
    );

    const stats = useMemo(() => {
        const eligibleDays = activity.filter((day) => day.eligible);
        const completedDays = eligibleDays.filter((day) => day.completed);

        return {
            completed: completedDays.length,
            eligible: eligibleDays.length,
            percentage: eligibleDays.length
                ? Math.round(
                    (completedDays.length / eligibleDays.length) * 100
                )
                : 0,
        };
    }, [activity]);

    // Arrange the dates into seven weekday rows and weekly columns.
    const weeks = useMemo(() => {
        const [year, month, day] = dates[0].split("-").map(Number);
        const firstDate = new Date(year, month - 1, day);
        const leadingEmptyCells = firstDate.getDay();

        const cells = [
            ...Array(leadingEmptyCells).fill(null),
            ...dates,
        ];

        while (cells.length % 7 !== 0) {
            cells.push(null);
        }

        const result = [];

        for (let index = 0; index < cells.length; index += 7) {
            result.push(cells.slice(index, index + 7));
        }

        return result;
    }, [dates]);

    function getCellClass(day) {
        if (!day) {
            return "consistency-cell consistency-cell-empty";
        }

        if (!day.eligible) {
            return "consistency-cell consistency-cell-ineligible";
        }

        if (day.completed) {
            return "consistency-cell consistency-cell-completed";
        }

        return "consistency-cell consistency-cell-missed";
    }

    function handleDayClick(day) {
        if (!day) return;

        setSelectedDay((current) =>
            current?.date === day.date ? null : day
        );
    }

    function retryFetch() {
        if (habitsError) {
            // The initial habit-list request failed. Reload the component
            // data by asking the user to retry the request.
            setHabitsError("");
            setHabitsLoading(true);

            fetch(API_URL)
                .then(async (response) => {
                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result.error || "Could not load active habits."
                        );
                    }

                    if (!Array.isArray(result)) {
                        throw new Error("The habits API returned an unexpected response.");
                    }

                    const active = result.filter(
                        (habit) => habit.isActive !== false
                    );

                    setAvailableHabits(active);
                    setSelectedHabitId((currentId) =>
                        active.some((habit) => habit.id === currentId)
                            ? currentId
                            : active[0]?.id ?? ""
                    );
                })
                .catch((err) => {
                    setHabitsError(
                        err.message || "Could not load active habits."
                    );
                })
                .finally(() => {
                    setHabitsLoading(false);
                });

            return;
        }

        setRetryCount((count) => count + 1);
    }

    if (habitsLoading) {
        return (
            <section className="consistency-panel">
                <div className="consistency-state" role="status">
                    <LoaderCircle className="habits-spinner" size={24} />
                    <span>Loading active habits...</span>
                </div>
            </section>
        );
    }

    if (habitsError) {
        return (
            <section className="consistency-panel">
                <div className="consistency-error" role="alert">
                    <p>{habitsError}</p>
                    <button type="button" onClick={retryFetch}>
                        Try again
                    </button>
                </div>
            </section>
        );
    }

    if (activeHabits.length === 0) {
        return (
            <section className="consistency-panel">
                <div className="consistency-empty">
                    <ChartNoAxesCombined size={30} />
                    <h3>No active habits yet</h3>
                    <p>
                        Create an active habit to start tracking its consistency.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="consistency-panel">
            <div className="consistency-heading">
                <div className="consistency-heading-icon">
                    <ChartNoAxesCombined size={22} />
                </div>

                <div>
                    <h2>Consistency</h2>
                    <p>Track your daily progress over the last 90 days.</p>
                </div>
            </div>

            <div className="consistency-controls">
                <label htmlFor="consistency-habit-select">
                    Select habit
                </label>

                <select
                    id="consistency-habit-select"
                    value={selectedHabitId}
                    onChange={(event) => setSelectedHabitId(event.target.value)}
                >
                    {activeHabits.map((habit) => (
                        <option key={habit.id} value={habit.id}>
                            {habit.title}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="consistency-state" role="status">
                    <LoaderCircle className="habits-spinner" size={24} />
                    <span>Loading consistency...</span>
                </div>
            ) : error ? (
                <div className="consistency-error" role="alert">
                    <p>{error}</p>
                    <button type="button" onClick={retryFetch}>
                        Try again
                    </button>
                </div>
            ) : (
                <>
                    <div className="consistency-summary">
                        <div>
                            <span className="consistency-summary-label">
                                Selected habit
                            </span>
                            <strong>{habitTitle}</strong>
                        </div>

                        <div>
                            <span className="consistency-summary-label">
                                Completion rate
                            </span>
                            <strong>{stats.percentage}%</strong>
                        </div>

                        <div>
                            <span className="consistency-summary-label">
                                Days completed
                            </span>
                            <strong>
                                {stats.completed} / {stats.eligible}
                            </strong>
                        </div>
                    </div>

                    <div className="consistency-heatmap-card">
                        <div className="consistency-heatmap-top">
                            <div>
                                <CalendarDays size={18} />
                                <span>Last 90 days</span>
                            </div>

                            <span className="consistency-total">
                                {stats.completed}{" "}
                                {stats.completed === 1 ? "day" : "days"} completed
                            </span>
                        </div>

                        <div className="consistency-scroll">
                            <div
                                className="consistency-heatmap"
                                role="group"
                                aria-label={`${habitTitle} completion history for the last 90 days`}
                            >
                                <div
                                    className="consistency-weekday-labels"
                                    aria-hidden="true"
                                >
                                    <span>Sun</span>
                                    <span>Mon</span>
                                    <span>Tue</span>
                                    <span>Wed</span>
                                    <span>Thu</span>
                                    <span>Fri</span>
                                    <span>Sat</span>
                                </div>

                                <div className="consistency-weeks">
                                    {weeks.map((week, weekIndex) => (
                                        <div
                                            className="consistency-week"
                                            key={weekIndex}
                                        >
                                            {week.map((date, dayIndex) => {
                                                const day = date
                                                    ? activityByDate.get(date)
                                                    : null;

                                                const isSelected =
                                                    day && selectedDay?.date === day.date;

                                                const status = !day
                                                    ? "No date"
                                                    : !day.eligible
                                                        ? "Before habit started"
                                                        : day.completed
                                                            ? "Completed"
                                                            : "Not completed";

                                                return (
                                                    <button
                                                        key={
                                                            date ??
                                                            `empty-${weekIndex}-${dayIndex}`
                                                        }
                                                        type="button"
                                                        className={`${getCellClass(day)} ${isSelected
                                                                ? "consistency-cell-selected"
                                                                : ""
                                                            }`}
                                                        disabled={!day}
                                                        onClick={() => handleDayClick(day)}
                                                        title={
                                                            day
                                                                ? `${formatDate(day.date)} — ${status}`
                                                                : undefined
                                                        }
                                                        aria-label={
                                                            day
                                                                ? `${formatDate(day.date)}: ${status}`
                                                                : "No date"
                                                        }
                                                    />
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="consistency-legend">
                            <span>Less</span>
                            <span className="consistency-cell consistency-cell-ineligible" />
                            <span className="consistency-cell consistency-cell-missed" />
                            <span className="consistency-cell consistency-cell-completed" />
                            <span>More</span>
                        </div>

                        {selectedDay && (
                            <div
                                className="consistency-day-details"
                                aria-live="polite"
                            >
                                <strong>{formatDate(selectedDay.date)}</strong>
                                <span>
                                    {!selectedDay.eligible
                                        ? "Habit had not started yet"
                                        : selectedDay.completed
                                            ? "Habit completed"
                                            : "Habit not completed"}
                                </span>
                            </div>
                        )}
                    </div>
                </>
            )}
        </section>
    );
}

export default Consistency;
