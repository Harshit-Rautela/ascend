
import "./sleep.css";

import { useMemo, useState, useEffect } from "react";
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
} from "recharts";

function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function shiftDate(dateString, amount) {
    const date = new Date(`${dateString}T12:00:00`);
    date.setDate(date.getDate() + amount);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDuration(minutes) {
    if (minutes == null) return "--";

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${hours}h ${remainingMinutes}m`;
}
function getMonday(dateString) {
    const date = new Date(`${dateString}T12:00:00`);
    const day = date.getDay();

    date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${dayOfMonth}`;
}

function formatLongDate(dateString) {
    return new Date(`${dateString}T12:00:00`).toLocaleDateString(
        "en-IN",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        }
    );
}

function CircularMetricRing({ value, color, label, suffix = "" }) {
    const radius = 43;
    const circumference = 2 * Math.PI * radius;

    const hasValue = value != null && Number.isFinite(Number(value));
    const numericValue = hasValue ? Number(value) : 0;
    const progress = Math.min(100, Math.max(0, numericValue));

    const offset =
        circumference - (progress / 100) * circumference;

    return (
        <div
            className="sleep-metric-ring"
            role="img"
            aria-label={
                hasValue
                    ? `${label}: ${numericValue}${suffix}`
                    : `${label}: no data`
            }
        >
            <svg viewBox="0 0 110 110" aria-hidden="true">
                <circle
                    className="sleep-metric-ring-track"
                    cx="55"
                    cy="55"
                    r={radius}
                />

                {hasValue && (
                    <circle
                        className="sleep-metric-ring-progress"
                        cx="55"
                        cy="55"
                        r={radius}
                        stroke={color}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                    />
                )}
            </svg>

            <div className="sleep-metric-ring-content">
                <strong>
                    {hasValue ? numericValue : "--"}
                    {hasValue && suffix}
                </strong>
                <span>{label}</span>
            </div>
        </div>
    );
}
function RecoveryMetricChart({
    title,
    data,
    dataKey,
    unit,
    color,
}) {
    const hasData = data.some((day) => day[dataKey] != null);



    return (
        <div className="sleep-recovery-trend-card">
            <h4>{title}</h4>

            {!hasData ? (
                <div className="sleep-history-placeholder">
                    No {title.toLowerCase()} data available.
                </div>
            ) : (
                <div className="sleep-recovery-chart">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{
                                top: 10,
                                right: 12,
                                left: -18,
                                bottom: 0,
                            }}
                        >
                            <CartesianGrid
                                stroke="#29445f"
                                strokeDasharray="3 3"
                                vertical={false}
                            />

                            <XAxis
                                dataKey="label"
                                tick={{ fill: "#91aac5", fontSize: 11 }}
                                axisLine={{ stroke: "#31516e" }}
                                tickLine={false}
                                interval={0}
                            />

                            <YAxis
                                tick={{ fill: "#91aac5", fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                                width={42}
                            />

                            <Tooltip
                                contentStyle={{
                                    background: "#0b1c30",
                                    border: "1px solid #31516e",
                                    borderRadius: "10px",
                                    color: "#edf6ff",
                                }}
                                labelStyle={{ color: "#72d5ff" }}
                                formatter={(value) => [
                                    `${value} ${unit}`,
                                    title,
                                ]}
                            />

                            <Line
                                type="monotone"
                                dataKey={dataKey}
                                name={title}
                                stroke={color}
                                strokeWidth={2.5}
                                dot={{
                                    r: 3,
                                    fill: color,
                                    stroke: "#102640",
                                    strokeWidth: 2,
                                }}
                                activeDot={{ r: 6 }}
                                connectNulls={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
export default function SleepHistory() {
    const today = getToday();

    const [selectedDate, setSelectedDate] = useState(today);
    const [period, setPeriod] = useState("weekly");
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [weeklyData, setWeeklyData] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);

    const [dailyLoading, setDailyLoading] = useState(false);

    const [weeklyLoading, setWeeklyLoading] = useState(false);
    const [monthlyLoading, setMonthlyLoading] = useState(false);

    const [dailyError, setDailyError] = useState("");

    const [weeklyError, setWeeklyError] = useState("");
    const [monthlyError, setMonthlyError] = useState("");

    const trendLoading =
        period === "weekly" ? weeklyLoading : monthlyLoading;

    const trendError =
        period === "weekly" ? weeklyError : monthlyError;

    const weekStart = useMemo(
        () => getMonday(selectedDate),
        [selectedDate]
    );

    const weekDates = useMemo(
        () =>
            Array.from({ length: 7 }, (_, index) =>
                shiftDate(weekStart, index)
            ),
        [weekStart]
    );
    useEffect(() => {
        const controller = new AbortController();

        async function fetchSelectedDay() {
            setDailyLoading(true);
            setDailyError("");

            try {
                const response = await fetch(
                    `http://localhost:5000/api/sleep?date=${selectedDate}`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch sleep details.");
                }

                const data = await response.json();

                setSelectedEntry(data);
            } catch (error) {
                if (error.name !== "AbortError") {
                    setDailyError(error.message);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setDailyLoading(false);
                }
            }
        }

        fetchSelectedDay();

        return () => controller.abort();
    }, [selectedDate]);
    const selectedMonth = selectedDate.slice(0, 7);
    useEffect(() => {
        const controller = new AbortController();

        async function fetchWeeklyData() {
            setWeeklyLoading(true);
            setWeeklyError("");

            try {
                const response = await fetch(
                    `http://localhost:5000/api/sleep/weekly?startDate=${weekStart}`,
                    {
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch weekly sleep data.");
                }

                const data = await response.json();

                setWeeklyData(data.days);
            } catch (error) {
                if (error.name !== "AbortError") {
                    setWeeklyError(error.message);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setWeeklyLoading(false);
                }
            }
        }

        fetchWeeklyData();

        return () => controller.abort();
    }, [weekStart]);

    useEffect(() => {
        if (period !== "monthly") return;

        const controller = new AbortController();

        async function fetchMonthlyData() {
            setMonthlyLoading(true);
            setMonthlyError("");

            try {
                const response = await fetch(
                    `http://localhost:5000/api/sleep/monthly?month=${selectedMonth}`,
                    {
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch monthly sleep data.");
                }

                const data = await response.json();

                setMonthlyData(data.days);
            } catch (error) {
                if (error.name !== "AbortError") {
                    setMonthlyError(error.message);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setMonthlyLoading(false);
                }
            }
        }

        fetchMonthlyData();

        return () => controller.abort();
    }, [period, selectedMonth]);

    const isToday = selectedDate === today;

    function handleDateChange(date) {
        if (date && date <= today) {
            setSelectedDate(date);
        }
    }
    const chartData = useMemo(() => {
        const sourceData = period === "weekly" ? weeklyData : monthlyData;

        return sourceData.map((day) => {
            const date = new Date(`${day.date}T12:00:00`);
            const entry = day.entry;

            return {
                ...day,

                label:
                    period === "weekly"
                        ? date.toLocaleDateString("en-IN", {
                            weekday: "short",
                        })
                        : date.getDate().toString(),

                // Missing records remain null, not zero.
                sleepHours:
                    day.hasEntry && day.durationMinutes != null
                        ? Number((day.durationMinutes / 60).toFixed(2))
                        : null,

                sleepScore: entry?.sleepScore ?? null,
                heartRate: entry?.heartRate ?? null,
                hrv: entry?.hrv ?? null,
                energy: entry?.energy ?? null,
            };
        });
    }, [period, weeklyData, monthlyData]);
    const averageSleepMinutes = useMemo(() => {
        const recordedDays = chartData.filter(
            (day) => day.sleepHours != null
        );

        if (recordedDays.length === 0) return null;

        const totalMinutes = recordedDays.reduce(
            (total, day) => total + day.durationMinutes,
            0
        );

        return Math.round(totalMinutes / recordedDays.length);
    }, [chartData]);

    const sleepStageData = useMemo(() => {
        if (
            !selectedEntry ||
            selectedEntry.awakeMinutes == null ||
            selectedEntry.lightSleepMinutes == null ||
            selectedEntry.deepSleepMinutes == null
        ) {
            return null;
        }

        const stages = [
            {
                name: "Awake",
                minutes: selectedEntry.awakeMinutes,
                color: "#f59e0b",
            },
            {
                name: "Light sleep",
                minutes: selectedEntry.lightSleepMinutes,
                color: "#35bdf2",
            },
            {
                name: "Deep sleep",
                minutes: selectedEntry.deepSleepMinutes,
                color: "#6366f1",
            },
        ];

        const totalMinutes = stages.reduce(
            (total, stage) => total + stage.minutes,
            0
        );

        if (totalMinutes <= 0) return null;

        return {
            totalMinutes,
            stages: stages.map((stage) => ({
                ...stage,
                percentage: (stage.minutes / totalMinutes) * 100,
            })),
        };
    }, [selectedEntry]);

    const sleepInsights = useMemo(() => {
        const recordedDays = chartData.filter(
            (day) => day.hasEntry && day.durationMinutes != null
        );

        if (recordedDays.length === 0) {
            return {
                recordedNights: 0,
                goalAchieved: 0,
                longestSleep: null,
                averageQuality: null,
            };
        }

        const goalAchieved = recordedDays.filter(
            (day) => day.durationMinutes >= 480
        ).length;

        const longestSleep = Math.max(
            ...recordedDays.map((day) => day.durationMinutes)
        );

        const qualityDays = recordedDays.filter(
            (day) => day.quality != null
        );

        const averageQuality =
            qualityDays.length > 0
                ? (
                    qualityDays.reduce(
                        (total, day) => total + day.quality,
                        0
                    ) / qualityDays.length
                ).toFixed(1)
                : null;

        return {
            recordedNights: recordedDays.length,
            goalAchieved,
            longestSleep,
            averageQuality,
        };
    }, [chartData]);
    return (
        <section className="sleep-history">
            {/* Header */}
            <div className="sleep-history-heading">
                <div>
                    <span className="sleep-history-eyebrow">
                        YOUR RECORDS
                    </span>

                    <h2>Sleep History</h2>

                    <p>
                        Explore your sleep patterns and recovery over time.
                    </p>
                </div>

                <CalendarDays size={24} />
            </div>

            {/* Date navigation */}
            <div className="sleep-history-date">
                <button
                    type="button"
                    className="sleep-history-nav"
                    aria-label="Previous day"
                    onClick={() =>
                        setSelectedDate((date) => shiftDate(date, -1))
                    }
                >
                    <ChevronLeft size={19} />
                </button>

                <div className="sleep-history-date-input">
                    <label htmlFor="sleep-history-date">
                        Selected day
                    </label>

                    <input
                        id="sleep-history-date"
                        type="date"
                        value={selectedDate}
                        max={today}
                        onChange={(event) =>
                            handleDateChange(event.target.value)
                        }
                    />
                </div>

                <button
                    type="button"
                    className="sleep-history-nav"
                    aria-label="Next day"
                    disabled={isToday}
                    onClick={() =>
                        setSelectedDate((date) => shiftDate(date, 1))
                    }
                >
                    <ChevronRight size={19} />
                </button>
            </div>

            {/* Selected date label */}
            <div className="sleep-history-date-label">
                <strong>{formatLongDate(selectedDate)}</strong>

                {!isToday && (
                    <button
                        type="button"
                        className="sleep-history-today-button"
                        onClick={() => setSelectedDate(today)}
                    >
                        Today
                    </button>
                )}
            </div>

            {/* Weekly calendar */}
            <div className="sleep-history-week-strip">
                {weekDates.map((date) => {
                    const isSelected = date === selectedDate;
                    const isCurrentDay = date === today;
                    const isFuture = date > today;

                    return (
                        <button
                            key={date}
                            type="button"
                            className={`sleep-history-week-day ${isSelected ? "selected" : ""
                                } ${isCurrentDay ? "current-day" : ""}`}
                            disabled={isFuture}
                            aria-pressed={isSelected}
                            onClick={() => handleDateChange(date)}
                        >
                            <span className="sleep-history-week-name">
                                {new Date(
                                    `${date}T12:00:00`
                                ).toLocaleDateString("en-IN", {
                                    weekday: "short",
                                })}
                            </span>

                            <span className="sleep-history-week-number">
                                {new Date(
                                    `${date}T12:00:00`
                                ).getDate()}
                            </span>

                            <span
                                className={`sleep-history-week-indicator ${weeklyData.find((item) => item.date === date)?.hasEntry
                                    ? "has-entry"
                                    : ""
                                    }`}
                            >
                                {weeklyData.find((item) => item.date === date)?.hasEntry && "•"}
                            </span>
                        </button>
                    );
                })}
            </div>
            {/* Sleep Insights */}
            <section className="sleep-history-section sleep-insights-section">
                <div className="sleep-history-section-heading">
                    <div>
                        <h3>Sleep Insights</h3>
                        <p>
                            A summary of your sleep patterns for this period.
                        </p>
                    </div>
                </div>

                {trendLoading ? (
                    <div className="sleep-history-placeholder">
                        Calculating sleep insights...
                    </div>
                ) : trendError ? (
                    <div className="sleep-history-placeholder sleep-history-error">
                        {trendError}
                    </div>
                ) : sleepInsights.recordedNights === 0 ? (
                    <div className="sleep-history-placeholder">
                        No sleep records available for this period.
                    </div>
                ) : (
                    <div className="sleep-insights-grid">
                        <div className="sleep-insight-card">
                            <span>Average sleep</span>
                            <strong>
                                {averageSleepMinutes != null
                                    ? formatDuration(averageSleepMinutes)
                                    : "--"}
                            </strong>
                            <small>
                                Across {sleepInsights.recordedNights} recorded nights
                            </small>
                        </div>

                        <div className="sleep-insight-card">
                            <span>Sleep goal achieved</span>
                            <strong>
                                {sleepInsights.goalAchieved}/
                                {sleepInsights.recordedNights}
                            </strong>
                            <small>Nights with at least 8 hours of sleep</small>
                        </div>

                        <div className="sleep-insight-card">
                            <span>Longest sleep</span>
                            <strong>
                                {sleepInsights.longestSleep != null
                                    ? formatDuration(sleepInsights.longestSleep)
                                    : "--"}
                            </strong>
                            <small>Your longest recorded night</small>
                        </div>

                        <div className="sleep-insight-card">
                            <span>Average quality</span>
                            <strong>
                                {sleepInsights.averageQuality != null
                                    ? `${sleepInsights.averageQuality}/5`
                                    : "--"}
                            </strong>
                            <small>Self-reported sleep quality</small>
                        </div>
                    </div>
                )}
            </section>

            {/* Trend section */}
            <section className="sleep-history-section">
                <div className="sleep-history-section-heading">
                    <div>
                        <h3>
                            {period === "weekly"
                                ? "Weekly sleep trend"
                                : "Monthly sleep trend"}
                        </h3>

                        <p>
                            Review your sleep duration over time.
                        </p>
                    </div>

                    <div className="sleep-history-period-switch">
                        <button
                            type="button"
                            className={
                                period === "weekly" ? "active" : ""
                            }
                            aria-pressed={period === "weekly"}
                            onClick={() => setPeriod("weekly")}
                        >
                            Weekly
                        </button>

                        <button
                            type="button"
                            className={
                                period === "monthly" ? "active" : ""
                            }
                            aria-pressed={period === "monthly"}
                            onClick={() => setPeriod("monthly")}
                        >
                            Monthly
                        </button>
                    </div>
                </div>

                {trendLoading ? (
                    <div className="sleep-history-placeholder">
                        Loading sleep trends...
                    </div>
                ) : trendError ? (
                    <div className="sleep-history-placeholder sleep-history-error">
                        {trendError}
                    </div>
                ) : (
                    <>
                        <div className="sleep-trend-summary">
                            <div>
                                <strong>
                                    {averageSleepMinutes != null
                                        ? formatDuration(averageSleepMinutes)
                                        : "--"}
                                </strong>
                                <span>Average sleep duration</span>
                            </div>

                            <span className="sleep-trend-target">
                                Target: 8 hours
                            </span>
                        </div>

                        {chartData.some((day) => day.sleepHours != null) ? (
                            <div className="sleep-history-chart">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={chartData}
                                        margin={{
                                            top: 15,
                                            right: 15,
                                            left: 0,
                                            bottom: 5,
                                        }}
                                    >
                                        <CartesianGrid
                                            stroke="#29445f"
                                            strokeDasharray="3 3"
                                            vertical={false}
                                        />

                                        <XAxis
                                            dataKey="label"
                                            tick={{ fill: "#91aac5", fontSize: 12 }}
                                            axisLine={{ stroke: "#31516e" }}
                                            tickLine={false}
                                            interval={period === "monthly" ? 4 : 0}
                                        />

                                        <YAxis
                                            domain={[0, 12]}
                                            ticks={[0, 2, 4, 6, 8, 10, 12]}
                                            tickFormatter={(value) => `${value}h`}
                                            tick={{ fill: "#91aac5", fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={40}
                                        />

                                        <Tooltip
                                            contentStyle={{
                                                background: "#0b1c30",
                                                border: "1px solid #31516e",
                                                borderRadius: "10px",
                                                color: "#edf6ff",
                                            }}
                                            labelStyle={{ color: "#72d5ff" }}
                                            formatter={(value) => [
                                                `${value} hours`,
                                                "Sleep duration",
                                            ]}
                                        />

                                        <ReferenceLine
                                            y={8}
                                            stroke="#53d7f5"
                                            strokeDasharray="5 5"
                                            label={{
                                                value: "8h target",
                                                fill: "#53d7f5",
                                                fontSize: 11,
                                                position: "insideTopRight",
                                            }}
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="sleepHours"
                                            name="Sleep duration"
                                            stroke="#35bdf2"
                                            strokeWidth={3}
                                            dot={{
                                                r: 4,
                                                fill: "#35bdf2",
                                                stroke: "#102640",
                                                strokeWidth: 2,
                                            }}
                                            activeDot={{
                                                r: 7,
                                                fill: "#72d5ff",
                                                stroke: "#102640",
                                                strokeWidth: 2,
                                            }}
                                            connectNulls={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="sleep-history-placeholder">
                                No sleep records available for this period.
                            </div>
                        )}
                    </>
                )}
            </section>


            {/* Selected day details */}
            <section className="sleep-history-section">
                <div className="sleep-history-section-heading">
                    <div>
                        <h3>Sleep details</h3>
                        <p>
                            Your recorded sleep for {formatLongDate(selectedDate)}.
                        </p>
                    </div>
                </div>

                <div className="sleep-details-content">
                    {dailyLoading ? (
                        <p className="sleep-history-message">Loading sleep data...</p>
                    ) : dailyError ? (
                        <p className="sleep-history-error">{dailyError}</p>
                    ) : !selectedEntry ? (
                        <p className="sleep-history-message">
                            No sleep record found for this date.
                        </p>
                    ) : (
                        <div className="sleep-details-grid">
                            <div className="sleep-detail-item">
                                <span>Actual sleep</span>
                                <strong>{formatDuration(selectedEntry.durationMinutes)}</strong>
                            </div>

                            <div className="sleep-detail-item">
                                <span>Time in bed</span>
                                <strong>{formatDuration(selectedEntry.timeInBedMinutes)}</strong>
                            </div>

                            <div className="sleep-detail-item">
                                <span>Bedtime</span>
                                <strong>{selectedEntry.bedtime}</strong>
                            </div>

                            <div className="sleep-detail-item">
                                <span>Wake time</span>
                                <strong>{selectedEntry.wakeTime}</strong>
                            </div>

                            <div className="sleep-detail-item">
                                <span>Sleep quality</span>
                                <strong>{selectedEntry.quality}/5</strong>
                            </div>
                        </div>
                    )}
                </div>
            </section>
            {/* Sleep Stages */}
            <section className="sleep-history-section">
                <div className="sleep-history-section-heading">
                    <div>
                        <h3>Sleep Stages</h3>
                        <p>
                            Understand how your sleep was distributed throughout the night.
                        </p>
                    </div>
                </div>

                {dailyLoading ? (
                    <div className="sleep-history-placeholder">
                        Loading sleep stages...
                    </div>
                ) : dailyError ? (
                    <div className="sleep-history-placeholder sleep-history-error">
                        {dailyError}
                    </div>
                ) : !selectedEntry ? (
                    <div className="sleep-history-placeholder">
                        No sleep record available for this date.
                    </div>
                ) : !sleepStageData ? (
                    <div className="sleep-history-placeholder">
                        Sleep stage data is not available for this night.
                    </div>
                ) : (
                    <div className="sleep-stages-content">
                        <div className="sleep-stages-summary">
                            <span>Total recorded time</span>
                            <strong>
                                {formatDuration(sleepStageData.totalMinutes)}
                            </strong>
                        </div>

                        <div
                            className="sleep-stages-bar"
                            role="img"
                            aria-label="Sleep stage distribution"
                        >
                            {sleepStageData.stages.map((stage) => (
                                <div
                                    key={stage.name}
                                    className="sleep-stage-segment"
                                    style={{
                                        width: `${stage.percentage}%`,
                                        backgroundColor: stage.color,
                                    }}
                                    title={`${stage.name}: ${formatDuration(stage.minutes)}`}
                                />
                            ))}
                        </div>

                        <div className="sleep-stages-legend">
                            {sleepStageData.stages.map((stage) => (
                                <div
                                    key={stage.name}
                                    className="sleep-stage-item"
                                >
                                    <div className="sleep-stage-label">
                                        <span
                                            className="sleep-stage-dot"
                                            style={{
                                                backgroundColor: stage.color,
                                            }}
                                        />
                                        <span>{stage.name}</span>
                                    </div>

                                    <div className="sleep-stage-value">
                                        <strong>
                                            {formatDuration(stage.minutes)}
                                        </strong>
                                        <span>
                                            {stage.percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* Recovery Trends */}
            <section className="sleep-history-section">
                <div className="sleep-history-section-heading">
                    <div>
                        <h3>Recovery Trends</h3>
                        <p>
                            Track how your recovery indicators change over time.
                        </p>
                    </div>
                </div>

                {trendLoading ? (
                    <div className="sleep-history-placeholder">
                        Loading recovery trends...
                    </div>
                ) : trendError ? (
                    <div className="sleep-history-placeholder sleep-history-error">
                        {trendError}
                    </div>
                ) : (
                    <div className="sleep-recovery-trends-grid">
                        <RecoveryMetricChart
                            title="Sleep score"
                            data={chartData}
                            dataKey="sleepScore"
                            unit="/100"
                            color="#35bdf2"
                        />

                        <RecoveryMetricChart
                            title="Heart rate"
                            data={chartData}
                            dataKey="heartRate"
                            unit="BPM"
                            color="#ff7b8b"
                        />

                        <RecoveryMetricChart
                            title="HRV"
                            data={chartData}
                            dataKey="hrv"
                            unit="ms"
                            color="#a78bfa"
                        />

                        <RecoveryMetricChart
                            title="Energy"
                            data={chartData}
                            dataKey="energy"
                            unit="%"
                            color="#55d6a2"
                        />
                    </div>
                )}
            </section>
            <section className="sleep-history-section">
                <div className="sleep-history-section-heading">
                    <div>
                        <h3>Recovery metrics</h3>
                        <p>
                            Physiological indicators recorded during your sleep.
                        </p>
                    </div>
                </div>

                {dailyLoading ? (
                    <div className="sleep-history-placeholder">
                        Loading recovery metrics...
                    </div>
                ) : dailyError ? (
                    <div className="sleep-history-placeholder sleep-history-error">
                        {dailyError}
                    </div>
                ) : !selectedEntry ? (
                    <div className="sleep-history-placeholder">
                        No recovery data available for this date.
                    </div>
                ) : (
                    <div className="sleep-recovery-grid">
                        {/* Sleep Score */}
                        <div className="sleep-recovery-card sleep-recovery-card--ring">
                            <span>Sleep score</span>

                            <CircularMetricRing
                                value={selectedEntry.sleepScore}
                                color="#35bdf2"
                                label="out of 100"
                            />
                        </div>

                        {/* Heart Rate */}
                        <div className="sleep-recovery-card">
                            <span>Heart rate</span>
                            <strong>
                                {selectedEntry.heartRate != null
                                    ? `${selectedEntry.heartRate} BPM`
                                    : "--"}
                            </strong>
                        </div>

                        {/* HRV */}
                        <div className="sleep-recovery-card">
                            <span>HRV</span>
                            <strong>
                                {selectedEntry.hrv != null
                                    ? `${selectedEntry.hrv} ms`
                                    : "--"}
                            </strong>
                        </div>

                        {/* Energy */}
                        <div className="sleep-recovery-card sleep-recovery-card--ring">
                            <span>Energy</span>

                            <CircularMetricRing
                                value={selectedEntry.energy}
                                color="#55d6a2"
                                label="energy level"
                                suffix="%"
                            />
                        </div>
                    </div>
                )}
            </section>
        </section>
    );
}
