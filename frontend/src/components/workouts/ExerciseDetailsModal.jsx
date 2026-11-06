
import { useEffect } from "react";
import {
  X,
  Pencil,
  ExternalLink,
  PlayCircle,
  Dumbbell,
} from "lucide-react";
import "./workouts.css"

const formatLabel = (value) => {
  if (!value) return "Not specified";

  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function ExerciseDetailsModal({
  exercise,
  onClose,
  onEdit,
}) {
  useEffect(() => {
    if (!exercise) return;

    const previousOverflow = document.body.style.overflow;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [exercise, onClose]);

  if (!exercise) return null;

  const secondaryMuscles = exercise.secondaryMuscles || [];

  return (
    <div
      className="exercise-details-overlay"
      onClick={onClose}
    >
      <div
        className="exercise-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-details-title"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="exercise-details-header">
          <div>
            <p className="exercise-details-eyebrow">
              Exercise details
            </p>

            <h2 id="exercise-details-title">
              {exercise.name}
            </h2>
          </div>

          <button
            type="button"
            className="exercise-details-close"
            onClick={onClose}
            aria-label="Close exercise details"
          >
            <X size={22} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="exercise-details-content">

          {/* Exercise image */}
          <div className="exercise-details-image">
            {exercise.imageUrl ? (
              <img
                src={exercise.imageUrl}
                alt={`${exercise.name} demonstration`}
              />
            ) : (
              <div className="exercise-details-image-fallback">
                <Dumbbell size={48} />
              </div>
            )}

            <span className="exercise-details-category">
              {formatLabel(exercise.category)}
            </span>
          </div>

          <div className="exercise-details-body">

            {/* Overview */}
            <section className="exercise-details-section">
              <h3>Overview</h3>

              <div className="exercise-details-overview">
                <DetailItem
                  label="Equipment"
                  value={exercise.equipment || "None"}
                />

                <DetailItem
                  label="Measurement"
                  value={formatLabel(exercise.measurementType)}
                />

                <DetailItem
                  label="Exercise type"
                  value={formatLabel(exercise.exerciseType)}
                />

                <DetailItem
                  label="Movement pattern"
                  value={formatLabel(exercise.movementPattern)}
                />
              </div>
            </section>

            {/* Muscle groups */}
            <section className="exercise-details-section">
              <h3>Muscle groups</h3>

              <div className="exercise-details-muscles">
                <div>
                  <p className="exercise-details-label">
                    Primary muscle
                  </p>

                  {exercise.primaryMuscle ? (
                    <MuscleTag
                      value={exercise.primaryMuscle}
                      primary
                    />
                  ) : (
                    <p className="exercise-details-muted">
                      Not specified
                    </p>
                  )}
                </div>

                <div>
                  <p className="exercise-details-label">
                    Secondary muscles
                  </p>

                  {secondaryMuscles.length > 0 ? (
                    <div className="exercise-details-muscle-list">
                      {secondaryMuscles.map((muscle) => (
                        <MuscleTag
                          key={muscle}
                          value={muscle}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="exercise-details-muted">
                      None specified
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Instructions */}
            <section className="exercise-details-section">
              <h3>Instructions</h3>

              <p className="exercise-details-description">
                {exercise.description ||
                  "No instructions have been added yet."}
              </p>
            </section>

            {/* YouTube video */}
            {exercise.videoUrl && (
              <section className="exercise-details-section">
                <h3>Video demonstration</h3>

                <a
                  href={exercise.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="exercise-details-video-link"
                >
                  <div className="exercise-details-video-info">
                    <PlayCircle size={28} />

                    <div>
                      <p>Watch exercise demonstration</p>
                      <span>Opens the YouTube video</span>
                    </div>
                  </div>

                  <ExternalLink size={18} />
                </a>
              </section>
            )}

            {/* Custom exercise indicator */}
            {exercise.isCustom && (
              <div className="exercise-details-custom">
                Custom exercise
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        {exercise.isCustom && onEdit && (
          <div className="exercise-details-footer">
            <button
              type="button"
              onClick={() => onEdit(exercise)}
              className="exercise-details-edit-button"
            >
              <Pencil size={16} />
              Edit exercise
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="exercise-details-item">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function MuscleTag({ value, primary = false }) {
  return (
    <span
      className={`exercise-muscle-tag ${
        primary ? "primary" : ""
      }`}
    >
      {formatLabel(value)}
    </span>
  );
}
