import { useMemo, useState } from "react";
import {
    Search,
    Activity,
    ChevronRight,
    FlaskConical,
} from "lucide-react";

export default function Biomarkers({
    biomarkers = [],
    categories = [],
    latestResults = [],
    onSelectBiomarker,
}) {
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ALL");

    const latestByBiomarker = useMemo(() => {
        return new Map(
            latestResults.map((result) => [
                result.biomarkerId,
                result,
            ])
        );
    }, [latestResults]);

    const filteredBiomarkers = useMemo(() => {
        return biomarkers.filter((biomarker) => {
            const matchesCategory =
                selectedCategory === "ALL" ||
                biomarker.category === selectedCategory;

            const matchesSearch =
                biomarker.name
                    .toLowerCase()
                    .includes(search.toLowerCase()) ||
                biomarker.key
                    .toLowerCase()
                    .includes(search.toLowerCase());

            return matchesCategory && matchesSearch;
        });
    }, [biomarkers, selectedCategory, search]);

    function getValue(biomarker) {
        const result = latestByBiomarker.get(biomarker.id);

        if (!result) return "Not recorded";

        return result.valueNumeric ?? result.valueText ?? "Not recorded";
    }

    function getUnit(biomarker) {
        const result = latestByBiomarker.get(biomarker.id);

        return result?.unit || biomarker.defaultUnit || "";
    }

    function getDate(biomarker) {
        const result = latestByBiomarker.get(biomarker.id);

        if (!result?.measuredAt) return null;

        return new Date(result.measuredAt).toLocaleDateString();
    }

    return (
        <section className="biomarkers-page">
            <div className="biomarkers-heading">
                <div>
                    <h2>Biomarker library</h2>
                    <p>
                        Explore and manage your health measurements.
                    </p>
                </div>

                <span className="biomarker-count">
                    {filteredBiomarkers.length} biomarkers
                </span>
            </div>

            <div className="biomarkers-toolbar">
                <div className="biomarker-search">
                    <Search size={18} />

                    <input
                        type="search"
                        placeholder="Search biomarkers..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                <select
                    value={selectedCategory}
                    onChange={(event) =>
                        setSelectedCategory(event.target.value)
                    }
                    aria-label="Filter biomarkers by category"
                >
                    <option value="ALL">All categories</option>

                    {categories.map((category) => (
                        <option
                            key={category.key}
                            value={category.key}
                        >
                            {category.label || category.name}
                        </option>
                    ))}
                </select>
            </div>

            {filteredBiomarkers.length > 0 ? (
                <div className="biomarkers-list">
                    {filteredBiomarkers.map((biomarker) => (
                        <button
                            type="button"
                            className="biomarker-item"
                            key={biomarker.id}
                            onClick={() =>
                                onSelectBiomarker?.(biomarker)
                            }
                        >
                            <div className="biomarker-item-icon">
                                <FlaskConical size={19} />
                            </div>

                            <div className="biomarker-item-info">
                                <strong>{biomarker.name}</strong>

                                <span>
                                    {categories.find(
                                        (category) =>
                                            category.key === biomarker.category
                                    )?.label || biomarker.category}
                                </span>
                            </div>

                            <div className="biomarker-item-value">
                                <strong>{getValue(biomarker)}</strong>

                                {getUnit(biomarker) && (
                                    <span>{getUnit(biomarker)}</span>
                                )}

                                {getDate(biomarker) && (
                                    <small>{getDate(biomarker)}</small>
                                )}
                            </div>

                            <ChevronRight
                                size={18}
                                className="biomarker-item-chevron"
                            />
                        </button>
                    ))}
                </div>
            ) : (
                <div className="biomarkers-empty">
                    <Activity size={28} />

                    <h3>No biomarkers found</h3>

                    <p>
                        Try another search term or category.
                    </p>
                </div>
            )}
        </section>
    );
}