import { useEffect, useState } from "react";
import { Plus, Dumbbell, Flame, Target } from "lucide-react";
import DailyQuotes from "./DailyQuotes";
import "./dashboard.css";

export default function Dashboard() {
    const [weight, setWeight] = useState(null);
    const [weightLoading, setWeightLoading] = useState(true);
    const [weightError, setWeightError] = useState("");
    const [workout, setWorkout] = useState(null);
    const [workoutLoading, setWorkoutLoading] = useState(true);
    const [workoutError, setWorkoutError] = useState("");
    const [habitStats, setHabitStats] = useState({
        completed: 0,
        total: 0,
    });
    const [habitsLoading, setHabitsLoading] = useState(true);
    const [habitsError, setHabitsError] = useState("");

    useEffect(() => {
        async function loadWeight() {
            try {
                const response = await fetch("http://localhost:5000/api/weight");
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Could not load weight.");
                }

                const entries = result.data ?? [];

                // The API returns weight history; select the newest dated entry.
                const latestEntry = entries.reduce((latest, entry) => {
                    if (!latest) return entry;

                    const entryDate = entry.entryDate.slice(0, 10);
                    const latestDate = latest.entryDate.slice(0, 10);

                    return entryDate > latestDate ? entry : latest;
                }, null);

                setWeight(latestEntry?.weightKg ?? null);
            } catch (error) {
                setWeightError(error.message || "Could not load weight.");
            } finally {
                setWeightLoading(false);
            }
        }

        loadWeight();
    }, []);
    useEffect(() => {
        async function loadTodayHabits() {
            try {
                // Build today's local calendar date as YYYY-MM-DD.
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, "0");
                const day = String(now.getDate()).padStart(2, "0");
                const today = `${year}-${month}-${day}`;

                const response = await fetch(
                    `http://localhost:5000/api/habits/daily?date=${today}`
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error || "Could not load today's habits."
                    );
                }

                const habits = result.habits ?? [];

                const completed = habits.filter(
                    (habit) => habit.completed
                ).length;

                setHabitStats({
                    completed,
                    total: habits.length,
                });
            } catch (error) {
                setHabitsError(
                    error.message || "Could not load today's habits."
                );
            } finally {
                setHabitsLoading(false);
            }
        }

        loadTodayHabits();
    }, []);
    useEffect(() => {
        async function loadTodayWorkout() {
            try {
                // Use the user's local calendar date, not UTC.
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, "0");
                const day = String(now.getDate()).padStart(2, "0");
                const today = `${year}-${month}-${day}`;

                const response = await fetch(
                    `http://localhost:5000/api/workouts?date=${today}`
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error || "Could not load today's workout."
                    );
                }

                setWorkout(result.session ?? null);
            } catch (error) {
                setWorkoutError(
                    error.message || "Could not load today's workout."
                );
            } finally {
                setWorkoutLoading(false);
            }
        }

        loadTodayWorkout();
    }, []);
    return (
        <div className="dashboard-content">
            <section className="dashboard-hero">
                <div>
                    <span className="dashboard-eyebrow">
                        YOUR PERSONAL GROWTH SPACE
                    </span>

                    <h1>
                        Build a better <span>you.</span>
                    </h1>

                    <p>
                        Small steps. Consistent effort. Extraordinary progress.
                    </p>
                </div>

                <button className="primary-button">
                    <Plus size={18} />
                    Log activity
                </button>
            </section>

            <DailyQuotes />

            <section className="dashboard-placeholder-grid">
                <article className="dashboard-placeholder-card">
                    <Dumbbell size={22} />

                    <h3>Today's workout</h3>

                    {workoutLoading ? (
                        <p>Loading workout...</p>
                    ) : workoutError ? (
                        <p role="alert">{workoutError}</p>
                    ) : !workout ? (
                        <>
                            <p>No workout saved for today yet.</p>
                            <span className="dashboard-workout-status">
                                Not started
                            </span>
                        </>
                    ) : (
                        <>
                            <p>
                                {workout.exercises.length}{" "}
                                {workout.exercises.length === 1
                                    ? "exercise"
                                    : "exercises"}{" "}
                                saved
                            </p>

                            <span className="dashboard-workout-status">
                                {workout.status === "COMPLETED"
                                    ? "Completed"
                                    : workout.status === "IN_PROGRESS"
                                        ? "In progress"
                                        : workout.status}
                            </span>

                            <p>
                                {workout.exercises.reduce(
                                    (total, exercise) =>
                                        total +
                                        exercise.sets.filter(
                                            (set) => set.isCompleted
                                        ).length,
                                    0
                                )}{" "}
                                sets completed
                            </p>
                        </>
                    )}
                </article>

                <article className="dashboard-placeholder-card">
                    <Target size={22} />

                    <h3>Daily habits</h3>

                    {habitsLoading ? (
                        <p>Loading habits...</p>
                    ) : habitsError ? (
                        <p role="alert">{habitsError}</p>
                    ) : habitStats.total === 0 ? (
                        <p>No active habits yet.</p>
                    ) : (
                        <>
                            <p className="dashboard-metric-value">
                                {habitStats.completed}
                                <span> / {habitStats.total}</span>
                            </p>

                            <p>Habits completed today</p>

                            <div
                                className="dashboard-habit-progress"
                                role="progressbar"
                                aria-label="Today's habit completion"
                                aria-valuemin={0}
                                aria-valuemax={habitStats.total}
                                aria-valuenow={habitStats.completed}
                            >
                                <div
                                    className="dashboard-habit-progress-fill"
                                    style={{
                                        width: `${(habitStats.completed /
                                                habitStats.total) *
                                            100
                                            }%`,
                                    }}
                                />
                            </div>

                            <p className="dashboard-habit-percentage">
                                {Math.round(
                                    (habitStats.completed / habitStats.total) * 100
                                )}% completed
                            </p>
                        </>
                    )}
                </article>

                <article className="dashboard-placeholder-card">
                    <Flame size={22} />
                    <h3>Daily progress</h3>
                    <p>Your fitness progress will appear here.</p>
                </article>
                <article className="dashboard-placeholder-card">
                    <h3>Current weight</h3>

                    {weightLoading ? (
                        <p>Loading weight...</p>
                    ) : weightError ? (
                        <p role="alert">{weightError}</p>
                    ) : weight === null ? (
                        <p>Not logged yet</p>
                    ) : (
                        <p className="dashboard-metric-value">
                            {weight} <span>kg</span>
                        </p>
                    )}
                </article>
            </section>
        </div>
    );
}
