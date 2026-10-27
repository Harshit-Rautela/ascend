
import { useState, useEffect, useCallback } from "react";
import {
    LayoutDashboard,
    PlusCircle,
    History,
    Scale,
    Dumbbell,
    Activity,
    HeartPulse,
    ChevronRight,
} from "lucide-react";

import "./stats.css";
import StatsLog from "./StatsLog";
import { getBodyStats } from "./statsAPI";

const tabs = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Log", icon: PlusCircle },
    { label: "History", icon: History },
];

export default function Stats() {
    const [activeTab, setActiveTab] = useState("Overview");

    const [bodyStats, setBodyStats] = useState({
        weight: null,
        bodyFat: null,
        waist: null,
    });

    const [loadingBodyStats, setLoadingBodyStats] = useState(true);
    const [bodyStatsError, setBodyStatsError] = useState("");

    const loadBodyStats = useCallback(async () => {
        try {
            setBodyStatsError("");

            const data = await getBodyStats();

            setBodyStats({
                weight: data.weight ?? null,
                bodyFat: data.bodyFat ?? null,
                waist: data.waist ?? null,
            });
        } catch (error) {
            setBodyStatsError(
                error.message || "Failed to load body stats."
            );
        } finally {
            setLoadingBodyStats(false);
        }
    }, []);

    useEffect(() => {
        loadBodyStats();
    }, [loadBodyStats]);

    const metricGroups = [
        {
            title: "Body",
            description: "Your latest body measurements",
            icon: Scale,
            metrics: [
                {
                    label: "Body weight",
                    value: bodyStats.weight
                        ? bodyStats.weight.weightKg
                        : "—",
                    unit: "kg",
                },
                {
                    label: "Body fat",
                    value: bodyStats.bodyFat
                        ? bodyStats.bodyFat.value
                        : "—",
                    unit: "%",
                },
                {
                    label: "Waist",
                    value: bodyStats.waist
                        ? bodyStats.waist.value
                        : "—",
                    unit: "cm",
                },
            ],
        },
        {
            title: "Strength",
            description: "Your latest lifting performance",
            icon: Dumbbell,
            metrics: [
                { label: "Bench press", value: "—", unit: "kg" },
                { label: "Squat", value: "—", unit: "kg" },
                { label: "Deadlift", value: "—", unit: "kg" },
            ],
        },
        {
            title: "Endurance",
            description: "Your latest cardio performance",
            icon: Activity,
            metrics: [
                { label: "Distance", value: "—", unit: "km" },
                { label: "Duration", value: "—", unit: "min" },
                { label: "Pace", value: "—", unit: "/km" },
            ],
        },
        {
            title: "Health",
            description: "Your latest recorded health metrics",
            icon: HeartPulse,
            metrics: [
                { label: "Resting heart rate", value: "—", unit: "bpm" },
                { label: "Blood pressure", value: "—", unit: "" },
                { label: "Sleep", value: "—", unit: "hours" },
            ],
        },
    ];

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
                            className={`stats-tab ${
                                activeTab === tab.label ? "active" : ""
                            }`}
                            onClick={() => setActiveTab(tab.label)}
                        >
                            <Icon size={17} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </nav>

            {activeTab === "Overview" ? (
                <>
                    <section className="stats-intro">
                        <div>
                            <h2>Your current snapshot</h2>
                            <p>
                                Your latest recorded metrics across fitness
                                and health.
                            </p>
                        </div>
                    </section>

                    {loadingBodyStats && (
                        <p>Loading body stats...</p>
                    )}

                    {bodyStatsError && (
                        <p
                            role="alert"
                            className="stats-form-error"
                        >
                            {bodyStatsError}
                        </p>
                    )}

                    <div className="stats-groups">
                        {metricGroups.map((group) => {
                            const Icon = group.icon;

                            return (
                                <section
                                    className="stats-group"
                                    key={group.title}
                                >
                                    <div className="stats-group-header">
                                        <div className="stats-group-icon">
                                            <Icon size={20} />
                                        </div>

                                        <div className="stats-group-heading">
                                            <h3>{group.title}</h3>
                                            <p>{group.description}</p>
                                        </div>

                                        <ChevronRight
                                            size={18}
                                            className="stats-group-chevron"
                                        />
                                    </div>

                                    <div className="stats-metrics">
                                        {group.metrics.map((metric) => (
                                            <div
                                                className="stats-metric"
                                                key={metric.label}
                                            >
                                                <span className="stats-metric-label">
                                                    {metric.label}
                                                </span>

                                                <div className="stats-metric-value">
                                                    <strong>
                                                        {metric.value}
                                                    </strong>

                                                    {metric.unit && (
                                                        <span>
                                                            {metric.unit}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                </>
            ) : activeTab === "Log" ? (
                <StatsLog onSaved={loadBodyStats} />
            ) : (
                <section className="stats-placeholder">
                    <History size={28} />
                    <h2>Stats history</h2>
                    <p>
                        Explore past measurements and performance charts here.
                    </p>
                </section>
            )}
        </div>
    );
}
