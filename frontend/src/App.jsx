
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  ChartNoAxesCombined,
  Target,
  Settings,
  Search,
  Bell,
  UserRound,
  Flame,
  Moon,
  Droplets,
  Footprints,
  ChevronRight,
  Plus,
} from "lucide-react";
import "./App.css";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import Nutrition from "./components/Nutrition";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Workouts", icon: Dumbbell },
  { label: "Nutrition", icon: Utensils },
  { label: "Progress", icon: ChartNoAxesCombined },
  { label: "Habits", icon: Target },
];

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const [habits, setHabits] = useState([
    { id: 1, title: "Complete a workout", subtitle: "Strength & fitness", icon: Dumbbell, color: "lime", completed: false },
    { id: 2, title: "Meditation", subtitle: "10 minutes of mindfulness", icon: Moon, color: "purple", completed: false },
    { id: 3, title: "Eat mindfully", subtitle: "Stay on track with nutrition", icon: Utensils, color: "blue", completed: false },

  ]);

  const completedHabits = habits.filter((habit) => habit.completed).length;
  const [waterMl, setWaterMl] = useState(0);
  const [waterInput, setWaterInput] = useState("");
  const [waterUnit, setWaterUnit] = useState("L");

  const waterGoalMl = 2500;

  const waterProgress = Math.min(
    (waterMl / waterGoalMl) * 100,
    100
  );

  function addWater() {
    const amount = Number(waterInput);

    if (!Number.isFinite(amount) || amount <= 0) return;

    const amountMl = waterUnit === "L"
      ? amount * 1000
      : amount;

    setWaterMl((current) => current + amountMl);
    setWaterInput("");
  }

  function toggleHabit(id) {
    setHabits((currentHabits) =>
      currentHabits.map((habit) =>
        habit.id === id
          ? { ...habit, completed: !habit.completed }
          : habit
      )
    );
  }

  const [steps, setSteps] = useState("");
  const [stepsLogged, setStepsLogged] = useState(0);
  const [stepsGoal, setStepsGoal] = useState(10000);

  const stepsProgress = Math.min(
    (stepsLogged / stepsGoal) * 100,
    100
  );

  function logSteps(event) {
    event.preventDefault();

    const amount = Number(steps);

    if (!Number.isFinite(amount) || amount < 0 || steps.trim() === "") {
      return;
    }

    setStepsLogged(Math.floor(amount));
    setSteps("");
  }


  const [sleepHours, setSleepHours] = useState("");
  const [sleepLogged, setSleepLogged] = useState(null);

  const sleepGoal = 8;

  const sleepProgress = Math.min(
    ((sleepLogged ?? 0) / sleepGoal) * 100,
    100
  );

  function logSleep(event) {
    event.preventDefault();

    const amount = Number(sleepHours);

    if (
      sleepHours.trim() === "" ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      amount > 24
    ) {
      return;
    }

    setSleepLogged(amount);
    setSleepHours("");
  }


  const [currentWeight, setCurrentWeight] = useState(90);
  const [targetWeight, setTargetWeight] = useState(80);

  const [weightInput, setWeightInput] = useState("");
  const [weightDate, setWeightDate] = useState("");
  const [weightHistory, setWeightHistory] = useState([]);
  const [weightLoading, setWeightLoading] = useState(true);
  const [weightError, setWeightError] = useState("");
  const [weightSaving, setWeightSaving] = useState(false);

  // Load saved weigh-ins from the backend when the app opens.
  useEffect(() => {
    async function fetchWeightHistory() {
      try {
        const response = await fetch("http://localhost:5000/api/weight");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Could not load weight history.");
        }

        const entries = result.data.map((entry) => ({
          id: entry.id,
          weight: entry.weightKg,
          date: entry.entryDate.slice(0, 10),
          notes: entry.notes,
        }));

        setWeightHistory(entries);

        // Use the most recent dated weigh-in, not the last submitted entry.
        if (entries.length > 0) {
          setCurrentWeight(entries[0].weight);
        }
      } catch (error) {
        setWeightError(error.message || "Could not load weight history.");
      } finally {
        setWeightLoading(false);
      }
    }

    fetchWeightHistory();
  }, []);

  const weightRemaining = Math.max(0, currentWeight - targetWeight);

  const weightProgress =
    targetWeight < 90
      ? Math.min(
        100,
        Math.max(0, ((90 - currentWeight) / (90 - targetWeight)) * 100)
      )
      : 0;

  async function logWeight(event) {
    event.preventDefault();
    setWeightError("");

    const weight = Number(weightInput);

    if (
      !Number.isFinite(weight) ||
      weight < 20 ||
      weight > 500 ||
      !weightDate
    ) {
      setWeightError("Enter a valid weight and date.");
      return;
    }

    setWeightSaving(true);

    try {
      const response = await fetch("http://localhost:5000/api/weight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weightKg: weight,
          entryDate: weightDate,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Could not save weight.");
      }

      const entry = {
        id: result.data.id,
        weight: result.data.weightKg,
        date: result.data.entryDate.slice(0, 10),
        notes: result.data.notes,
      };

      setWeightHistory((previous) =>
        [...previous, entry].sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            b.id.localeCompare(a.id)
        )
      );

      // Only update current weight if this is the newest dated entry.
      setCurrentWeight((previousWeight) => {
        const newestEntry = [...weightHistory, entry].sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            b.id.localeCompare(a.id)
        )[0];

        return newestEntry?.weight ?? previousWeight;
      });

      setWeightInput("");
      setWeightDate("");
    } catch (error) {
      setWeightError(error.message || "Could not save weight.");
    } finally {
      setWeightSaving(false);
    }
  }


  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Flame size={23} />
          </div>
          <span>ascend<span className="brand-dot">.</span></span>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                className={`nav-item ${activePage === item.label ? "active" : ""
                  }`}
                onClick={() => setActivePage(item.label)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {activePage === item.label && (
                  <span className="active-indicator" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item">
            <Settings size={19} />
            <span>Settings</span>
          </button>

          <div className="profile-card">
            <div className="avatar">Y</div>
            <div className="profile-info">
              <strong>Your profile</strong>
              <span>Personal journey</span>
            </div>
            <ChevronRight size={17} />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            My workspace <span>/</span> {activePage}
          </div>

          <div className="topbar-actions">
            <button className="icon-button" aria-label="Search">
              <Search size={19} />
            </button>
            <button className="icon-button" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <div className="topbar-avatar">
              <UserRound size={18} />
            </div>
          </div>
        </header>

        <section className="welcome-section">
          <div>
            <div className="eyebrow">
              <span className="status-dot" />
              YOUR PERSONAL GROWTH SPACE
            </div>

            <h1>Build a better <span>you.</span></h1>

            <p>
              Small steps. Consistent effort. Extraordinary progress.
            </p>
          </div>

          <button className="primary-button">
            <Plus size={18} />
            Log activity
          </button>
        </section>

        {activePage==="Nutrition" ? (<Nutrition/>):(
          <>
          <section className="dashboard-grid">

            <article className="metric-card weight-card">
              <div className="card-heading">
                <span>Current weight</span>

                <div className="metric-icon green">
                  <Target size={19} />
                </div>
              </div>

              <div className="metric-value">
                {currentWeight}
                <span> kg</span>
              </div>

              <div className="metric-footer">
                <span>Target: {targetWeight} kg</span>
                <span className="muted-text">
                  {weightRemaining} kg to go
                </span>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill weight-fill"
                  style={{ width: `${weightProgress}%` }}
                />
              </div>

              <div className="weight-progress-labels">
                <span>{Math.round(weightProgress)}% of goal distance</span>
                <span>Weekly tracking</span>
              </div>

              <form className="weight-form" onSubmit={logWeight}>
                <input
                  type="number"
                  min="20"
                  max="500"
                  step="0.1"
                  value={weightInput}
                  onChange={(event) => setWeightInput(event.target.value)}
                  placeholder="Weight in kg"
                  aria-label="Weight in kilograms"
                  required
                />

                <input
                  type="date"
                  value={weightDate}
                  onChange={(event) => setWeightDate(event.target.value)}
                  aria-label="Weigh-in date"
                  required
                />

                <button type="submit" disabled={weightSaving}>
                  {weightSaving ? "Saving..." : "Log weight"}
                </button>

              </form>
              {weightLoading && <p>Loading weight history...</p>}

              {weightError && (
                <p role="alert" className="weight-error">
                  {weightError}
                </p>
              )}

              <div className="card-note">
                Consistency beats perfection.
              </div>
            </article>


            <article className="metric-card">
              {/* <div className="card-heading">
              <span>Daily movement</span>
              <div className="metric-icon purple">
                <Footprints size={19} />
              </div>
            </div>

            <div className="metric-value">
              0 <span>steps</span>
            </div>

            <div className="metric-footer">
              <span>Daily goal</span>
              <span className="muted-text">10,000 steps</span>
            </div>

            <div className="progress-track">
              <div className="progress-fill purple-fill" style={{ width: "0%" }} />
            </div>

            <div className="card-note">Every step counts.</div> */}

              <article className="metric-card movement-card">
                <div className="card-heading">
                  <span>Daily movement</span>
                  <div className="metric-icon purple">
                    <Footprints size={19} />
                  </div>
                </div>

                <div className="metric-value">
                  {stepsLogged.toLocaleString("en-IN")}
                  <span> steps</span>
                </div>

                <div className="metric-footer">
                  <span>Daily goal</span>
                  <span className="muted-text">
                    {stepsGoal.toLocaleString("en-IN")} steps
                  </span>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill purple-fill"
                    style={{ width: `${stepsProgress}%` }}
                  />
                </div>

                <div className="movement-progress-labels">
                  <span>{Math.round(stepsProgress)}% completed</span>
                  <span>
                    {Math.max(0, stepsGoal - stepsLogged).toLocaleString("en-IN")} to go
                  </span>
                </div>

                <form className="movement-form" onSubmit={logSteps}>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={steps}
                    onChange={(event) => setSteps(event.target.value)}
                    placeholder="Enter steps"
                    aria-label="Today's total steps"
                    required
                  />
                  <button type="submit">Update</button>
                </form>
              </article>

            </article>


            <article className="metric-card">
              <div className="card-heading">
                <span>Water intake</span>
                <div className="metric-icon blue">
                  <Droplets size={19} />
                </div>
              </div>

              <div className="metric-value">
                {(waterMl / 1000).toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}
                <span> L</span>
              </div>

              <div className="metric-footer">
                <span>Daily goal</span>
                <span className="muted-text">2.5 L</span>
              </div>

              <div className="water-progress-labels">
                <span>{Math.round(waterProgress)}% completed</span>
                <span>
                  {Math.max(0, (waterGoalMl - waterMl) / 1000).toFixed(2)} L left
                </span>
              </div>

              <form
                className="water-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  addWater();
                }}
              >
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={waterInput}
                  onChange={(event) => setWaterInput(event.target.value)}
                  placeholder="Amount"
                  aria-label="Water amount"
                  required
                />

                <select
                  value={waterUnit}
                  onChange={(event) => setWaterUnit(event.target.value)}
                  aria-label="Water unit"
                >
                  <option value="L">L</option>
                  <option value="mL">mL</option>
                </select>

                <button type="submit" className="water-submit">
                  Add
                </button>
              </form>

            </article>



            <article className="metric-card sleep-card">
              <div className="card-heading">
                <span>Sleep</span>
                <div className="metric-icon orange">
                  <Moon size={19} />
                </div>
              </div>

              <div className="metric-value">
                {sleepLogged === null ? "--" : sleepLogged}
                <span> hrs</span>
              </div>

              <div className="metric-footer">
                <span>Recommended range</span>
                <span className="muted-text">7–9 hours</span>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill sleep-fill"
                  style={{ width: `${sleepProgress}%` }}
                />
              </div>

              <div className="sleep-progress-labels">
                <span>
                  {sleepLogged === null
                    ? "No sleep logged yet"
                    : `${Math.round(sleepProgress)}% of 8-hour target`}
                </span>
                {sleepLogged !== null && (
                  <span>
                    {sleepLogged < 8
                      ? `${(8 - sleepLogged).toFixed(1)} hrs to target`
                      : sleepLogged === 8
                        ? "Target reached"
                        : `${(sleepLogged - 8).toFixed(1)} hrs above target`}
                  </span>
                )}
              </div>

              <form className="sleep-form" onSubmit={logSleep}>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.25"
                  value={sleepHours}
                  onChange={(event) => setSleepHours(event.target.value)}
                  placeholder="Hours slept"
                  aria-label="Hours slept"
                  required
                />
                <button type="submit">Update</button>
              </form>

              <div className="card-note">
                Recovery is part of progress.
              </div>
            </article>

          </section>

          <section className="lower-grid">
            <article className="panel progress-panel">
              <div className="panel-heading">
                <div>
                  <h2>Your progress</h2>
                  <p>Your transformation, one day at a time.</p>
                </div>
                <span className="tag">WEIGHT</span>
              </div>


              {weightLoading ? (
                <div className="empty-chart">
                  <p>Loading your weight history...</p>
                </div>
              ) : weightError && weightHistory.length === 0 ? (
                <div className="empty-chart">
                  <strong>Couldn't load weight history</strong>
                  <p>{weightError}</p>
                </div>
              ) : weightHistory.length === 0 ? (
                <div className="empty-chart">
                  <div className="chart-decoration">
                    <ChartNoAxesCombined size={30} />
                  </div>
                  <strong>Your story starts today</strong>
                  <p>
                    Log your first weigh-in to start building your progress history.
                  </p>
                </div>
              ) : (
                <div className="weight-history-content">
                  <div className="weight-chart">
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart
                        data={[...weightHistory].reverse()}
                        margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
                      >
                        <CartesianGrid
                          stroke="#30352B"
                          strokeDasharray="3 3"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "#A3A3A3", fontSize: 11 }}
                          tickFormatter={(date) =>
                            new Date(`${date}T12:00:00`).toLocaleDateString(
                              "en-IN",
                              { day: "numeric", month: "short" }
                            )
                          }
                        />
                        <YAxis
                          domain={["auto", "auto"]}
                          width={45}
                          tick={{ fill: "#A3A3A3", fontSize: 11 }}
                          tickFormatter={(value) => `${value} kg`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#171A16",
                            border: "1px solid #30352B",
                            borderRadius: "10px",
                            color: "#FFFFFF",
                          }}
                          labelFormatter={(date) =>
                            new Date(`${date}T12:00:00`).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          }
                          formatter={(value) => [
                            `${Number(value).toFixed(1)} kg`,
                            "Weight",
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          name="Weight"
                          stroke="#D2FF5A"
                          strokeWidth={3}
                          dot={{
                            fill: "#D2FF5A",
                            strokeWidth: 2,
                            r: 4,
                          }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="weight-history-heading">
                    <h3>Recent weigh-ins</h3>
                    <span>{weightHistory.length} entries</span>
                  </div>

                  <div className="weight-history-list">
                    {weightHistory.map((entry) => (
                      <div className="weight-history-item" key={entry.id}>
                        <div>
                          <strong>
                            {new Date(`${entry.date}T12:00:00`).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </strong>
                          <span>Weight logged</span>
                        </div>
                        <strong>{Number(entry.weight).toFixed(1)} kg</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </article>

            <article className="panel habits-panel">
              <div className="panel-heading">
                <div>
                  <h2>Daily habits</h2>
                  <p>Show up for yourself.</p>
                </div>
                <span className="habit-count">
                  {completedHabits} / {habits.length}
                </span>
              </div>


              <div className="habit-list">
                {habits.map((habit) => {
                  const Icon = habit.icon;

                  return (
                    <div
                      className={`habit-item ${habit.completed ? "completed" : ""}`}
                      key={habit.id}
                    >
                      <div className={`habit-icon ${habit.color}`}>
                        <Icon size={18} />
                      </div>

                      <div className="habit-info">
                        <strong>{habit.title}</strong>
                        <span>{habit.subtitle}</span>
                      </div>

                      <button
                        className={`habit-checkbox ${habit.completed ? "checked" : ""}`}
                        onClick={() => toggleHabit(habit.id)}
                        aria-label={`Mark ${habit.title} ${habit.completed ? "incomplete" : "complete"
                          }`}
                        aria-pressed={habit.completed}
                      >
                        {habit.completed && <span>✓</span>}
                      </button>
                    </div>
                  );
                })}
              </div>


              <button
                className="view-all-button"
                onClick={() => setActivePage("Habits")}
              >
                View all habits <ChevronRight size={16} />
              </button>
            </article>
          </section>
        </>)}

        <footer className="dashboard-footer">
          <span>ASCEND <span className="brand-dot">.</span></span>
          <span>Progress over perfection.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
