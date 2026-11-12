
import { useEffect, useMemo, useState } from "react";

import {
    Activity,
    BookOpen,
    Brain,
    Bike,
    CalendarDays,
    ChartNoAxesCombined,
    CheckCircle2,
    Code,
    Dumbbell,
    Droplets,
    Flame,
    GraduationCap,
    Heart,
    LoaderCircle,
    Moon,
    Sun,
    Target,
    Trophy,
    X,
} from "lucide-react";

import API_BASE_URL from "../../config/api";

const API_URL = `${API_BASE_URL}/habits`;

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
    bike: Bike,
    moon: Moon,
};

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

function buildWeeks(activity) {
    if (!activity.length) return [];

    const firstDate = new Date(
        `${activity[0].date}T00:00:00.000Z`
    );

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

function getMonthLabels(weeks) {
    let previousMonth = null;

    return weeks.map((week) => {
        const firstDay = week.find(Boolean);

        if (!firstDay) return "";

        const date = new Date(`${firstDay.date}T00:00:00.000Z`);
        const month = date.getUTCMonth();

        if (month === previousMonth) return "";

        previousMonth = month;

        return date.toLocaleDateString(undefined, {
            month: "short",
            timeZone: "UTC",
        });
    });
}

function getBestWeekday(activity) {
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const totals = weekdays.map((name, index) => {
        const eligibleDays = activity.filter((day) => {
            if (!day.eligible) return false;

            return (
                new Date(`${day.date}T00:00:00.000Z`).getUTCDay() === index
            );
        });

        const completed = eligibleDays.filter(
            (day) => day.completed
        ).length;

        return {
            name,
            eligible: eligibleDays.length,
            completed,
            rate: eligibleDays.length
                ? completed / eligibleDays.length
                : 0,
        };
    });

    const best = totals
        .filter((day) => day.eligible > 0)
        .sort((a, b) => {
            if (b.rate !== a.rate) return b.rate - a.rate;

            return b.completed - a.completed;
        })[0];

    return best || null;
}

function HabitsModal({ habit, onClose }) {
    const [activity, setActivity] = useState([]);
    const [selectedDay, setSelectedDay] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const Icon = HABIT_ICONS[habit?.icon] || Target;

    // Fetch the selected habit's 90-day history.
    useEffect(() => {
        if (!habit?.id) return;

        const controller = new AbortController();

        async function fetchHistory() {
            setLoading(true);
            setError("");
            setActivity([]);
            setSelectedDay(null);

            try {
                const response = await fetch(
                    `${API_URL}/${encodeURIComponent(habit.id)}/consistency?days=90`,
                    { signal: controller.signal }
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error || "Could not load habit history."
                    );
                }

                if (!Array.isArray(result.activity)) {
                    throw new Error("Invalid consistency response.");
                }

                setActivity(result.activity);
            } catch (err) {
                if (err.name !== "AbortError") {
                    setError(
                        err.message || "Could not load habit history."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchHistory();

        return () => controller.abort();
    }, [habit?.id]);

    // Handle Escape and preserve the previous body scroll setting.
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;

        function handleEscape(event) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = previousOverflow;
        };
    }, [onClose]);

    const stats = useMemo(() => {
        const eligible = activity.filter((day) => day.eligible);
        const completed = eligible.filter((day) => day.completed);

        return {
            completed: completed.length,
            eligible: eligible.length,
            percentage: eligible.length
                ? Math.round((completed.length / eligible.length) * 100)
                : 0,
        };
    }, [activity]);

    const weeks = useMemo(
        () => buildWeeks(activity),
        [activity]
    );

    const monthLabels = useMemo(
        () => getMonthLabels(weeks),
        [weeks]
    );

    const bestWeekday = useMemo(
        () => getBestWeekday(activity),
        [activity]
    );

    const insights = useMemo(() => {
        if (!activity.length) return [];

        const items = [];

        if (bestWeekday && bestWeekday.eligible >= 2) {
            items.push({
                icon: CalendarDays,
                title: "Your strongest day",
                value: bestWeekday.name,
                description: `${Math.round(bestWeekday.rate * 100)}% completion across ${bestWeekday.eligible} eligible days`,
            });
        }

        if (stats.completed > 0) {
            items.push({
                icon: CheckCircle2,
                title: "Consistency",
                value: `${stats.completed} completed`,
                description: `Out of ${stats.eligible} eligible days in the last 90 days`,
            });
        }

        if (habit.longestStreak > 0) {
            items.push({
                icon: Trophy,
                title: "Personal best",
                value: `${habit.longestStreak} ${habit.longestStreak === 1 ? "day" : "days"}`,
                description: "Your longest recorded completion streak",
            });
        }

        return items;
    }, [activity, bestWeekday, stats, habit.longestStreak]);

    if (!habit) return null;

    return (
        <div
            className="habit-analytics-backdrop"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section
                className="habit-analytics-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="habit-analytics-title"
            >
                {/* Header */}
                <div className="habit-analytics-modal-header">
                    <div className="habit-analytics-identity">
                        <div className="habit-analytics-icon">
                            <Icon size={24} />
                        </div>

                        <div className="habit-analytics-heading-copy">
                            <div className="habit-analytics-eyebrow">
                                <span>HABIT ANALYTICS</span>
                                <span className="habit-analytics-status">
                                    <i />
                                    TRACKING
                                </span>
                            </div>

                            <h2 id="habit-analytics-title">
                                {habit.title}
                            </h2>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="habit-analytics-close"
                        onClick={onClose}
                        aria-label="Close habit analytics"
                    >
                        <X size={21} />
                    </button>
                </div>

                {habit.description && (
                    <p className="habit-analytics-description">
                        {habit.description}
                    </p>
                )}

                {/* Statistics */}
                <div className="habit-analytics-stats">
                    <div className="habit-analytics-stat habit-analytics-stat-completion">
                        <div className="habit-analytics-stat-top">
                            <span>Completion rate</span>
                            <ChartNoAxesCombined size={17} />
                        </div>

                        <strong>{habit.completionRate ?? 0}%</strong>

                        <div className="habit-analytics-progress">
                            <span
                                style={{
                                    width: `${Math.min(
                                        100,
                                        Math.max(0, habit.completionRate || 0)
                                    )}%`,
                                }}
                            />
                        </div>

                        <small>Last 30 days</small>
                    </div>

                    <div className="habit-analytics-stat">
                        <div className="habit-analytics-stat-top">
                            <span>Completed days</span>
                            <CheckCircle2 size={17} />
                        </div>

                        <strong>
                            {habit.completedDays ?? 0}/
                            {habit.eligibleDays ?? 0}
                        </strong>

                        <small>Eligible tracking days</small>
                    </div>

                    <div className="habit-analytics-stat">
                        <div className="habit-analytics-stat-top">
                            <span>Current streak</span>
                            <Flame size={17} />
                        </div>

                        <strong>
                            {habit.currentStreak ?? 0}{" "}
                            {(habit.currentStreak ?? 0) === 1 ? "day" : "days"}
                        </strong>

                        <small>Keep your momentum going</small>
                    </div>

                    <div className="habit-analytics-stat">
                        <div className="habit-analytics-stat-top">
                            <span>Longest streak</span>
                            <Trophy size={17} />
                        </div>

                        <strong>
                            {habit.longestStreak ?? 0}{" "}
                            {(habit.longestStreak ?? 0) === 1 ? "day" : "days"}
                        </strong>

                        <small>Your personal best</small>
                    </div>
                </div>

                {/* 90-day activity */}
                <div className="habit-analytics-heatmap">
                    <div className="habit-analytics-section-heading">
                        <div>
                            <CalendarDays size={19} />
                            <div>
                                <h3>Activity history</h3>
                                <p>Your habit over the last 90 days</p>
                            </div>
                        </div>

                        <span>
                            {loading
                                ? "Loading..."
                                : `${stats.completed} completed`}
                        </span>
                    </div>

                    {loading ? (
                        <div className="habit-analytics-loading">
                            <LoaderCircle className="habits-spinner" />
                            Loading history...
                        </div>
                    ) : error ? (
                        <div className="habit-analytics-error" role="alert">
                            {error}
                        </div>
                    ) : activity.length === 0 ? (
                        <div className="habit-analytics-loading">
                            <Activity size={21} />
                            No activity history available.
                        </div>
                    ) : (
                        <>
                            <div className="habit-modal-heatmap-scroll">
                                <div className="habit-modal-calendar">
                                    <div className="habit-modal-months">
                                        {monthLabels.map((month, index) => (
                                            <span key={index}>
                                                {month}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="habit-modal-heatmap">
                                        <div className="habit-modal-weekdays">
                                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                                                (day) => (
                                                    <span key={day}>{day}</span>
                                                )
                                            )}
                                        </div>

                                        <div className="habit-modal-weeks">
                                            {weeks.map((week, weekIndex) => (
                                                <div
                                                    className="habit-modal-week"
                                                    key={weekIndex}
                                                >
                                                    {week.map((day, dayIndex) => {
                                                        const selected =
                                                            day &&
                                                            selectedDay?.date === day.date;

                                                        const status = !day
                                                            ? ""
                                                            : !day.eligible
                                                                ? "Not tracked"
                                                                : day.completed
                                                                    ? "Completed"
                                                                    : "Not completed";

                                                        return (
                                                            <button
                                                                key={
                                                                    day?.date ||
                                                                    `${weekIndex}-${dayIndex}`
                                                                }
                                                                type="button"
                                                                disabled={!day}
                                                                className={[
                                                                    "habit-modal-cell",
                                                                    !day ? "empty" : "",
                                                                    day && !day.eligible ? "ineligible" : "",
                                                                    day?.eligible && !day.completed ? "missed" : "",
                                                                    day?.completed ? "completed" : "",
                                                                    day?.isToday ? "today" : "",
                                                                    selected ? "selected" : "",
                                                                ].join(" ")}
                                                                title={
                                                                    day
                                                                        ? `${formatDate(day.date)} — ${status}`
                                                                        : undefined
                                                                }
                                                                aria-label={
                                                                    day
                                                                        ? `${formatDate(day.date)}: ${status}`
                                                                        : "Empty calendar cell"
                                                                }
                                                                aria-pressed={Boolean(selected)}
                                                                onClick={() => {
                                                                    setSelectedDay((current) =>
                                                                        current?.date === day.date
                                                                            ? null
                                                                            : day
                                                                    );
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="habit-modal-legend">
                                <span>Not tracked</span>
                                <i className="ineligible" />

                                <span>Missed</span>
                                <i className="missed" />

                                <span>Completed</span>
                                <i className="completed" />
                            </div>

                            {/* Selected day */}
                            {selectedDay && (
                                <div
                                    className={[
                                        "habit-modal-selected-day",
                                        selectedDay.completed
                                            ? "is-completed"
                                            : !selectedDay.eligible
                                                ? "is-ineligible"
                                                : "is-missed",
                                    ].join(" ")}
                                    aria-live="polite"
                                >
                                    <div className="habit-modal-selected-icon">
                                        {selectedDay.completed ? (
                                            <CheckCircle2 size={20} />
                                        ) : (
                                            <CalendarDays size={20} />
                                        )}
                                    </div>

                                    <div className="habit-modal-selected-copy">
                                        <strong>
                                            {formatDate(selectedDay.date)}
                                        </strong>
                                        <span>{habit.title}</span>
                                    </div>

                                    <span className="habit-modal-selected-status">
                                        {!selectedDay.eligible
                                            ? "Not tracked"
                                            : selectedDay.completed
                                                ? "Completed"
                                                : "Not completed"}
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Insights */}
                {!loading && !error && insights.length > 0 && (
                    <div className="habit-analytics-insights">
                        <div className="habit-analytics-insights-heading">
                            <div>
                                <Activity size={18} />
                                <h3>Insights</h3>
                            </div>
                            <span>Based on 90-day history</span>
                        </div>

                        <div className="habit-analytics-insights-grid">
                            {insights.map((insight) => {
                                const InsightIcon = insight.icon;

                                return (
                                    <div
                                        className="habit-analytics-insight"
                                        key={insight.title}
                                    >
                                        <div className="habit-analytics-insight-icon">
                                            <InsightIcon size={18} />
                                        </div>

                                        <div>
                                            <span>{insight.title}</span>
                                            <strong>{insight.value}</strong>
                                            <p>{insight.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

export default HabitsModal;
