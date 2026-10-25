
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
} from "lucide-react";
import "./Habits.css";

const API_URL = "http://localhost:5000/api/habits";

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
            {habits.map((habit) => (
              <article
                className={`habit-history-item ${
                  habit.completed ? "is-completed" : ""
                }`}
                key={habit.id}
              >
                <div
                  className={`habit-history-status ${
                    habit.completed ? "is-completed" : ""
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

                <div className="habit-history-item-content">
                  <h3>{habit.title}</h3>
                  {habit.description && <p>{habit.description}</p>}
                </div>

                <span
                  className={`habit-history-status-label ${
                    habit.completed ? "is-completed" : ""
                  }`}
                >
                  {habit.completed ? "Completed" : "Not completed"}
                </span>
              </article>
            ))}
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
