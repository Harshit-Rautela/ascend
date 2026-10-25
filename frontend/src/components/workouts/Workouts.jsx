
import { useState } from "react";
import {
  CalendarDays,
  NotebookPen,
  ChartNoAxesCombined,
  Library,
} from "lucide-react";
import ExerciseLibrary from "./ExerciseLibrary";
import WeeklySchedule from "./WeeklySchedule";
import WorkoutLog from "./WorkoutLog";
import "./workouts.css";

const tabs = [
  { id: "plan", label: "Weekly Plan", icon: CalendarDays },
  { id: "log", label: "Workout Log", icon: NotebookPen },
  { id: "performance", label: "Performance", icon: ChartNoAxesCombined },
  { id: "exercises", label: "Exercises", icon: Library },
];

function Workouts() {
  const [activeTab, setActiveTab] = useState("plan");

  function renderActiveTab() {
    switch (activeTab) {
      case "plan":
        return <WeeklySchedule />;

      case "log":
        return <WorkoutLog/>

      case "performance":
        return (
          <div className="workouts-placeholder">
            <ChartNoAxesCombined size={30} />
            <h2>Performance</h2>
            <p>
              Track exercise progress, strength improvements, and
              your training history.
            </p>
            <span>Coming next</span>
          </div>
        );

      case "exercises":
        return  <ExerciseLibrary />;;

      default:
        return <WeeklySchedule />;
    }
  }

  return (
    <section className="workouts-container">
      <nav className="workouts-tabs" aria-label="Workout sections">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`workouts-tab ${
              activeTab === id ? "active" : ""
            }`}
            onClick={() => setActiveTab(id)}
            aria-current={activeTab === id ? "page" : undefined}
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="workouts-tab-content">
        {renderActiveTab()}
      </div>
    </section>
  );
}

export default Workouts;
