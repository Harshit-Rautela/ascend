
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
import ExerciseDetailsModal from "./ExerciseDetailsModal";
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

const muscles = [
  "CHEST",
  "BACK",
  "LATS",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "FOREARMS",
  "ABS",
  "OBLIQUES",
  "QUADRICEPS",
  "HAMSTRINGS",
  "GLUTES",
  "CALVES",
  "HIP_FLEXORS",
  "ADDUCTORS",
  "ABDUCTORS",
  "LOWER_BACK",
  "TRAPS",
];

const exerciseTypes = [
  { label: "Compound", value: "COMPOUND" },
  { label: "Isolation", value: "ISOLATION" },
];

const movementPatterns = [
  "HORIZONTAL_PUSH",
  "VERTICAL_PUSH",
  "HORIZONTAL_PULL",
  "VERTICAL_PULL",
  "SQUAT",
  "HINGE",
  "LUNGE",
  "CARRY",
  "ROTATION",
  "ANTI_ROTATION",
  "FLEXION",
  "EXTENSION",
  "ABDUCTION",
  "ADDUCTION",
  "OTHER",
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
  const [activeMuscle, setActiveMuscle] = useState("ALL");
  const [activeEquipment, setActiveEquipment] = useState("ALL");
  const [activeExerciseType, setActiveExerciseType] = useState("ALL");
  const [activeMovementPattern, setActiveMovementPattern] = useState("ALL");

  const [sortBy, setSortBy] = useState("NAME_ASC");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedExercise, setSelectedExercise] = useState(null);
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
    primaryMuscle: "",
    secondaryMuscles: [],
    exerciseType: "",
    movementPattern: "",
    imageUrl: "",
    imagePublicId: "",
    videoUrl: "",
    videoPublicId: "",

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
  const [uploadingImage, setUploadingImage] = useState({
    add: false,
    edit: false,
  });
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
  // Search, filtering and sorting

  const equipmentOptions = [
    ...new Set(
      exercises.flatMap((exercise) =>
        (exercise.equipment || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      )
    ),
  ].sort((a, b) => a.localeCompare(b));

  const activeFilterChips = [
    ...(activeCategory !== "ALL"
      ? [{
        key: "category",
        label: categories.find(
          (item) => item.value === activeCategory
        )?.label,
      }]
      : []),

    ...(activeMuscle !== "ALL"
      ? [{
        key: "muscle",
        label: formatLabel(activeMuscle),
      }]
      : []),

    ...(activeEquipment !== "ALL"
      ? [{
        key: "equipment",
        label: activeEquipment,
      }]
      : []),

    ...(activeExerciseType !== "ALL"
      ? [{
        key: "exerciseType",
        label: exerciseTypes.find(
          (item) => item.value === activeExerciseType
        )?.label,
      }]
      : []),

    ...(activeMovementPattern !== "ALL"
      ? [{
        key: "movementPattern",
        label: formatLabel(activeMovementPattern),
      }]
      : []),
  ];

  function removeFilter(filterKey) {
    const resetters = {
      category: () => setActiveCategory("ALL"),
      muscle: () => setActiveMuscle("ALL"),
      equipment: () => setActiveEquipment("ALL"),
      exerciseType: () => setActiveExerciseType("ALL"),
      movementPattern: () =>
        setActiveMovementPattern("ALL"),
    };

    resetters[filterKey]?.();
  }

  // Builds a sorted, duplicate-free list of equipment names from all exercises.
  // Splits comma-separated equipment fields, trims spaces, and ignores empty values.
  const filteredExercises = exercises
    .filter((exercise) => {
      const query = searchTerm.trim().toLowerCase();

      const matchesSearch = [
        exercise.name,
        exercise.equipment,
        exercise.description,
      ].some((value) =>
        value?.toLowerCase().includes(query)
      );

      const matchesCategory =
        activeCategory === "ALL" ||
        exercise.category === activeCategory;

      const matchesMuscle =
        activeMuscle === "ALL" ||
        exercise.primaryMuscle === activeMuscle ||
        exercise.secondaryMuscles?.includes(activeMuscle);

      const exerciseEquipment = (exercise.equipment || "")
        .split(",")
        .map((item) => item.trim().toLowerCase());

      const matchesEquipment =
        activeEquipment === "ALL" ||
        exerciseEquipment.includes(activeEquipment.toLowerCase());

      const matchesExerciseType =
        activeExerciseType === "ALL" ||
        exercise.exerciseType === activeExerciseType;

      const matchesMovementPattern =
        activeMovementPattern === "ALL" ||
        exercise.movementPattern === activeMovementPattern;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesMuscle &&
        matchesEquipment &&
        matchesExerciseType &&
        matchesMovementPattern
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "NAME_DESC":
          return b.name.localeCompare(a.name);

        case "NEWEST":
          return new Date(b.createdAt) - new Date(a.createdAt);

        case "NAME_ASC":
        default:
          return a.name.localeCompare(b.name);
      }
    });

  // This function uploads an image or video file to the backend and stores the returned URL in a form.
  async function handleImageUpload(file, mode) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      const message = "Please select a valid image.";

      mode === "add"
        ? setFormError(message)
        : setEditError(message);

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const message = "Image must be smaller than 5 MB.";

      mode === "add"
        ? setFormError(message)
        : setEditError(message);

      return;
    }

    setUploadingImage((previous) => ({
      ...previous,
      [mode]: true,
    }));

    mode === "add" ? setFormError("") : setEditError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "http://localhost:5000/api/media/image",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Image upload failed.");
      }

      const updateState = mode === "add" ? setForm : setEditForm;

      updateState((previous) => ({
        ...previous,
        imageUrl: data.url,
        imagePublicId: data.publicId,
      }));
    } catch (error) {
      const message = error.message || "Image upload failed.";

      mode === "add"
        ? setFormError(message)
        : setEditError(message);
    } finally {
      setUploadingImage((previous) => ({
        ...previous,
        [mode]: false,
      }));
    }
  }
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
      primaryMuscle: "",
      secondaryMuscles: [],
      exerciseType: "",
      movementPattern: "",
      imageUrl: "",
      imagePublicId: "",
      videoUrl: "",
    });
    setShowForm(true);
  }

  function resetFilters() {
    setActiveCategory("ALL");
    setActiveMuscle("ALL");
    setActiveEquipment("ALL");
    setActiveExerciseType("ALL");
    setActiveMovementPattern("ALL");
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
      console.log("videoUrl:", form.videoUrl);
      console.log("videoUrl type:", typeof form.videoUrl);

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

          primaryMuscle: form.primaryMuscle || null,
          secondaryMuscles: form.secondaryMuscles,

          exerciseType: form.exerciseType || null,
          movementPattern: form.movementPattern || null,

          imageUrl: form.imageUrl.trim() || null,
          imagePublicId: form.imagePublicId || null,
          videoUrl: form.videoUrl.trim() || null,
          videoPublicId: form.videoPublicId || null,
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

      primaryMuscle: exercise.primaryMuscle || "",
      secondaryMuscles: exercise.secondaryMuscles || [],
      exerciseType: exercise.exerciseType || "",
      movementPattern: exercise.movementPattern || "",

      imageUrl: exercise.imageUrl || "",
      imagePublicId: exercise.imagePublicId || "",

      videoUrl: exercise.videoUrl || "",
      videoPublicId: exercise.videoPublicId || "",
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

            primaryMuscle: editForm.primaryMuscle || null,
            secondaryMuscles: editForm.secondaryMuscles,

            exerciseType: editForm.exerciseType || null,
            movementPattern: editForm.movementPattern || null,

            imageUrl: editForm.imageUrl.trim() || null,
            imagePublicId: editForm.imagePublicId || null,
            videoUrl: editForm.videoUrl.trim() || null,
            videoPublicId: editForm.videoPublicId || null,
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
              {/* MUSCLE GROUP */}

              <label className="exercise-form-field">
                Primary muscle

                <select
                  name="primaryMuscle"
                  value={form.primaryMuscle}
                  onChange={updateField}
                >
                  <option value="">Select primary muscle</option>

                  {muscles.map((muscle) => (
                    <option key={muscle} value={muscle}>
                      {formatLabel(muscle)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="exercise-form-field">
                Secondary muscles

                <select
                  multiple
                  value={form.secondaryMuscles}
                  onChange={(event) => {
                    const selectedMuscles = Array.from(
                      event.target.selectedOptions,
                      (option) => option.value
                    );

                    setForm((previous) => ({
                      ...previous,
                      secondaryMuscles: selectedMuscles,
                    }));
                  }}
                >
                  {muscles.map((muscle) => (
                    <option key={muscle} value={muscle}>
                      {formatLabel(muscle)}
                    </option>
                  ))}
                </select>

                <small>Hold Ctrl (Windows) or Command (Mac) to select multiple muscles.</small>
              </label>

              {/* EXERCISE TYPE */}

              <label className="exercise-form-field">
                Exercise type

                <select
                  name="exerciseType"
                  value={form.exerciseType}
                  onChange={updateField}
                >
                  <option value="">Select exercise type</option>

                  {exerciseTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* MOVEMENT PATTERN */}

              <label className="exercise-form-field">
                Movement pattern

                <select
                  name="movementPattern"
                  value={form.movementPattern}
                  onChange={updateField}
                >
                  <option value="">Select movement pattern</option>

                  {movementPatterns.map((pattern) => (
                    <option key={pattern} value={pattern}>
                      {formatLabel(pattern)}
                    </option>
                  ))}
                </select>
              </label>


              {/* MEDIA */}

              <div className="exercise-form-field">
                <label htmlFor="exercise-image">Exercise image</label>

                <input
                  id="exercise-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    handleImageUpload(event.target.files[0], "add")
                  }
                  disabled={uploadingImage.add}
                />

                {uploadingImage.add && <small>Uploading image...</small>}

                {form.imageUrl && (
                  <div className="exercise-media-preview">
                    <img src={form.imageUrl} alt="Exercise preview" />

                    <button
                      type="button"
                      onClick={() =>
                        setForm((previous) => ({
                          ...previous,
                          imageUrl: "",
                          imagePublicId: "",
                        }))
                      }
                    >
                      Remove image
                    </button>
                  </div>
                )}
              </div>

              <label className="exercise-form-field">
                YouTube demonstration URL

                <input
                  type="url"
                  name="videoUrl"
                  value={form.videoUrl}
                  onChange={updateField}
                  placeholder="https://www.youtube.com/watch?v=..."
                />

                <small>Paste a YouTube video or Shorts URL.</small>
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
              {/* PRIMARY MUSCLE */}

              <label className="exercise-form-field">
                Primary muscle

                <select
                  name="primaryMuscle"
                  value={editForm.primaryMuscle}
                  onChange={updateEditField}
                >
                  <option value="">Select primary muscle</option>

                  {muscles.map((muscle) => (
                    <option key={muscle} value={muscle}>
                      {formatLabel(muscle)}
                    </option>
                  ))}
                </select>
              </label>

              {/* SECONDARY MUSCLES */}

              <label className="exercise-form-field">
                Secondary muscles

                <select
                  multiple
                  value={editForm.secondaryMuscles}
                  onChange={(event) => {
                    const selectedMuscles = Array.from(
                      event.target.selectedOptions,
                      (option) => option.value
                    );

                    setEditForm((previous) => ({
                      ...previous,
                      secondaryMuscles: selectedMuscles,
                    }));
                  }}
                >
                  {muscles.map((muscle) => (
                    <option key={muscle} value={muscle}>
                      {formatLabel(muscle)}
                    </option>
                  ))}
                </select>

                <small>
                  Hold Ctrl (Windows) or Command (Mac) to select multiple muscles.
                </small>
              </label>

              {/* EXERCISE TYPE */}

              <label className="exercise-form-field">
                Exercise type

                <select
                  name="exerciseType"
                  value={editForm.exerciseType}
                  onChange={updateEditField}
                >
                  <option value="">Select exercise type</option>

                  {exerciseTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* MOVEMENT PATTERN */}

              <label className="exercise-form-field">
                Movement pattern

                <select
                  name="movementPattern"
                  value={editForm.movementPattern}
                  onChange={updateEditField}
                >
                  <option value="">Select movement pattern</option>

                  {movementPatterns.map((pattern) => (
                    <option key={pattern} value={pattern}>
                      {formatLabel(pattern)}
                    </option>
                  ))}
                </select>
              </label>


              {/* MEDIA */}

              <div className="exercise-form-field">
                <label htmlFor="edit-exercise-image">Exercise image</label>

                <input
                  id="edit-exercise-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    handleImageUpload(event.target.files[0], "edit")
                  }
                  disabled={uploadingImage.edit}
                />

                {uploadingImage.edit && <small>Uploading image...</small>}

                {editForm.imageUrl && (
                  <div className="exercise-media-preview">
                    <img src={editForm.imageUrl} alt="Exercise preview" />

                    <button
                      type="button"
                      onClick={() =>
                        setEditForm((previous) => ({
                          ...previous,
                          imageUrl: "",
                          imagePublicId: "",
                        }))
                      }
                    >
                      Remove image
                    </button>
                  </div>
                )}
              </div>

              <label className="exercise-form-field">
                YouTube demonstration URL

                <input
                  type="url"
                  name="videoUrl"
                  value={editForm.videoUrl}
                  onChange={updateEditField}
                  placeholder="https://www.youtube.com/watch?v=..."
                />

                <small>Paste a YouTube video or Shorts URL.</small>
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
              className={`exercise-filter ${activeCategory === category.value ? "active" : ""
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
      {/* ADVANCED FILTERS */}
      <div className="exercise-advanced-filters">

        <select
          value={activeMuscle}
          onChange={(event) => setActiveMuscle(event.target.value)}
        >
          <option value="ALL">All muscles</option>
          {muscles.map((muscle) => (
            <option key={muscle} value={muscle}>
              {formatLabel(muscle)}
            </option>
          ))}
        </select>

        <select
          value={activeEquipment}
          onChange={(event) => setActiveEquipment(event.target.value)}
        >
          <option value="ALL">All equipment</option>
          {equipmentOptions.map((equipment) => (
            <option key={equipment} value={equipment}>
              {equipment}
            </option>
          ))}
        </select>

        <select
          value={activeExerciseType}
          onChange={(event) => setActiveExerciseType(event.target.value)}
        >
          <option value="ALL">All exercise types</option>
          {exerciseTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <select
          value={activeMovementPattern}
          onChange={(event) => setActiveMovementPattern(event.target.value)}
        >
          <option value="ALL">All movement patterns</option>
          {movementPatterns.map((pattern) => (
            <option key={pattern} value={pattern}>
              {formatLabel(pattern)}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
        >
          <option value="NAME_ASC">Name: A–Z</option>
          <option value="NAME_DESC">Name: Z–A</option>
          <option value="NEWEST">Newest first</option>
        </select>

        <button
          type="button"
          className="exercise-reset-filters"
          onClick={resetFilters}
        >
          <RefreshCw size={15} />

        </button>

      </div>
      {/* ACTIVE FILTER INDICATORS */}

      {activeFilterChips.length > 0 && (
        <div className="active-filters">
          <div className="active-filters-header">
            <span>Active filters</span>

            <button
              type="button"
              onClick={resetFilters}
              className="clear-active-filters"
            >
              Clear all
            </button>
          </div>

          <div className="active-filter-chips">
            {activeFilterChips.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className="active-filter-chip"
                onClick={() => removeFilter(filter.key)}
                aria-label={`Remove ${filter.label} filter`}
              >
                <span>{filter.label}</span>
                <X size={14} />
              </button>
            ))}
          </div>
        </div>
      )}

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

            <div
              className="exercise-card exercise-card--image"
              key={exercise.id}
              onClick={() => setSelectedExercise(exercise)}
            >
              {/* IMAGE SECTION */}
              <div className="exercise-card-media">
                <div className="exercise-card-image-fallback">
                  <Dumbbell size={38} />
                </div>

                {exercise.imageUrl && (
                  <img
                    src={exercise.imageUrl}
                    alt={exercise.name}
                    className="exercise-card-image"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}

                {/* CATEGORY BADGE */}
                <span className="exercise-card-category">
                  {formatLabel(exercise.category)}
                </span>

                {/* CUSTOM EXERCISE ACTIONS */}
                {exercise.isCustom && (
                  <div className="exercise-card-image-actions">
                    <button
                      type="button"
                      className="exercise-icon-button"
                      aria-label={`Edit ${exercise.name}`}
                      title="Edit exercise"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditModal(exercise);
                      }}
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      type="button"
                      className="exercise-icon-button exercise-delete-button"
                      aria-label={`Delete ${exercise.name}`}
                      title="Delete exercise"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteTarget(exercise);
                        setDeleteError("");
                        setSuccessMessage("");
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>

              {/* CARD CONTENT */}
              <div className="exercise-card-content">

                <div className="exercise-card-title-row">
                  <h3>{exercise.name}</h3>

                  {exercise.isCustom && (
                    <span className="exercise-custom-tag">
                      Custom
                    </span>
                  )}
                </div>

                <p className="exercise-card-description">
                  {exercise.description ||
                    "No description provided."}
                </p>

                {/* MUSCLE GROUPS */}
                {(exercise.primaryMuscle ||
                  exercise.secondaryMuscles?.length > 0) && (
                    <div className="exercise-card-muscles">

                      {exercise.primaryMuscle && (
                        <span className="exercise-muscle-primary">
                          {formatLabel(exercise.primaryMuscle)}
                        </span>
                      )}

                      {exercise.secondaryMuscles
                        ?.slice(0, 2)
                        .map((muscle) => (
                          <span
                            key={muscle}
                            className="exercise-muscle-secondary"
                          >
                            {formatLabel(muscle)}
                          </span>
                        ))}

                      {(exercise.secondaryMuscles?.length || 0) > 2 && (
                        <span className="exercise-muscle-secondary">
                          +{exercise.secondaryMuscles.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                {/* EXERCISE ATTRIBUTES */}
                <div className="exercise-card-tags">
                  {exercise.exerciseType && (
                    <span className="exercise-card-tag">
                      {formatLabel(exercise.exerciseType)}
                    </span>
                  )}

                  {exercise.movementPattern && (
                    <span className="exercise-card-tag">
                      {formatLabel(exercise.movementPattern)}
                    </span>
                  )}
                </div>

                {/* CARD FOOTER */}
                <div className="exercise-card-footer">

                  <div className="exercise-card-detail">
                    <span>Equipment</span>
                    <strong>
                      {exercise.equipment || "Not specified"}
                    </strong>
                  </div>

                  <div className="exercise-card-detail">
                    <span>Measurement</span>
                    <strong>
                      {formatLabel(exercise.measurementType)}
                    </strong>
                  </div>

                </div>
              </div>
            </div>

          ))}
        </div>
      )}
      {/* EXERCISE DETAILS MODAL */}
      <ExerciseDetailsModal
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
        onEdit={(exercise) => {
          setSelectedExercise(null);
          openEditModal(exercise);
        }}
      />
    </section>
  );
}

export default ExerciseLibrary;
