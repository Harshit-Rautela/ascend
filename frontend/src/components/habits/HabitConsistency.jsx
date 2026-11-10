
import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    ArrowUpRight,
    BookOpen,
    Brain,
    Bike,
    CalendarDays,
    Check,
    ChevronRight,
    Code,
    Dumbbell,
    Flame,
    Heart,
    LoaderCircle,
    Moon,
    Sun,
    Target,
    X,
    GraduationCap,
    Droplets,
    Apple,
} from "lucide-react";
import HabitAnalyticsModal from "./HabitsModal";
import "./Habits.css";

const API_URL = "http://localhost:5000/api/habits";

const HABIT_ICONS = {
    target: Target,
    "book-open": BookOpen,
    dumbbell: Dumbbell,
    brain: Brain,
    sun: Sun,
    code: Code,
    "graduation-cap": GraduationCap,
    droplets: Droplets,
    heart: Heart,
    apple: Apple,
    bike: Bike,
    moon: Moon,
};

function dateKey(date) {
    return [
        date.getUTCFullYear(),
        String(date.getUTCMonth() + 1).padStart(2, "0"),
        String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");
}

function formatDate(value) {
    return new Date(`${value}T00:00:00.000Z`).toLocaleDateString(
        undefined,
        {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
        }
    );
}

function getLast30DaysCount(habit) {
    return `${habit.completedDays} / ${habit.eligibleDays} days`;
}

function getMotivationalMessage(completed, total) {
    if (total === 0) {
        return "Start building your consistency today.";
    }

    if (completed === total) {
        return "Amazing work. You've completed every habit today!";
    }

    if (completed === 0) {
        return "A fresh day is a fresh opportunity to begin.";
    }

    return `${total - completed} habit${total - completed === 1 ? "" : "s"} waiting. Keep your momentum going.`;
}

function buildWeeks(activity) {
    if (!activity.length) return [];

    const firstDate = new Date(`${activity[0].date}T00:00:00.000Z`);
    const cells = [
        ...Array(firstDate.getUTCDay()).fill(null),
        ...activity,
    ];

    while (cells.length % 7 !== 0) {
        cells.push(null);
    }

    const weeks = [];

    for (let i = 0; i < cells.length; i += 7) {
        weeks.push(cells.slice(i, i + 7));
    }

    return weeks;
}

// function HabitAnalyticsModal({ habit, onClose }) {
//     const [activity, setActivity] = useState([]);
//     const [selectedDay, setSelectedDay] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState("");

//     const Icon = HABIT_ICONS[habit.icon] || Target;

//     useEffect(() => {
//         const controller = new AbortController();

//         async function fetchHistory() {
//             setLoading(true);
//             setError("");

//             try {
//                 const response = await fetch(
//                     `${API_URL}/${encodeURIComponent(habit.id)}/consistency?days=90`,
//                     { signal: controller.signal }
//                 );

//                 const result = await response.json();

//                 if (!response.ok) {
//                     throw new Error(
//                         result.error || "Could not load habit history."
//                     );
//                 }

//                 if (!Array.isArray(result.activity)) {
//                     throw new Error("Invalid consistency response.");
//                 }

//                 setActivity(result.activity);
//             } catch (err) {
//                 if (err.name !== "AbortError") {
//                     setError(err.message || "Could not load habit history.");
//                 }
//             } finally {
//                 if (!controller.signal.aborted) {
//                     setLoading(false);
//                 }
//             }
//         }

//         fetchHistory();

//         return () => controller.abort();
//     }, [habit.id]);

//     useEffect(() => {
//         function handleEscape(event) {
//             if (event.key === "Escape") onClose();
//         }

//         document.addEventListener("keydown", handleEscape);
//         document.body.style.overflow = "hidden";

//         return () => {
//             document.removeEventListener("keydown", handleEscape);
//             document.body.style.overflow = "";
//         };
//     }, [onClose]);

//     const stats = useMemo(() => {
//         const eligible = activity.filter((day) => day.eligible);
//         const completed = eligible.filter((day) => day.completed);

//         return {
//             completed: completed.length,
//             eligible: eligible.length,
//             percentage: eligible.length
//                 ? Math.round((completed.length / eligible.length) * 100)
//                 : 0,
//         };
//     }, [activity]);

//     const weeks = useMemo(() => buildWeeks(activity), [activity]);

//     const activityByDate = useMemo(
//         () => new Map(activity.map((day) => [day.date, day])),
//         [activity]
//     );

//     return (
//         <div
//             className="habit-analytics-backdrop"
//             onMouseDown={(event) => {
//                 if (event.target === event.currentTarget) onClose();
//             }}
//         >
//             <section
//                 className="habit-analytics-modal"
//                 role="dialog"
//                 aria-modal="true"
//                 aria-labelledby="habit-analytics-title"
//             >
//                 <div className="habit-analytics-modal-header">
//                     <div className="habit-analytics-identity">
//                         <div className="habit-analytics-icon">
//                             <Icon size={23} />
//                         </div>

//                         <div>
//                             <span>HABIT ANALYTICS</span>
//                             <h2 id="habit-analytics-title">{habit.title}</h2>
//                         </div>
//                     </div>

//                     <button
//                         className="habit-analytics-close"
//                         onClick={onClose}
//                         aria-label="Close habit analytics"
//                     >
//                         <X size={20} />
//                     </button>
//                 </div>

//                 {habit.description && (
//                     <p className="habit-analytics-description">
//                         {habit.description}
//                     </p>
//                 )}

//                 <div className="habit-analytics-stats">
//                     <div>
//                         <span>30-day completion</span>
//                         <strong>{habit.completionRate}%</strong>
//                     </div>

//                     <div>
//                         <span>Completed days</span>
//                         <strong>
//                             {habit.completedDays}/{habit.eligibleDays}
//                         </strong>
//                     </div>

//                     <div>
//                         <span>Current streak</span>
//                         <strong>{habit.currentStreak} days</strong>
//                     </div>

//                     <div>
//                         <span>Longest streak</span>
//                         <strong>{habit.longestStreak} days</strong>
//                     </div>
//                 </div>

//                 <div className="habit-analytics-heatmap">
//                     <div className="habit-analytics-section-heading">
//                         <div>
//                             <CalendarDays size={18} />
//                             <h3>Last 90 days</h3>
//                         </div>

//                         <span>{stats.completed} completed</span>
//                     </div>

//                     {loading ? (
//                         <div className="habit-analytics-loading">
//                             <LoaderCircle className="habits-spinner" />
//                             Loading history...
//                         </div>
//                     ) : error ? (
//                         <div className="habit-analytics-error" role="alert">
//                             {error}
//                         </div>
//                     ) : (
//                         <>
//                             <div className="habit-modal-heatmap-scroll">
//                                 <div className="habit-modal-heatmap">
//                                     <div className="habit-modal-weekdays">
//                                         {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
//                                             (day) => <span key={day}>{day}</span>
//                                         )}
//                                     </div>

//                                     <div className="habit-modal-weeks">
//                                         {weeks.map((week, weekIndex) => (
//                                             <div className="habit-modal-week" key={weekIndex}>
//                                                 {week.map((day, dayIndex) => {
//                                                     const selected =
//                                                         day && selectedDay?.date === day.date;

//                                                     return (
//                                                         <button
//                                                             key={day?.date || `${weekIndex}-${dayIndex}`}
//                                                             type="button"
//                                                             disabled={!day}
//                                                             className={[
//                                                                 "habit-modal-cell",
//                                                                 !day ? "empty" : "",
//                                                                 day && !day.eligible ? "ineligible" : "",
//                                                                 day?.eligible && !day.completed ? "missed" : "",
//                                                                 day?.completed ? "completed" : "",
//                                                                 selected ? "selected" : "",
//                                                             ].join(" ")}
//                                                             title={
//                                                                 day
//                                                                     ? `${formatDate(day.date)} — ${!day.eligible
//                                                                         ? "Not tracked"
//                                                                         : day.completed
//                                                                             ? "Completed"
//                                                                             : "Not completed"
//                                                                     }`
//                                                                     : undefined
//                                                             }
//                                                             aria-label={
//                                                                 day
//                                                                     ? `${formatDate(day.date)}: ${!day.eligible
//                                                                         ? "Not tracked"
//                                                                         : day.completed
//                                                                             ? "Completed"
//                                                                             : "Not completed"
//                                                                     }`
//                                                                     : "Empty calendar cell"
//                                                             }
//                                                             aria-pressed={Boolean(selected)}
//                                                             onClick={() =>
//                                                                 setSelectedDay((current) =>
//                                                                     current?.date === day.date
//                                                                         ? null
//                                                                         : day
//                                                                 )
//                                                             }
//                                                         />
//                                                     );
//                                                 })}
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="habit-modal-legend">
//                                 <span>Not tracked</span>
//                                 <i className="ineligible" />
//                                 <span>Missed</span>
//                                 <i className="missed" />
//                                 <span>Completed</span>
//                                 <i className="completed" />
//                             </div>

//                             {selectedDay && (
//                                 <div className="habit-modal-selected-day" aria-live="polite">
//                                     <div>
//                                         <CalendarDays size={17} />
//                                         <strong>{formatDate(selectedDay.date)}</strong>
//                                     </div>

//                                     <span className={
//                                         !selectedDay.eligible
//                                             ? "not-tracked"
//                                             : selectedDay.completed
//                                                 ? "done"
//                                                 : "missed-status"
//                                     }>
//                                         {!selectedDay.eligible
//                                             ? "Not tracked yet"
//                                             : selectedDay.completed
//                                                 ? "Completed"
//                                                 : "Not completed"}
//                                     </span>
//                                 </div>
//                             )}
//                         </>
//                     )}
//                 </div>
//             </section>
//         </div>
//     );
// }

function HabitConsistency() {
    const [habits, setHabits] = useState([]);
    const [overview, setOverview] = useState(null);
    const [selectedHabit, setSelectedHabit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function fetchAnalytics() {
            setLoading(true);
            setError("");

            try {
                const response = await fetch(`${API_URL}/analytics`, {
                    signal: controller.signal,
                });

                const result = await response.json();
                console.log("Habit analytics:", result.habits);
                console.log("Seven-day activity:", result.habits?.[0]?.last7Days);

                if (!response.ok) {
                    throw new Error(
                        result.error || "Could not load habit analytics."
                    );
                }

                setOverview(result.overview);
                setHabits(Array.isArray(result.habits) ? result.habits : []);
            } catch (err) {
                if (err.name !== "AbortError") {
                    setError(err.message || "Could not load habit analytics.");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchAnalytics();

        return () => controller.abort();
    }, []);

    const bestHabit = useMemo(
        () => [...habits].sort(
            (a, b) => b.currentStreak - a.currentStreak
        )[0],
        [habits]
    );

    if (loading) {
        return (
            <section className="consistency-panel consistency-dashboard">
                <div className="consistency-state" role="status">
                    <LoaderCircle className="habits-spinner" size={25} />
                    Loading your habit analytics...
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="consistency-panel consistency-dashboard">
                <div className="consistency-error" role="alert">
                    <p>{error}</p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                    >
                        Try again
                    </button>
                </div>
            </section>
        );
    }

    if (!overview || habits.length === 0) {
        return (
            <section className="consistency-panel consistency-dashboard">
                <div className="consistency-empty">
                    <Activity size={32} />
                    <h3>No active habits yet</h3>
                    <p>Create an active habit to start tracking your consistency.</p>
                </div>
            </section>
        );
    }

    return (
        <section className="consistency-panel consistency-dashboard">
            <div className="consistency-dashboard-heading">
                <div>
                    <span className="consistency-eyebrow">YOUR PERFORMANCE</span>
                    <h2>Consistency</h2>
                    <p>A clearer picture of the habits you're building.</p>
                </div>

                <div className="consistency-heading-icon">
                    <Activity size={23} />
                </div>
            </div>

            <div className="consistency-hero">
                <div className="consistency-hero-copy">
                    <span>FOCUS · TODAY</span>
                    <h3>{getMotivationalMessage(
                        overview.todayCompleted,
                        overview.todayEligible
                    )}</h3>

                    <div className="consistency-hero-meta">
                        <span>
                            <Check size={13} />
                            {overview.todayCompleted} completed
                        </span>
                        <span>
                            {Math.max(
                                0,
                                overview.todayEligible - overview.todayCompleted
                            )} remaining
                        </span>
                    </div>
                </div>

                <div className="consistency-hero-progress">
                    <strong>{overview.todayCompleted}</strong>
                    <span> / {overview.todayEligible}</span>
                    <small>done today</small>
                </div>
            </div>

            <div className="consistency-kpi-strip">
                <div className="consistency-kpi">
                    <span>TODAY</span>
                    <strong>
                        {overview.todayCompleted}/{overview.todayEligible}
                    </strong>
                    <small>Habits completed</small>
                </div>

                <div className="consistency-kpi">
                    <span>LONGEST ACTIVE STREAK</span>
                    <strong>{overview.bestCurrentStreak}</strong>
                    <small>days · {bestHabit?.title || "No active streak"}</small>
                </div>

                <div className="consistency-kpi">
                    <span>30-DAY CONSISTENCY</span>
                    <strong>{overview.completionRate30Days}%</strong>
                    <small>Across all active habits</small>
                </div>

                <div className="consistency-kpi">
                    <span>TOTAL STREAK DAYS</span>
                    <strong>{overview.totalStreakDays}</strong>
                    <small>Across {habits.length} habits</small>
                </div>
            </div>

            <div className="consistency-habits-heading">
                <div>
                    <h3>Your habits</h3>
                    <span>{habits.length} active</span>
                </div>

                <span className="consistency-click-hint">
                    Select a habit to explore <ArrowUpRight size={14} />
                </span>
            </div>

            <div className="consistency-habit-grid">
                {habits.map((habit) => {
                    const Icon = HABIT_ICONS[habit.icon] || Target;

                    return (
                        <button
                            type="button"
                            className="consistency-habit-card"
                            key={habit.id}
                            onClick={() => setSelectedHabit(habit)}
                            aria-label={`View analytics for ${habit.title}`}
                        >
                            <div className="consistency-card-top">
                                <div className="consistency-card-identity">
                                    <div className="consistency-card-icon">
                                        <Icon size={19} />
                                    </div>

                                    <div>
                                        <h4>{habit.title}</h4>
                                        <span>
                                            {habit.description || "Your daily habit"}
                                        </span>
                                    </div>
                                </div>

                                <div className="consistency-card-open">
                                    <ChevronRight size={18} />
                                </div>
                            </div>

                            <div className="consistency-streak-block">
                                <div className="consistency-streak-main">
                                    <div className="consistency-streak-info">
                                        <span>CURRENT STREAK</span>

                                        <div className="consistency-streak-value">
                                            <strong>{habit.currentStreak}</strong>
                                            <small>days</small>
                                            <Flame size={16} />
                                        </div>

                                        <small>Best: {habit.longestStreak} days</small>
                                    </div>

                                    <div
                                        className="consistency-7day-grid"
                                        aria-label="Last seven days activity"
                                    >
                                        {(Array.isArray(habit.last7Days)
                                            ? habit.last7Days
                                            : []
                                        ).map((day) => (
                                            <div
                                                key={day.date}
                                                className={[
                                                    "consistency-7day-cell",
                                                    !day.eligible
                                                        ? "not-eligible"
                                                        : day.completed
                                                            ? "completed"
                                                            : "missed",
                                                    day.isToday ? "today" : "",
                                                ].join(" ")}
                                                title={`${day.date}: ${!day.eligible
                                                    ? "Not tracked"
                                                    : day.completed
                                                        ? "Completed"
                                                        : "Missed"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="consistency-card-footer">
                                <div className="consistency-card-rate">
                                    <strong>{habit.completionRate}%</strong>
                                    <span>Last 30 days</span>
                                </div>

                                <span>
                                    {habit.completedDays} / {habit.eligibleDays} days
                                </span>
                            </div>

                            <div className="consistency-30day-grid">
                                {(Array.isArray(habit.last30Days)
                                    ? habit.last30Days
                                    : []
                                ).map((day) => (
                                    <div
                                        key={day.date}
                                        className={[
                                            "consistency-30day-cell",
                                            !day.eligible
                                                ? "not-eligible"
                                                : day.completed
                                                    ? "completed"
                                                    : "missed",
                                            day.isToday ? "today" : "",
                                        ].join(" ")}
                                        title={`${day.date}: ${!day.eligible
                                            ? "Not tracked"
                                            : day.completed
                                                ? "Completed"
                                                : "Missed"
                                            }`}
                                    />
                                ))}
                            </div>

                            {/* <div className="consistency-30day-labels">
    <span>30 days ago</span>
    <span>Today</span>
</div>

                            <div className="consistency-card-footer">
                                <div className="consistency-card-rate">
                                    <strong>{habit.completionRate}%</strong>
                                    <span>Last 30 days</span>
                                </div>

                                <span>{getLast30DaysCount(habit)}</span>
                            </div>

                            <div className="consistency-card-footer">
                                <div className="consistency-card-rate">
                                    <strong>{habit.completionRate}%</strong>
                                    <span>Last 30 days</span>
                                </div>

                                <span>{habit.completedDays} / {habit.eligibleDays} days</span>
                            </div>

                            <div className="consistency-30day-grid">
                                {(Array.isArray(habit.last30Days) ? habit.last30Days : []).map((day) => (
                                    <div
                                        key={day.date}
                                        className={[
                                            "consistency-30day-cell",
                                            !day.eligible
                                                ? "not-eligible"
                                                : day.completed
                                                    ? "completed"
                                                    : "missed",
                                            day.isToday ? "today" : "",
                                        ].join(" ")}
                                        title={`${day.date}: ${!day.eligible
                                                ? "Not tracked"
                                                : day.completed
                                                    ? "Completed"
                                                    : "Missed"
                                            }`}
                                    />
                                ))}
                            </div> */}

                            <div className="consistency-30day-labels">
                                <span>30 days ago</span>
                                <span>Today</span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {selectedHabit && (
                <HabitAnalyticsModal
                    habit={selectedHabit}
                    onClose={() => setSelectedHabit(null)}
                />
            )}
        </section>
    );
}

export default HabitConsistency;
