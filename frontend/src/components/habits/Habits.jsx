
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Target,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  LoaderCircle,
  LayoutDashboard,
  CalendarDays,
  ChartNoAxesCombined,
  Flame,
  Check,
  Circle,
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
import "./Habits.css";
import HabitHistory from "./HabitHistory.jsx"
import HabitConsistency from "./HabitConsistency.jsx";
import API_BASE_URL from "../../config/api";

const API_URL = `${API_BASE_URL}/habits`;


const HABIT_ICONS = [
  { name: "target", label: "Goals", component: Target },
  { name: "book-open", label: "Reading", component: BookOpen },
  { name: "dumbbell", label: "Fitness", component: Dumbbell },
  { name: "brain", label: "Learning", component: Brain },
  { name: "sun", label: "Morning", component: Sun },
  { name: "code", label: "Coding", component: Code },
  { name: "graduation-cap", label: "Study", component: GraduationCap },
  { name: "droplets", label: "Water", component: Droplets },
  { name: "heart", label: "Health", component: Heart },
  { name: "apple", label: "Nutrition", component: Apple },
  { name: "bike", label: "Cycling", component: Bike },
  { name: "moon", label: "Sleep", component: Moon },
];

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Habits() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completionUpdatingId, setCompletionUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activeTab, setActiveTab] = useState("Overview");
  const [selectedIcon, setSelectedIcon] = useState("target");
  const [today] = useState(() => getLocalDateString());

  const habitTabs = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "History", icon: CalendarDays },
    { label: "Consistency", icon: ChartNoAxesCombined },
    { label: "Streaks", icon: Flame },
  ];

  const completedCount = useMemo(
    () => habits.filter((habit) => habit.completed).length,
    [habits]
  );

  const completionPercent =
    habits.length === 0
      ? 0
      : Math.round((completedCount / habits.length) * 100);

  const fetchHabits = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/daily?date=${encodeURIComponent(today)}`
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not load today's habits.");
      }

      setHabits(result.habits);
    } catch (err) {
      setError(err.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  function openAddForm() {
    setEditingHabit(null);
    setTitle("");
    setDescription("");
    setSelectedIcon("target");

    setError("");
    setFormOpen(true);
  }

  function openEditForm(habit) {
    setEditingHabit(habit);
    setTitle(habit.title);
    setDescription(habit.description || "");
    setSelectedIcon(habit.icon || "target");
    setError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingHabit(null);
    setTitle("");
    setDescription("");
    setSelectedIcon("target");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Please enter a habit name.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const isEditing = Boolean(editingHabit);

      const response = await fetch(
        isEditing ? `${API_URL}/${editingHabit.id}` : API_URL,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            icon: selectedIcon,

          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save habit.");
      }

      closeForm();
      await fetchHabits();
    } catch (err) {
      setError(err.message || "Could not save habit.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(habit) {
    const confirmed = window.confirm(
      `Delete "${habit.title}"? This will permanently delete its completion history too.`
    );

    if (!confirmed) return;

    setError("");

    try {
      const response = await fetch(`${API_URL}/${habit.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not delete habit.");
      }

      setHabits((current) =>
        current.filter((item) => item.id !== habit.id)
      );
    } catch (err) {
      setError(err.message || "Could not delete habit.");
    }
  }

  async function handleToggleCompletion(habit) {
    if (completionUpdatingId) return;

    setCompletionUpdatingId(habit.id);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/${habit.id}/completions${habit.completed ? `?date=${encodeURIComponent(today)}` : ""
        }`,
        habit.completed
          ? { method: "DELETE" }
          : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: today }),
          }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Could not update habit completion."
        );
      }

      setHabits((current) =>
        current.map((item) =>
          item.id === habit.id
            ? { ...item, completed: !habit.completed }
            : item
        )
      );
    } catch (err) {
      setError(err.message || "Could not update habit completion.");
    } finally {
      setCompletionUpdatingId(null);
    }
  }

  function renderOverview() {
    if (loading) {
      return (
        <div className="habits-state">
          <LoaderCircle className="habits-spinner" size={26} />
          <p>Loading today's habits...</p>
        </div>
      );
    }

    if (habits.length === 0) {
      return (
        <div className="habits-empty">
          <div className="habits-empty-icon">
            <Target size={30} />
          </div>

          <h3>Start building better habits</h3>

          <p>
            Add your first habit and begin building a routine that works
            for you.
          </p>

          <button
            type="button"
            className="habits-primary-button"
            onClick={openAddForm}
          >
            <Plus size={18} />
            Create your first habit
          </button>
        </div>
      );
    }

    return (
      <div className="habits-grid">

        {habits.map((habit) => {
          const updating = completionUpdatingId === habit.id;
          const selectedHabitIcon =
            HABIT_ICONS.find((item) => item.name === habit.icon) ||
            HABIT_ICONS[0];

          const HabitIcon = selectedHabitIcon.component;

          return (
            <article
              className={`habit-card ${habit.completed ? "habit-card-completed" : ""
                }`}
              key={habit.id}
            >
              {/* Card header */}
              <div className="habit-card-top">
                <div className="habit-card-icon">
                  <HabitIcon size={21} />
                </div>

                <div className="habit-card-actions">
                  <button
                    type="button"
                    onClick={() => openEditForm(habit)}
                    aria-label={`Edit ${habit.title}`}
                    title="Edit habit"
                  >
                    <Pencil size={17} />
                  </button>

                  <button
                    type="button"
                    className="habit-delete-button"
                    onClick={() => handleDelete(habit)}
                    aria-label={`Delete ${habit.title}`}
                    title="Delete habit"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>

              {/* Habit information */}
              <div className="habit-card-content">
                <h3>{habit.title}</h3>

                <p className="habit-card-description">
                  {habit.description || "No description added yet."}
                </p>
              </div>

              {/* Completion section */}
              <div className="habit-card-bottom">

                <div
                  className={`habit-card-status ${habit.completed ? "is-completed" : "is-pending"
                    }`}
                >
                  <span className="habit-card-status-dot" />

                  <span>
                    {habit.completed ? "Completed today" : "Not completed yet"}
                  </span>
                </div>

                <button
                  type="button"
                  className={`habit-completion-button ${habit.completed ? "completed" : ""
                    }`}
                  onClick={() => handleToggleCompletion(habit)}
                  disabled={Boolean(completionUpdatingId)}
                  aria-pressed={habit.completed}
                >
                  {updating ? (
                    <LoaderCircle className="habits-spinner" size={17} />
                  ) : habit.completed ? (
                    <Check size={17} />
                  ) : (
                    <Circle size={17} />
                  )}

                  {updating
                    ? "Saving..."
                    : habit.completed
                      ? "Undo completion"
                      : "Mark complete"}
                </button>

              </div>
            </article>
          );
        })}

      </div>
    );
  }

  return (
    <section className="habits-page">
      <div className="habits-heading">
        <div>
          <div className="habits-eyebrow">
            <Target size={15} />
            DAILY ROUTINES
          </div>

          <h2>Your habits</h2>

          <p>
            Small actions, repeated consistently, create lasting change.
          </p>
        </div>

        <button
          className="habits-primary-button"
          onClick={openAddForm}
          type="button"
        >
          <Plus size={18} />
          Add habit
        </button>
      </div>

      <nav className="habits-tabs" aria-label="Habits navigation">
        {habitTabs.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            className={`habits-tab ${activeTab === label ? "active" : ""
              }`}
            onClick={() => setActiveTab(label)}
            aria-current={activeTab === label ? "page" : undefined}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {activeTab === "Overview" && (
        <>

          <div className="habits-overview-dashboard">

            {/* Daily circular progress */}
            <div className="habits-daily-progress">

              <div className="habits-progress-ring-wrapper">
                <div
                  className="habits-progress-ring"
                  style={{
                    "--progress": `${completionPercent}%`,
                  }}
                  role="progressbar"
                  aria-label="Today's habit completion"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={completionPercent}
                >
                  <div className="habits-progress-ring-inner">
                    <strong>{completionPercent}%</strong>
                    <span>Completed</span>
                  </div>
                </div>
              </div>

              <div className="habits-daily-progress-content">
                <span className="habits-dashboard-eyebrow">
                  DAILY OVERVIEW
                </span>

                <h3>Today's progress</h3>

                <p>
                  {completedCount} of {habits.length} habits completed
                </p>

                <span className="habits-progress-message">
                  {habits.length === 0
                    ? "Add your first habit to get started."
                    : completionPercent === 100
                      ? "Amazing! You've completed all your habits."
                      : completionPercent >= 70
                        ? "Great progress. You're almost there!"
                        : completionPercent >= 40
                          ? "Keep going. Every small action counts."
                          : "A fresh day is another opportunity to improve."}
                </span>
              </div>

              <button
                className="habits-refresh-button"
                type="button"
                onClick={fetchHabits}
                disabled={loading}
                aria-label="Refresh habits"
                title="Refresh habits"
              >
                <RefreshCw size={17} />
              </button>

            </div>

            {/* Daily statistics */}
            <div className="habits-overview-stats">

              <div className="habits-stat-card">
                <span>Total habits</span>
                <strong>{habits.length}</strong>
                <Target size={19} />
              </div>

              <div className="habits-stat-card">
                <span>Completed</span>
                <strong>{completedCount}</strong>
                <Check size={19} />
              </div>

              <div className="habits-stat-card">
                <span>Remaining</span>
                <strong>{habits.length - completedCount}</strong>
                <Circle size={19} />
              </div>

            </div>

          </div>


          {renderOverview()}
        </>
      )}

      {activeTab === "History" && <HabitHistory />
      }

      {activeTab === "Consistency" && <HabitConsistency />}

      {activeTab === "Streaks" && (
        <section className="habits-placeholder">
          <Flame size={28} />
          <h2>Your streaks</h2>
          <p>Track your current and longest habit streaks.</p>
        </section>
      )}

      {error && (
        <div className="habits-error" role="alert">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {formOpen && (
        <div
          className="habits-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              closeForm();
            }
          }}
        >
          <section
            className="habits-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="habit-form-title"
          >
            <div className="habits-modal-heading">
              <div>
                <span className="habits-eyebrow">
                  HABIT MANAGEMENT
                </span>

                <h3 id="habit-form-title">
                  {editingHabit ? "Edit habit" : "Create a habit"}
                </h3>
              </div>

              <button
                type="button"
                className="habits-modal-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label htmlFor="habit-title">Habit name</label>

              <input
                id="habit-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Read for 20 minutes"
                maxLength={120}
                required
                autoFocus
              />

              <label htmlFor="habit-description">
                Description <span>(optional)</span>
              </label>

              <textarea
                id="habit-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What do you want to achieve?"
                rows={3}
                maxLength={500}
              />
              <div className="habit-icon-picker">
                <div className="habit-icon-picker-heading">
                  <label>Choose an icon</label>
                  <span>Select an icon that represents your habit.</span>
                </div>

                <div className="habit-icon-options">
                  {HABIT_ICONS.map((iconItem) => {
                    const IconComponent = iconItem.component;
                    const isSelected = selectedIcon === iconItem.name;

                    return (
                      <button
                        key={iconItem.name}
                        type="button"
                        className={`habit-icon-option ${isSelected ? "selected" : ""
                          }`}
                        onClick={() => setSelectedIcon(iconItem.name)}
                        disabled={saving}
                        aria-label={`Select ${iconItem.label} icon`}
                        aria-pressed={isSelected}
                        title={iconItem.label}
                      >
                        <IconComponent size={21} />
                        <span>{iconItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="habits-modal-actions">
                <button
                  type="button"
                  className="habits-secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="habits-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingHabit
                      ? "Save changes"
                      : "Create habit"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

export default Habits;
