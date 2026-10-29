
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  Flame,
  HeartPulse,
  Scale,
  Sparkles,
  Target,
  TrendingUp,
  GlassWater,
  Plus,
  Weight,
} from "lucide-react";

import DailyQuotes from "./DailyQuotes";
import "./dashboard.css";

const API_BASE_URL = "http://localhost:5000/api";

function getLocalDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatToday() {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function Dashboard() {
  const [habits, setHabits] = useState([]);
  const [weightEntry, setWeightEntry] = useState(null);
  const [workout, setWorkout] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState([]);
  const [waterTotalMl, setWaterTotalMl] = useState(0);
  const [waterGoalMl, setWaterGoalMl] = useState(2500);
  const [waterLoading, setWaterLoading] = useState(true);
  const [waterSaving, setWaterSaving] = useState(false);
  const [waterError, setWaterError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function getJson(url) {
      const response = await fetch(url, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      return response.json();
    }

    async function loadDashboard() {
      const date = getLocalDateString();

      const results = await Promise.allSettled([
        getJson(
          `${API_BASE_URL}/habits/daily?date=${date}`
        ),
        getJson(`${API_BASE_URL}/weight`),
        getJson(`${API_BASE_URL}/workouts?date=${date}`),
      ]);

      if (controller.signal.aborted) return;

      const errors = [];

      if (results[0].status === "fulfilled") {
        const data = results[0].value;
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.habits)
            ? data.habits
            : Array.isArray(data.data)
              ? data.data
              : [];

        setHabits(list.filter((habit) => habit.isActive !== false));
      } else {
        setHabits([]);
        errors.push("habits");
      }

      if (results[1].status === "fulfilled") {
        const data = results[1].value;
        const entries = Array.isArray(data)
          ? data
          : Array.isArray(data.data)
            ? data.data
            : [];

        const sortedEntries = [...entries].sort(
          (a, b) =>
            new Date(b.entryDate).getTime() -
            new Date(a.entryDate).getTime()
        );

        setWeightEntry(sortedEntries[0] ?? null);
      } else {
        setWeightEntry(null);
        errors.push("weight");
      }

      if (results[2].status === "fulfilled") {
        const data = results[2].value;
        setWorkout(data.session ?? data.workout ?? null);
      } else {
        setWorkout(null);
        errors.push("workout");
      }

      setLoadErrors(errors);
      setLoading(false);
    }

    loadDashboard().catch((error) => {
      if (!controller.signal.aborted) {
        console.error("Dashboard loading error:", error);
        setLoadErrors(["dashboard"]);
        setLoading(false);
      }
    });

    return () => controller.abort();
  }, []);
  async function loadWaterIntake(signal) {
    setWaterLoading(true);
    setWaterError("");

    try {
      const date = getLocalDateString();

      const response = await fetch(
        `${API_BASE_URL}/water?date=${date}`,
        { signal }
      );

      if (!response.ok) {
        throw new Error("Could not load water intake.");
      }

      const data = await response.json();

      setWaterTotalMl(data.totalMl ?? 0);
      setWaterGoalMl(data.goalMl ?? 2500);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Water intake error:", error);
        setWaterError("Unable to load water intake.");
      }
    } finally {
      setWaterLoading(false);
    }
  }

  async function addWater(amountMl) {
    if (waterSaving) return;

    setWaterSaving(true);
    setWaterError("");

    try {
      const response = await fetch(`${API_BASE_URL}/water`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amountMl,
          date: getLocalDateString(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Could not save water intake.");
      }

      // Reload the total from the backend after a successful save.
      await loadWaterIntake();
    } catch (error) {
      console.error("Water saving error:", error);
      setWaterError(error.message || "Could not save water intake.");
    } finally {
      setWaterSaving(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();

    loadWaterIntake(controller.signal);

    return () => controller.abort();
  }, []);

  const completedHabits = habits.filter(
    (habit) =>
      habit.completed === true ||
      habit.completedToday === true ||
      habit.isCompleted === true
  ).length;

  const habitPercentage =
    habits.length > 0
      ? Math.round((completedHabits / habits.length) * 100)
      : 0;

  const currentWeight = weightEntry?.weightKg;
  const workoutCompleted = workout?.isCompleted === true;

  const workoutName =
    workout?.name ||
    workout?.title ||
    workout?.workoutName ||
    "Today's workout";

  return (
    <main className="dashboard-content">
      {/* Page header */}
      <header className="dashboard-welcome">
        <div>
          <div className="dashboard-welcome-label">
            <span className="dashboard-live-dot" />
            YOUR PERSONAL FITNESS SPACE
          </div>

          <h1>
            Make today <span>count.</span>
          </h1>

          <p>
            Small wins. Stronger habits. A better you.
          </p>
        </div>

        <div className="dashboard-date">
          <CalendarDays size={17} />
          <span>{formatToday()}</span>
        </div>
      </header>

      {loadErrors.length > 0 && (
        <div className="dashboard-notice" role="status">
          Some dashboard information could not be loaded.
          Your other available information is still shown.
        </div>
      )}

      {/* Overview metrics */}
      <section
        className="dashboard-stats-grid"
        aria-label="Today's overview"
      >
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-top">
            <span className="dashboard-stat-label">
              HABITS COMPLETED
            </span>
            <span className="dashboard-stat-icon lime">
              <CheckCircle2 size={19} />
            </span>
          </div>

          <div className="dashboard-stat-value">
            {loading ? "—" : `${completedHabits}/${habits.length}`}
          </div>

          <div className="dashboard-stat-bottom">
            <span className="dashboard-stat-accent">
              {loading ? "Loading habits" : `${habitPercentage}% complete`}
            </span>
            <div className="dashboard-mini-progress">
              <div
                style={{
                  width: `${loading ? 0 : habitPercentage}%`,
                }}
              />
            </div>
          </div>
        </article>

        <article className="dashboard-stat-card">
          <div className="dashboard-stat-top">
            <span className="dashboard-stat-label">
              ACTIVE HABITS
            </span>
            <span className="dashboard-stat-icon purple">
              <Target size={19} />
            </span>
          </div>

          <div className="dashboard-stat-value">
            {loading ? "—" : habits.length}
          </div>

          <div className="dashboard-stat-caption">
            <Activity size={14} />
            <span>Daily commitments</span>
          </div>
        </article>

        <article className="dashboard-stat-card">
          <div className="dashboard-stat-top">
            <span className="dashboard-stat-label">
              CURRENT WEIGHT
            </span>
            <span className="dashboard-stat-icon blue">
              <Scale size={19} />
            </span>
          </div>

          <div className="dashboard-stat-value">
            {currentWeight != null
              ? Number(currentWeight).toFixed(1)
              : "—"}
            <span className="dashboard-stat-unit">
              {currentWeight != null ? "kg" : ""}
            </span>
          </div>

          <div className="dashboard-stat-caption">
            <Weight size={14} />
            <span>
              {weightEntry?.entryDate
                ? `Latest · ${new Date(
                  `${String(weightEntry.entryDate).slice(0, 10)}T12:00:00`
                ).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}`
                : "No weight entry yet"}
            </span>
          </div>
        </article>

        <article className="dashboard-stat-card dashboard-water-stat">
          <div className="dashboard-stat-top">
            <span className="dashboard-stat-label">
              WATER INTAKE
            </span>

            <span className="dashboard-stat-icon blue">
              <GlassWater size={19} />
            </span>
          </div>

          <div className="dashboard-stat-value">
            {waterLoading
              ? "—"
              : (waterTotalMl / 1000).toFixed(2)}

            <span className="dashboard-stat-unit">
              {waterLoading ? "" : " L"}
            </span>
          </div>

          <div className="dashboard-water-progress">
            <div
              style={{
                width: `${waterLoading || waterGoalMl <= 0
                    ? 0
                    : Math.min(100, (waterTotalMl / waterGoalMl) * 100)
                  }%`,
              }}
            />
          </div>

          <div className="dashboard-water-footer">
            <span>
              {waterLoading
                ? "Loading intake..."
                : `${Math.min(
                  100,
                  Math.round((waterTotalMl / Math.max(waterGoalMl, 1)) * 100)
                )}% of ${(waterGoalMl / 1000).toFixed(1)} L goal`}
            </span>
          </div>

          <div className="dashboard-water-actions">
            {[150, 250, 500].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => addWater(amount)}
                disabled={waterLoading || waterSaving}
                aria-label={`Add ${amount} milliliters of water`}
              >
                <Plus size={13} />
                {amount}
              </button>
            ))}
          </div>

          {waterError && (
            <p className="dashboard-water-error" role="alert">
              {waterError}
            </p>
          )}
        </article>
      </section>

      {/* Main dashboard content */}
      <section className="dashboard-main-grid">
        {/* Daily mission */}
        <article className="dashboard-panel dashboard-mission-card">
          <div className="dashboard-panel-heading">
            <div className="dashboard-panel-heading-icon">
              <Target size={21} />
            </div>

            <div>
              <span className="dashboard-section-eyebrow">
                YOUR DAILY MISSION
              </span>
              <h2>Goals to smash today.</h2>
            </div>
          </div>

          <p className="dashboard-mission-copy">
            You don't need to be perfect. You need to show up.
            Keep the promises you make to yourself, one action at
            a time. That's how real progress is built.
          </p>

          <div className="dashboard-list-heading">
            <span>Today's goals</span>
            <span className="dashboard-list-count">
              {loading ? "LOADING" : `${habits.length} GOALS`}
            </span>
          </div>

          <div className="dashboard-habit-list">
            {loading ? (
              <p className="dashboard-empty-message">
                Preparing your daily mission...
              </p>
            ) : habits.length === 0 ? (
              <p className="dashboard-empty-message">
                No active habits to show today.
              </p>
            ) : (
              habits.map((habit, index) => {
                const completed =
                  habit.completed === true ||
                  habit.completedToday === true ||
                  habit.isCompleted === true;

                return (
                  <div
                    className={`dashboard-habit-row ${completed ? "is-completed" : ""
                      }`}
                    key={habit.id}
                  >
                    <span className="dashboard-habit-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span className="dashboard-habit-title">
                      {habit.title}
                    </span>

                    <span
                      className={`dashboard-habit-status ${completed ? "is-completed" : ""
                        }`}
                    >
                      {completed ? (
                        <>
                          <CheckCircle2 size={14} />
                          Done
                        </>
                      ) : (
                        "To do"
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="dashboard-mission-footer">
            <span>DISCIPLINE OVER MOTIVATION</span>
            <span className="dashboard-footer-dot">·</span>
            <span>ONE DAY AT A TIME</span>
          </div>
        </article>

        {/* Right column */}
        <div className="dashboard-side-column">
          {/* Current weight */}
          <article className="dashboard-panel dashboard-weight-card">
            <div className="dashboard-side-card-heading">
              <span className="dashboard-side-icon blue">
                <Scale size={20} />
              </span>

              <div>
                <h2>Weight check-in</h2>
                <p>Your latest recorded weight</p>
              </div>
            </div>

            <div className="dashboard-weight-display">
              <div>
                <strong>
                  {currentWeight != null
                    ? Number(currentWeight).toFixed(1)
                    : "—"}
                </strong>
                <span>kg</span>
              </div>

              <div className="dashboard-weight-badge">
                <TrendingUp size={15} />
                <span>
                  {weightEntry?.entryDate ? "Latest entry" : "No entry yet"}
                </span>
              </div>
            </div>

            <div className="dashboard-weight-footer">
              <HeartPulse size={15} />
              <span>
                Progress is personal. Focus on your own journey.
              </span>
            </div>
          </article>

          {/* Workout */}
          <article className="dashboard-panel dashboard-workout-card">
            <div className="dashboard-side-card-heading">
              <span className="dashboard-side-icon orange">
                <Dumbbell size={20} />
              </span>

              <div>
                <h2>Your workout</h2>
                <p>Today's training plan</p>
              </div>
            </div>

            <div className="dashboard-workout-body">
              <div className="dashboard-workout-title-row">
                <h3>{workout ? workoutName : "Recovery matters, too."}</h3>
                {workout && (
                  <span
                    className={`dashboard-workout-badge ${workoutCompleted ? "complete" : ""
                      }`}
                  >
                    {workoutCompleted ? "Completed" : "Planned"}
                  </span>
                )}
              </div>

              <p>
                {workout
                  ? workoutCompleted
                    ? "You showed up for yourself. Let that momentum carry forward."
                    : "Your plan is waiting. Focus on good form and consistent effort."
                  : "No workout scheduled today. Rest, recover, and get ready for your next session."}
              </p>
            </div>

            {workout && Array.isArray(workout.exercises) && (
              <div className="dashboard-workout-meta">
                <Dumbbell size={14} />
                <span>
                  {workout.exercises.length} exercises in this session
                </span>
              </div>
            )}
          </article>

          {/* Motivation */}
          <article className="dashboard-panel dashboard-motivation-card">
            <div className="dashboard-motivation-symbol">
              <Flame size={25} />
            </div>

            <span className="dashboard-section-eyebrow">
              THE ASCEND MINDSET
            </span>

            <h2>Consistency beats intensity.</h2>

            <p>
              One meaningful action today. Repeat it tomorrow.
              Let progress compound over time.
            </p>

            <div className="dashboard-motivation-bottom">
              <span>KEEP MOVING FORWARD</span>
              <ArrowUpRight size={18} />
            </div>
          </article>
        </div>
      </section>

      {/* Existing quote component */}
      <section className="dashboard-quote-section">
        <DailyQuotes />
      </section>
    </main>
  );
}

export default Dashboard;
