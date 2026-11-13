
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import "./workouts.css";

function formatMuscle(muscle) {
  return muscle
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function MuscleSelect({
  muscles,
  value,
  onChange,
  multiple = false,
  placeholder = "Select muscle",
  excludeValues = [],
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  const selectedValues = multiple
    ? Array.isArray(value)
      ? value
      : []
    : value
      ? [value]
      : [];

  const filteredMuscles = useMemo(() => {
    return muscles.filter((muscle) => {
      const isExcluded =
        excludeValues.includes(muscle) &&
        !selectedValues.includes(muscle);

      return (
        !isExcluded &&
        formatMuscle(muscle)
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      );
    });
  }, [muscles, search, excludeValues, selectedValues]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
        setSearch("");
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleSelect(muscle) {
    if (!multiple) {
      onChange(muscle);
      setIsOpen(false);
      setSearch("");
      return;
    }

    const nextValues = selectedValues.includes(muscle)
      ? selectedValues.filter((item) => item !== muscle)
      : [...selectedValues, muscle];

    onChange(nextValues);
  }

  function removeSelected(muscle, event) {
    event.stopPropagation();
    onChange(selectedValues.filter((item) => item !== muscle));
  }

  function clearSelection(event) {
    event.stopPropagation();
    onChange(multiple ? [] : "");
  }

  return (
    <div
      className={`muscle-select ${isOpen ? "muscle-select--open" : ""}`}
      ref={containerRef}
    >
      <button
        type="button"
        className="muscle-select-trigger"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((previous) => !previous)}
      >
        <span className="muscle-select-value">
          {selectedValues.length === 0 ? (
            <span className="muscle-select-placeholder">
              {placeholder}
            </span>
          ) : multiple ? (
            <span className="muscle-select-chips">
              {selectedValues.map((muscle) => (
                <span className="muscle-select-chip" key={muscle}>
                  {formatMuscle(muscle)}
                  <span
                    className="muscle-select-chip-remove"
                    role="button"
                    aria-label={`Remove ${formatMuscle(muscle)}`}
                    onClick={(event) => removeSelected(muscle, event)}
                  >
                    <X size={12} />
                  </span>
                </span>
              ))}
            </span>
          ) : (
            formatMuscle(selectedValues[0])
          )}
        </span>

        <span className="muscle-select-actions">
          {selectedValues.length > 0 && (
            <span
              className="muscle-select-clear"
              role="button"
              aria-label="Clear selection"
              onClick={clearSelection}
            >
              <X size={15} />
            </span>
          )}
          <ChevronDown
            size={18}
            className="muscle-select-chevron"
          />
        </span>
      </button>

      {isOpen && (
        <div className="muscle-select-dropdown">
          <div className="muscle-select-search">
            <Search size={16} />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search muscles..."
              autoFocus
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {multiple && selectedValues.length > 0 && (
            <div className="muscle-select-dropdown-header">
              <span>{selectedValues.length} selected</span>
              <button type="button" onClick={() => onChange([])}>
                Clear all
              </button>
            </div>
          )}

          <div
            className="muscle-select-options"
            role="listbox"
            aria-multiselectable={multiple}
          >
            {filteredMuscles.length === 0 ? (
              <p className="muscle-select-empty">
                No muscles found.
              </p>
            ) : (
              filteredMuscles.map((muscle) => {
                const selected = selectedValues.includes(muscle);

                return (
                  <button
                    type="button"
                    key={muscle}
                    className={`muscle-select-option ${
                      selected ? "selected" : ""
                    }`}
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleSelect(muscle)}
                  >
                    <span>{formatMuscle(muscle)}</span>

                    <span
                      className={`muscle-select-indicator ${
                        multiple ? "checkbox" : "radio"
                      } ${selected ? "checked" : ""}`}
                    >
                      {selected && <Check size={13} />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
