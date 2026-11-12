
import { useState } from "react";
import {
    Scale,
    HeartPulse,
    Activity,
    Droplets,
    FlaskConical,
    Pill,
    Microscope,
    Dna, LayoutDashboard, PlusCircle, History, ChevronRight
} from "lucide-react";

import "./stats.css";
import StatsLog from "./StatsLog";
import useStats from "./useStats.js";
import Biomarkers from "./Biomarkers";
import BiomarkerDetails from "./BiomarkerDetails";

const tabs = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Biomarkers", icon: Activity },
    { label: "Log", icon: PlusCircle },
    { label: "History", icon: History },
];
const categoryIcons = {
    BODY_COMPOSITION: "Body composition",
    CARDIOVASCULAR_FITNESS: "Cardiovascular & fitness",
    METABOLIC: "Metabolic",
    LIPID: "Lipid profile",
    LIVER: "Liver",
    KIDNEY: "Kidney",
    BLOOD: "Blood health",
    HORMONE_NUTRITION: "Hormones & nutrition",
};

const categoryIconMap = {
    BODY_COMPOSITION: Scale,
    CARDIOVASCULAR_FITNESS: HeartPulse,
    METABOLIC: Activity,
    LIPID: Droplets,
    LIVER: FlaskConical,
    KIDNEY: Droplets,
    BLOOD: Microscope,
    HORMONE_NUTRITION: Dna,
};

function CategoryCard({ title, description, metrics, categoryKey }) {
    const [expanded, setExpanded] = useState(false);

    const Icon = categoryIconMap[categoryKey] || Activity;

    return (
        <section className={`stats-group ${expanded ? "expanded" : ""}`}>
            <button
                type="button"
                className="stats-group-header"
                onClick={() => setExpanded((previous) => !previous)}
                aria-expanded={expanded}
            >
                <div className="stats-group-icon">
                    <Icon size={20} />
                </div>

                <div className="stats-group-heading">
                    <h3>{title}</h3>
                    <p>{description}</p>
                </div>

                <ChevronRight
                    size={18}
                    className="stats-group-chevron"
                />
            </button>

            <div className="stats-metrics">
                {metrics.map((metric) => (
                    <div
                        className="stats-metric"
                        key={metric.id || metric.label}
                    >
                        <span className="stats-metric-label">
                            {metric.label}
                        </span>

                        <div className="stats-metric-value">
                            <strong>
                                {metric.value === "—"
                                    ? "Not recorded"
                                    : metric.value}
                            </strong>

                            {metric.unit && metric.value !== "—" && (
                                <span>{metric.unit}</span>
                            )}
                        </div>

                        {metric.measuredAt && (
                            <span className="stats-metric-date">
                                {new Date(
                                    metric.measuredAt
                                ).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}



function getResultValue(result) {
    if (result.valueNumeric !== null && result.valueNumeric !== undefined) {
        return result.valueNumeric;
    }

    return result.valueText ?? "—";
}

export default function Stats() {
    const [activeTab, setActiveTab] = useState("Overview");
    const [selectedBiomarker, setSelectedBiomarker] = useState(null);


    const {
        bodyStats,
        categories,
        biomarkers,
        latestResults,
        loading,
        error,
        refresh,
    } = useStats();

    // Match latest results with their biomarker definitions.
    const latestByBiomarker = new Map(
        latestResults.map((result) => [
            result.biomarkerId,
            result,
        ])
    );

    const bodyMetrics = [
        {
            label: "Body weight",
            value: bodyStats.weight?.weightKg ?? "—",
            unit: "kg",
        },
        {
            label: "Body fat",
            value: bodyStats.bodyFat?.value ?? "—",
            unit: "%",
        },
        {
            label: "Waist",
            value: bodyStats.waist?.value ?? "—",
            unit: "cm",
        },
    ];

    const categoryGroups = categories.map((category) => {
        const categoryBiomarkers = biomarkers.filter(
            (biomarker) => biomarker.category === category.key
        );

        const biomarkerMetrics = categoryBiomarkers.map((biomarker) => {
            const result = latestByBiomarker.get(biomarker.id);

            return {
                id: biomarker.id,
                label: biomarker.name,
                value: result ? getResultValue(result) : "—",
                unit: result?.unit || biomarker.defaultUnit || "",
                measuredAt: result?.measuredAt ?? null,
            };
        });

        // Merge existing body measurements into the same category.
        const metrics =
            category.key === "BODY_COMPOSITION"
                ? [
                    {
                        id: "body-weight",
                        label: "Body weight",
                        value: bodyStats.weight?.weightKg ?? "—",
                        unit: "kg",
                    },
                    {
                        id: "body-fat",
                        label: "Body fat",
                        value: bodyStats.bodyFat?.value ?? "—",
                        unit: "%",
                    },
                    {
                        id: "waist",
                        label: "Waist circumference",
                        value: bodyStats.waist?.value ?? "—",
                        unit: "cm",
                    },
                    ...biomarkerMetrics,
                ]
                : biomarkerMetrics;

        return {
            ...category,
            metrics,
        };
    });

    return (
        <div className="stats-page">
            <header className="stats-header">
                <div>
                    <span className="stats-eyebrow">
                        YOUR PERFORMANCE
                    </span>

                    <h1>Stats</h1>

                    <p>
                        Understand your body. Measure your progress.
                    </p>
                </div>
            </header>

            <nav className="stats-tabs" aria-label="Stats sections">
                {tabs.map((tab) => {
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.label}
                            type="button"
                            className={`stats-tab ${activeTab === tab.label ? "active" : ""
                                }`}
                            onClick={() => setActiveTab(tab.label)}
                        >
                            <Icon size={17} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </nav>

            {activeTab === "Overview" && (
                <section>
                    <div className="stats-intro">
                        <div>
                            <h2>Your current snapshot</h2>
                            <p>
                                Your latest recorded measurements across
                                body composition and health.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="stats-refresh-button"
                            onClick={refresh}
                            disabled={loading}
                        >
                            <Activity size={15} />
                            Refresh
                        </button>
                    </div>

                    {loading && (
                        <p className="stats-loading">
                            Loading your measurements...
                        </p>
                    )}

                    {error && (
                        <p role="alert" className="stats-form-error">
                            {error}
                        </p>
                    )}

                    {!loading && (
                        <div className="stats-groups">
                            {/* <CategoryCard
                                title="Body composition"
                                description="Your latest body measurements"
                                metrics={bodyMetrics}
                            /> */}

                            {categoryGroups.map((group) => (
                                <CategoryCard
                                    key={group.key || group.id}
                                    title={
                                        group.label ||
                                        categoryIcons[group.key] ||
                                        group.name
                                    }
                                    description={
                                        group.description ||
                                        "Your latest recorded measurements"
                                    }
                                    metrics={group.metrics}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}
            {activeTab === "Biomarkers" && (
                selectedBiomarker ? (
                    <BiomarkerDetails
                        biomarker={selectedBiomarker}
                        onBack={() => setSelectedBiomarker(null)}
                    />
                ) : (
                    <Biomarkers
                        biomarkers={biomarkers}
                        categories={categories}
                        latestResults={latestResults}
                        onSelectBiomarker={setSelectedBiomarker}
                    />
                )
            )}
            {activeTab === "Log" && (
                <StatsLog onSaved={refresh} />
            )}

            {activeTab === "History" && (
                <section className="stats-placeholder">
                    <History size={28} />

                    <h2>Stats history</h2>

                    <p>
                        Explore your previous measurements and
                        performance trends here.
                    </p>
                </section>
            )}
        </div>
    );
}

