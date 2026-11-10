
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  Circle,
  RefreshCw,
  LoaderCircle,
  TrendingUp,
  Target,
  BookOpen,
  Dumbbell,
  Brain,
  Sun,
  Code,
  GraduationCap,
  Droplets,
  Heart,
  Apple,
  Bike,
  Moon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateString) {
  // Construct the date in local time to avoid UTC date shifts.
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function HabitHistory() {
  const [today] = useState(() => getLocalDateString());
  const [selectedDate, setSelectedDate] = useState(() =>
    getLocalDateString()
  );

  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState("");

  const isToday = selectedDate === today;
  const isFutureDate = selectedDate > today;

  const completedCount = useMemo(
    () => habits.filter((habit) => habit.completed).length,
    [habits]
  );

  const totalCount = habits.length;

  const completionPercentage =
    totalCount === 0
      ? 0
      : Math.round((completedCount / totalCount) * 100);

  const latestChartPoint = [...chartData]
    .reverse()
    .find((day) => day.percentage !== null);

  const activeCompletionDays = chartData.filter(
    (day) => day.completed > 0
  ).length;

  const hasChartData = chartData.some(
    (day) => day.percentage !== null
  );

  function formatChartDate(dateString) {
    const date = new Date(`${dateString}T00:00:00`);

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  }

  function formatChartFullDate(dateString) {
    const date = new Date(`${dateString}T00:00:00`);

    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  const fetchHistory = useCallback(async (signal) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/daily?date=${encodeURIComponent(selectedDate)}`,
        { signal }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load habit history.");
      }

      setHabits(Array.isArray(data.habits) ? data.habits : []);
    } catch (err) {
      if (err.name === "AbortError") return;

      setError(err.message || "Unable to load habit history.");
      setHabits([]);
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    const controller = new AbortController();

    fetchHistory(controller.signal);

    return () => controller.abort();
  }, [fetchHistory]);

  function changeDate(offset) {
    const date = new Date(`${selectedDate}T00:00:00`);
    date.setDate(date.getDate() + offset);

    const nextDate = getLocalDateString(date);

    if (nextDate <= today) {
      setSelectedDate(nextDate);
    }
  }

  const fetchChartData = useCallback(async (signal) => {
    setChartLoading(true);
    setChartError("");

    try {
      const response = await fetch(
        `${API_URL}/history/chart`,
        { signal }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to load completion chart."
        );
      }

      setChartData(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      if (err.name === "AbortError") return;

      setChartError(
        err.message || "Unable to load completion chart."
      );
      setChartData([]);
    } finally {
      if (!signal.aborted) {
        setChartLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchChartData(controller.signal);

    return () => controller.abort();
  }, [fetchChartData]);

  function handleDateChange(event) {
    const value = event.target.value;

    if (value && value <= today) {
      setSelectedDate(value);
    }
  }

  return (
    <main className="habit-history-page">
      <header className="habit-history-header">
        <div className="habit-history-heading">
          <div className="habit-history-icon">
            <CalendarDays size={24} />
          </div>

          <div>
            <p className="habit-history-eyebrow">YOUR JOURNEY</p>
            <h1>Habit History</h1>
            <p className="habit-history-subtitle">
              Look back at your daily consistency and progress.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="habit-history-refresh"
          onClick={() => {
            const controller = new AbortController();
            fetchHistory(controller.signal);
          }}
          disabled={loading}
          aria-label="Refresh habit history"
          title="Refresh history"
        >
          <RefreshCw size={18} className={loading ? "is-spinning" : ""} />
          <span>Refresh</span>
        </button>
      </header>

      <section className="habit-history-date-panel">
        <div className="habit-history-date-label">
          <CalendarDays size={19} />
          <div>
            <span className="habit-history-label">SELECT A DATE</span>
            <h2>{formatDisplayDate(selectedDate)}</h2>
          </div>
        </div>

        <div className="habit-history-date-controls">
          <button
            type="button"
            className="habit-history-date-arrow"
            onClick={() => changeDate(-1)}
            aria-label="Previous day"
          >
            <ChevronLeft size={20} />
          </button>

          <input
            type="date"
            className="habit-history-date-input"
            value={selectedDate}
            max={today}
            onChange={handleDateChange}
            aria-label="Choose history date"
          />

          <button
            type="button"
            className="habit-history-date-arrow"
            onClick={() => changeDate(1)}
            disabled={isToday || isFutureDate}
            aria-label="Next day"
          >
            <ChevronRight size={20} />
          </button>

          {!isToday && (
            <button
              type="button"
              className="habit-history-today-button"
              onClick={() => setSelectedDate(today)}
            >
              Today
            </button>
          )}
        </div>
      </section>

      {error && (
        <div className="habit-history-error" role="alert">
          <div>
            <strong>Couldn't load history</strong>
            <p>{error}</p>
          </div>

          <button
            type="button"
            onClick={() => {
              const controller = new AbortController();
              fetchHistory(controller.signal);
            }}
          >
            Try again
          </button>
        </div>
      )}

      <section className="habit-history-summary">
        <div className="habit-history-summary-card">
          <div className="habit-history-summary-top">
            <span className="habit-history-summary-icon">
              <Target size={19} />
            </span>
            <span className="habit-history-summary-label">
              Habits tracked
            </span>
          </div>

          <div className="habit-history-summary-value">
            {loading ? "—" : totalCount}
          </div>

          <p>Habits that existed on this date</p>
        </div>

        <div className="habit-history-summary-card">
          <div className="habit-history-summary-top">
            <span className="habit-history-summary-icon is-completed">
              <Check size={19} />
            </span>
            <span className="habit-history-summary-label">
              Completed
            </span>
          </div>

          <div className="habit-history-summary-value">
            {loading ? "—" : `${completedCount}/${totalCount}`}
          </div>

          <p>Habits marked complete</p>
        </div>

        <div className="habit-history-summary-card">
          <div className="habit-history-summary-top">
            <span className="habit-history-summary-icon is-progress">
              <TrendingUp size={19} />
            </span>
            <span className="habit-history-summary-label">
              Daily completion
            </span>
          </div>

          <div className="habit-history-summary-value">
            {loading ? "—" : `${completionPercentage}%`}
          </div>

          <div className="habit-history-progress-track">
            <div
              className="habit-history-progress-fill"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </section>

      <section className="habit-history-list-section">
        <div className="habit-history-list-heading">
          <div>
            <h2>Daily checklist</h2>
            <p>
              {isToday
                ? "Your habits for today."
                : "Your recorded habit status for this day."}
            </p>
          </div>

          {!loading && (
            <span className="habit-history-count">
              {completedCount} of {totalCount}
            </span>
          )}
        </div>

        {loading ? (
          <div className="habit-history-state">
            <LoaderCircle size={30} className="is-spinning" />
            <p>Loading your history...</p>
          </div>
        ) : error ? (
          <div className="habit-history-state">
            <CalendarDays size={32} />
            <h3>History unavailable</h3>
            <p>Check your connection and try again.</p>
          </div>
        ) : habits.length === 0 ? (
          <div className="habit-history-state">
            <div className="habit-history-empty-icon">
              <CalendarDays size={28} />
            </div>
            <h3>No habits to show</h3>
            <p>
              No active habits existed on this date. Try choosing
              another day.
            </p>
          </div>
        ) : (
          <div className="habit-history-list">
            {habits.map((habit) => {
              const HabitIcon = HABIT_ICONS[habit.icon] || Target;

              return (
                <article
                  className={`habit-history-item ${habit.completed ? "is-completed" : ""
                    }`}
                  key={habit.id}
                >
                  {/* Completion indicator */}
                  <div
                    className={`habit-history-status ${habit.completed ? "is-completed" : ""
                      }`}
                    aria-label={
                      habit.completed ? "Completed" : "Not completed"
                    }
                  >
                    {habit.completed ? (
                      <Check size={18} />
                    ) : (
                      <Circle size={18} />
                    )}
                  </div>

                  {/* Habit-specific icon */}
                  <div className="habit-history-habit-icon">
                    <HabitIcon size={20} />
                  </div>

                  {/* Habit information */}
                  <div className="habit-history-item-content">
                    <h3>{habit.title}</h3>

                    {habit.description && (
                      <p>{habit.description}</p>
                    )}
                  </div>

                  {/* Completion status */}
                  <span
                    className={`habit-history-status-label ${habit.completed ? "is-completed" : ""
                      }`}
                  >
                    {habit.completed ? "Completed" : "Not completed"}
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {/* Habit completion chart */}
      <section className="habit-history-chart-card">

        {/* Header */}
        <div className="habit-history-chart-header">
          <div className="habit-history-chart-title-group">
            <div className="habit-history-chart-icon">
              <TrendingUp size={21} />
            </div>

            <div>
              <h2>Habit completion</h2>
              <p>Track your daily completion performance</p>
            </div>
          </div>

          <div className="habit-history-chart-period">
            <CalendarDays size={15} />
            <span>Last 30 days</span>
          </div>
        </div>

        {/* Summary */}
        <div className="habit-history-chart-summary">

          <div className="habit-history-chart-main-metric">
            <span>Latest completion rate</span>

            <div>
              <strong>
                {chartLoading
                  ? "—"
                  : latestChartPoint
                    ? `${latestChartPoint.percentage}%`
                    : "—"}
              </strong>

              {latestChartPoint && !chartLoading && (
                <span className="habit-history-chart-metric-date">
                  {formatChartDate(latestChartPoint.date)}
                </span>
              )}
            </div>
          </div>

          <div className="habit-history-chart-secondary-metric">
            <div className="habit-history-chart-secondary-icon">
              <TrendingUp size={17} />
            </div>

            <div>
              <strong>
                {chartLoading ? "—" : activeCompletionDays}
              </strong>
              <span>Active completion days</span>
            </div>
          </div>

        </div>

        {/* Chart body */}
        <div className="habit-history-chart-body">

          {chartLoading ? (
            <div className="habit-history-chart-state">
              <LoaderCircle size={25} className="is-spinning" />
              <span>Loading completion history...</span>
            </div>

          ) : chartError ? (
            <div className="habit-history-chart-state habit-history-chart-error">
              <span>{chartError}</span>

              <button
                type="button"
                onClick={() => {
                  const controller = new AbortController();
                  fetchChartData(controller.signal);
                }}
              >
                <RefreshCw size={15} />
                Try again
              </button>
            </div>

          ) : !hasChartData ? (
            <div className="habit-history-chart-state">
              <TrendingUp size={28} />
              <span>No completion history available yet.</span>
              <small>
                Complete a habit to start building your chart.
              </small>
            </div>

          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData.map((day) => ({
                  ...day,
                  label: formatChartDate(day.date),
                }))}
                margin={{
                  top: 12,
                  right: 12,
                  left: -15,
                  bottom: 5,
                }}
              >
                <defs>
                  <linearGradient
                    id="habitCompletionGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#FF9F43"
                      stopOpacity={0.28}
                    />
                    <stop
                      offset="95%"
                      stopColor="#FF9F43"
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="#303949"
                  strokeDasharray="4 5"
                  vertical={false}
                />

                <XAxis
                  dataKey="label"
                  tick={{ fill: "#8E9BAD", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                  minTickGap={15}
                  dy={10}
                />

                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 20, 40, 60, 80, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fill: "#8E9BAD", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  cursor={{
                    stroke: "#FF9F43",
                    strokeDasharray: "4 4",
                  }}
                  labelFormatter={(label, payload) => {
                    const point = payload?.[0]?.payload;
                    return point
                      ? formatChartFullDate(point.date)
                      : label;
                  }}
                  formatter={(value, name, props) => {
                    const point = props.payload;

                    if (value === null || value === undefined) {
                      return ["No eligible habits", "Completion"];
                    }

                    return [
                      `${value}% (${point.completed}/${point.eligible} habits)`,
                      "Completion",
                    ];
                  }}
                  contentStyle={{
                    background: "#202735",
                    border: "1px solid #465064",
                    borderRadius: "10px",
                    color: "#F5F6FA",
                    fontSize: "12px",
                  }}
                  labelStyle={{
                    color: "#AAB6C7",
                    marginBottom: "6px",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="percentage"
                  stroke="#FF9F43"
                  strokeWidth={2.8}
                  fill="url(#habitCompletionGradient)"
                  connectNulls={false}
                  activeDot={{
                    r: 6,
                    fill: "#FF9F43",
                    stroke: "#FFF1E2",
                    strokeWidth: 2,
                  }}
                  dot={false}
                  isAnimationActive
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

        </div>

        {/* Footer */}
        {!chartLoading && !chartError && hasChartData && (
          <div className="habit-history-chart-footer">
            <div className="habit-history-chart-legend">
              <span />
              Daily completion rate
            </div>

            <span>{chartData.length} calendar days</span>
          </div>
        )}

      </section>

      <p className="habit-history-footer-note">
        <span aria-hidden="true">ⓘ</span>
        History is read-only. Your saved completion records won't be
        changed while browsing dates.
      </p>
    </main>
  );
}
