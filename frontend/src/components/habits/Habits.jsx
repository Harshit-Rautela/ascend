
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
} from "lucide-react";
import "./Habits.css";
import HabitHistory from "./HabitHistory.jsx"

const API_URL = "http://localhost:5000/api/habits";

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
    setError("");
    setFormOpen(true);
  }

  function openEditForm(habit) {
    setEditingHabit(habit);
    setTitle(habit.title);
    setDescription(habit.description || "");
    setError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingHabit(null);
    setTitle("");
    setDescription("");
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
        `${API_URL}/${habit.id}/completions${
          habit.completed ? `?date=${encodeURIComponent(today)}` : ""
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

          return (
            <article
              className={`habit-card ${
                habit.completed ? "habit-card-completed" : ""
              }`}
              key={habit.id}
            >
              <div className="habit-card-top">
                <div className="habit-card-icon">
                  {habit.completed ? (
                    <Check size={21} />
                  ) : (
                    <Target size={21} />
                  )}
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

              <h3>{habit.title}</h3>

              <p className="habit-card-description">
                {habit.description || "No description added yet."}
              </p>

              <div className="habit-card-footer">
                <span className="habit-active-dot" />
                {habit.completed
                  ? "Completed today"
                  : "Not completed yet"}
              </div>

              <button
                type="button"
                className={`habit-completion-button ${
                  habit.completed ? "completed" : ""
                }`}
                onClick={() => handleToggleCompletion(habit)}
                disabled={Boolean(completionUpdatingId)}
                aria-pressed={habit.completed}
              >
                {updating ? (
                  <LoaderCircle
                    className="habits-spinner"
                    size={17}
                  />
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
            className={`habits-tab ${
              activeTab === label ? "active" : ""
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
          <div className="habits-summary">
            <div className="habits-summary-icon">
              <Target size={22} />
            </div>

            <div className="habits-summary-copy">
              <span>Today's progress</span>
              <strong>
                {completedCount} of {habits.length} completed
              </strong>
            </div>

            <span className="habits-progress-percent">
              {completionPercent}%
            </span>

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

            <div
              className="habits-progress-track"
              role="progressbar"
              aria-label="Today's habit completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completionPercent}
            >
              <div
                className="habits-progress-fill"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>

          {renderOverview()}
        </>
      )}

      {activeTab === "History" && <HabitHistory/>
      }

      {activeTab === "Consistency" && (
        <section className="habits-placeholder">
          <ChartNoAxesCombined size={28} />
          <h2>Consistency</h2>
          <p>Explore your weekly and monthly completion patterns.</p>
        </section>
      )}

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
