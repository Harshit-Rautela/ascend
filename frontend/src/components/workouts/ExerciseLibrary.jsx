
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Plus,
  Dumbbell,
  RefreshCw,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import "./workouts.css";

const API_URL = "http://localhost:5000/api/exercise";

const categories = [
  { label: "Strength", value: "STRENGTH" },
  { label: "Cardio", value: "CARDIO" },
  { label: "Mobility", value: "MOBILITY" },
  { label: "Other", value: "OTHER" },
];

const measurementTypes = [
  { label: "Weight & reps", value: "WEIGHT_REPS" },
  { label: "Bodyweight reps", value: "BODYWEIGHT_REPS" },
  { label: "Duration", value: "DURATION" },
  { label: "Distance", value: "DISTANCE" },
  { label: "Cardio", value: "CARDIO" },
];

const formatLabel = (value = "") =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

function ExerciseLibrary() {
  const [exercises, setExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add exercise state
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "STRENGTH",
    equipment: "",
    measurementType: "WEIGHT_REPS",
    description: "",
  });

  // Edit exercise state
  const [editingExercise, setEditingExercise] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Delete exercise state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Fetch exercises
  const loadExercises = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load exercises.");
      }

      setExercises(data.exercises || []);
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  // Search and category filtering
  const filteredExercises = exercises.filter((exercise) => {
    const query = searchTerm.trim().toLowerCase();

    const matchesSearch = [
      exercise.name,
      exercise.equipment,
      exercise.description,
    ].some((value) => value?.toLowerCase().includes(query));

    const matchesCategory =
      activeCategory === "ALL" ||
      exercise.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  // ---------------- ADD EXERCISE ----------------

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function openForm() {
    setFormError("");
    setSuccessMessage("");

    setForm({
      name: "",
      category: "STRENGTH",
      equipment: "",
      measurementType: "WEIGHT_REPS",
      description: "",
    });

    setShowForm(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!form.name.trim()) {
      setFormError("Exercise name is required.");
      return;
    }

    if (form.name.trim().length > 100) {
      setFormError("Exercise name cannot exceed 100 characters.");
      return;
    }

    if (form.equipment.trim().length > 100) {
      setFormError("Equipment cannot exceed 100 characters.");
      return;
    }

    if (form.description.trim().length > 500) {
      setFormError("Description cannot exceed 500 characters.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          equipment: form.equipment.trim() || null,
          description: form.description.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create exercise."
        );
      }

      setShowForm(false);
      setSuccessMessage(
        `${data.exercise.name} added successfully.`
      );

      await loadExercises();
    } catch (err) {
      setFormError(
        err.message || "Unable to create exercise."
      );
    } finally {
      setSaving(false);
    }
  }

  // ---------------- EDIT EXERCISE ----------------

  function openEditModal(exercise) {
    setEditingExercise(exercise);

    setEditForm({
      name: exercise.name,
      category: exercise.category,
      equipment: exercise.equipment || "",
      measurementType: exercise.measurementType,
      description: exercise.description || "",
    });

    setEditError("");
    setSuccessMessage("");
  }

  function updateEditField(event) {
    const { name, value } = event.target;

    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    setEditError("");

    if (!editForm.name.trim()) {
      setEditError("Exercise name is required.");
      return;
    }

    if (editForm.name.trim().length > 100) {
      setEditError("Exercise name cannot exceed 100 characters.");
      return;
    }

    if (editForm.equipment.trim().length > 100) {
      setEditError("Equipment cannot exceed 100 characters.");
      return;
    }

    if (editForm.description.trim().length > 500) {
      setEditError("Description cannot exceed 500 characters.");
      return;
    }

    setEditSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/${editingExercise.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...editForm,
            name: editForm.name.trim(),
            equipment: editForm.equipment.trim() || null,
            description: editForm.description.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update exercise."
        );
      }

      // Update the changed exercise without refetching everything.
      setExercises((previous) =>
        previous.map((exercise) =>
          exercise.id === data.exercise.id
            ? data.exercise
            : exercise
        )
      );

      setEditingExercise(null);
      setSuccessMessage(
        `${data.exercise.name} updated successfully.`
      );
    } catch (err) {
      setEditError(
        err.message || "Unable to update exercise."
      );
    } finally {
      setEditSaving(false);
    }
  }

  // ---------------- DELETE EXERCISE ----------------

  async function handleDelete() {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    setDeleteError("");

    try {
      const response = await fetch(
        `${API_URL}/${deleteTarget.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete exercise."
        );
      }

      setExercises((previous) =>
        previous.filter(
          (exercise) => exercise.id !== deleteTarget.id
        )
      );

      setSuccessMessage(
        `${deleteTarget.name} deleted successfully.`
      );

      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(
        err.message || "Unable to delete exercise."
      );
    } finally {
      setDeleting(false);
    }
  }

  // ---------------- RENDER ----------------

  return (
    <section className="exercise-library">
      <div className="exercise-library-header">
        <div>
          <p className="exercise-eyebrow">TRAINING DATABASE</p>
          <h2>Exercise Library</h2>
          <p className="exercise-subtitle">
            Find exercises and build your training routine.
          </p>
        </div>

        <button
          type="button"
          className="exercise-add-button"
          onClick={openForm}
        >
          <Plus size={18} />
          Add Exercise
        </button>
      </div>

      {successMessage && (
        <p className="exercise-success-message" role="status">
          {successMessage}
        </p>
      )}

      {/* ADD EXERCISE MODAL */}
      {showForm && (
        <div className="exercise-form-overlay">
          <section
            className="exercise-form-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exercise-form-title"
          >
            <div className="exercise-form-header">
              <div>
                <p className="exercise-eyebrow">
                  CUSTOM MOVEMENT
                </p>
                <h3 id="exercise-form-title">
                  Add an exercise
                </h3>
              </div>

              <button
                type="button"
                className="exercise-close-button"
                onClick={() => setShowForm(false)}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="exercise-form-field">
                Exercise name *
                <input
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  maxLength={100}
                  required
                  placeholder="e.g. Incline dumbbell press"
                />
              </label>

              <label className="exercise-form-field">
                Category *
                <select
                  name="category"
                  value={form.category}
                  onChange={updateField}
                  required
                >
                  {categories.map((category) => (
                    <option
                      key={category.value}
                      value={category.value}
                    >
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="exercise-form-field">
                Measurement type *
                <select
                  name="measurementType"
                  value={form.measurementType}
                  onChange={updateField}
                  required
                >
                  {measurementTypes.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="exercise-form-field">
                Equipment
                <input
                  name="equipment"
                  value={form.equipment}
                  onChange={updateField}
                  maxLength={100}
                  placeholder="e.g. Dumbbells"
                />
              </label>

              <label className="exercise-form-field">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  maxLength={500}
                  rows={3}
                  placeholder="Optional instructions or notes"
                />
              </label>

              {formError && (
                <p className="exercise-form-error" role="alert">
                  {formError}
                </p>
              )}

              <div className="exercise-form-actions">
                <button
                  type="button"
                  className="exercise-cancel-button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="exercise-add-button"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Exercise"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* EDIT EXERCISE MODAL */}
      {editingExercise && (
        <div className="exercise-form-overlay">
          <section
            className="exercise-form-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-exercise-title"
          >
            <div className="exercise-form-header">
              <div>
                <p className="exercise-eyebrow">
                  UPDATE MOVEMENT
                </p>
                <h3 id="edit-exercise-title">
                  Edit exercise
                </h3>
              </div>

              <button
                type="button"
                className="exercise-close-button"
                onClick={() => setEditingExercise(null)}
                disabled={editSaving}
                aria-label="Close edit form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <label className="exercise-form-field">
                Exercise name *
                <input
                  name="name"
                  value={editForm.name}
                  onChange={updateEditField}
                  maxLength={100}
                  required
                />
              </label>

              <label className="exercise-form-field">
                Category *
                <select
                  name="category"
                  value={editForm.category}
                  onChange={updateEditField}
                  required
                >
                  {categories.map((category) => (
                    <option
                      key={category.value}
                      value={category.value}
                    >
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="exercise-form-field">
                Measurement type *
                <select
                  name="measurementType"
                  value={editForm.measurementType}
                  onChange={updateEditField}
                  required
                >
                  {measurementTypes.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="exercise-form-field">
                Equipment
                <input
                  name="equipment"
                  value={editForm.equipment}
                  onChange={updateEditField}
                  maxLength={100}
                />
              </label>

              <label className="exercise-form-field">
                Description
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={updateEditField}
                  maxLength={500}
                  rows={3}
                />
              </label>

              {editError && (
                <p className="exercise-form-error" role="alert">
                  {editError}
                </p>
              )}

              <div className="exercise-form-actions">
                <button
                  type="button"
                  className="exercise-cancel-button"
                  onClick={() => setEditingExercise(null)}
                  disabled={editSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="exercise-add-button"
                  disabled={editSaving}
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="exercise-form-overlay">
          <section
            className="exercise-confirm-panel"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-exercise-title"
            aria-describedby="delete-exercise-description"
          >
            <div className="exercise-confirm-icon">
              <Trash2 size={24} />
            </div>

            <h3 id="delete-exercise-title">
              Delete exercise?
            </h3>

            <p id="delete-exercise-description">
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.name}</strong>? This action
              cannot be undone.
            </p>

            {deleteError && (
              <p className="exercise-form-error" role="alert">
                {deleteError}
              </p>
            )}

            <div className="exercise-form-actions">
              <button
                type="button"
                className="exercise-cancel-button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError("");
                }}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="exercise-confirm-delete"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Exercise"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* SEARCH TOOLBAR */}
      <div className="exercise-library-toolbar">
        <label className="exercise-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search exercises, equipment..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />
        </label>

        <span className="exercise-count">
          {filteredExercises.length} exercises
        </span>
      </div>

      {/* CATEGORY FILTERS */}
      <div className="exercise-category-filters">
        {[{ label: "All exercises", value: "ALL" }, ...categories].map(
          (category) => (
            <button
              key={category.value}
              type="button"
              className={`exercise-filter ${
                activeCategory === category.value ? "active" : ""
              }`}
              onClick={() =>
                setActiveCategory(category.value)
              }
            >
              {category.label}
            </button>
          )
        )}
      </div>

      {/* EXERCISE LIST */}
      {loading ? (
        <div className="exercise-state">
          <RefreshCw
            size={22}
            className="exercise-spinner"
          />
          <p>Loading exercises...</p>
        </div>
      ) : error ? (
        <div className="exercise-state">
          <p>{error}</p>
          <button
            type="button"
            className="exercise-retry-button"
            onClick={loadExercises}
          >
            Try again
          </button>
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="exercise-state">
          <Dumbbell size={28} />
          <h3>No exercises found</h3>
          <p>Try another search or category.</p>
        </div>
      ) : (
        <div className="exercise-grid">
          {filteredExercises.map((exercise) => (
            <article
              className="exercise-card"
              key={exercise.id}
            >
              <div className="exercise-card-top">
                <div className="exercise-icon">
                  <Dumbbell size={20} />
                </div>

                <div className="exercise-card-actions">
                  <span className="exercise-category-tag">
                    {formatLabel(exercise.category)}
                  </span>

                  {exercise.isCustom && (
                    <div className="exercise-action-buttons">
                      <button
                        type="button"
                        className="exercise-icon-button"
                        aria-label={`Edit ${exercise.name}`}
                        title="Edit exercise"
                        onClick={() =>
                          openEditModal(exercise)
                        }
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        className="exercise-icon-button exercise-delete-button"
                        aria-label={`Delete ${exercise.name}`}
                        title="Delete exercise"
                        onClick={() => {
                          setDeleteTarget(exercise);
                          setDeleteError("");
                          setSuccessMessage("");
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <h3>{exercise.name}</h3>

              <p className="exercise-description">
                {exercise.description ||
                  "No description provided."}
              </p>

              <div className="exercise-card-details">
                <div>
                  <span>Equipment</span>
                  <strong>
                    {exercise.equipment || "Not specified"}
                  </strong>
                </div>

                <div>
                  <span>Measurement</span>
                  <strong>
                    {formatLabel(exercise.measurementType)}
                  </strong>
                </div>
              </div>

              {exercise.isCustom && (
                <span className="exercise-custom-tag">
                  Custom exercise
                </span>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ExerciseLibrary;
