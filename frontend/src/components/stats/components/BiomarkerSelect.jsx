
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, Check, FlaskConical } from "lucide-react";

export default function BiomarkerSelect({
    biomarkers = [],
    value,
    onChange,
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef(null);

    const selected = biomarkers.find(
        (item) => item.id === value
    );

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return biomarkers;

        return biomarkers.filter((item) =>
            [item.name, item.key, item.category]
                .filter(Boolean)
                .some((field) => field.toLowerCase().includes(query))
        );
    }, [biomarkers, search]);

    useEffect(() => {
        function handleOutsideClick(event) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target)
            ) {
                setOpen(false);
            }
        }

        function handleEscape(event) {
            if (event.key === "Escape") setOpen(false);
        }

        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    function selectBiomarker(biomarker) {
        onChange(biomarker.id);
        setOpen(false);
        setSearch("");
    }

    return (
        <div className="biomarker-select" ref={containerRef}>
            <button
                type="button"
                className={`biomarker-select-trigger ${open ? "open" : ""}`}
                onClick={() => setOpen((previous) => !previous)}
                aria-expanded={open}
            >
                <div className="biomarker-select-selected">
                    <FlaskConical size={18} />

                    <span>
                        {selected?.name || "Select a biomarker"}
                    </span>
                </div>

                <ChevronDown
                    size={18}
                    className="biomarker-select-chevron"
                />
            </button>

            {open && (
                <div className="biomarker-select-dropdown">
                    <div className="biomarker-select-search">
                        <Search size={17} />

                        <input
                            autoFocus
                            type="search"
                            placeholder="Search biomarkers..."
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                        />

                        <span>{filtered.length}</span>
                    </div>

                    <div className="biomarker-select-list">
                        {filtered.length > 0 ? (
                            filtered.map((biomarker) => {
                                const isSelected =
                                    biomarker.id === value;

                                return (
                                    <button
                                        type="button"
                                        key={biomarker.id}
                                        className={`biomarker-select-option ${
                                            isSelected ? "selected" : ""
                                        }`}
                                        onClick={() =>
                                            selectBiomarker(biomarker)
                                        }
                                    >
                                        <div>
                                            <strong>
                                                {biomarker.name}
                                            </strong>

                                            <span>
                                                {biomarker.category.replaceAll(
                                                    "_",
                                                    " "
                                                )}
                                            </span>
                                        </div>

                                        {isSelected && (
                                            <Check size={17} />
                                        )}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="biomarker-select-empty">
                                No biomarkers found.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
