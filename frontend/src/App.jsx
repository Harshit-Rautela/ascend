
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
import Nutrition from "./components/nutrition/Nutrition";
import Workouts from "./components/workouts/Workouts";
import Habits from "./components/habits/Habits";

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

        {activePage === "Nutrition" ? (<Nutrition />) :
          activePage === "Workouts" ? (
            <Workouts />
          ) :
            activePage === "Habits" ? (
              <Habits />
            ) : activePage === "Dashboard" ? (
              <>
                {/* Keep all your existing dashboard JSX here, unchanged */}
              </>
            ) : (
              <section className="panel">
                <h2>{activePage}</h2>
                <p>This section is coming soon.</p>
              </section>
            )}


        <footer className="dashboard-footer">
          <span>ASCEND <span className="brand-dot">.</span></span>
          <span>Progress over perfection.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
