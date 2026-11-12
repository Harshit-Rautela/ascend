
import { useMemo, useState, useEffect } from "react";
import {
    Moon,
    Sunrise,
    Clock,
    Target,
    Plus,
    X,
    Check,
    BedDouble,
    Sparkles,
    TrendingUp,
    LayoutDashboard,
    CalendarDays,
    ChartNoAxesCombined,
    Pencil, Trash2
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";
// import "./Sleep.css";
import "./sleep.css"
import SleepHistory from "./SleepHistory.jsx";
import SleepInsights from "./SleepInsights.jsx";
const SLEEP_GOAL = 8;

function formatDuration(minutes) {
    if (minutes == null || !Number.isFinite(minutes)) return "--";
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${hours}h ${remainingMinutes}m`;
}

function calculateSleepDuration(bedtime, wakeTime) {
    const [bedHours, bedMinutes] = bedtime.split(":").map(Number);
    const [wakeHours, wakeMinutes] = wakeTime.split(":").map(Number);

    let start = bedHours * 60 + bedMinutes;
    let end = wakeHours * 60 + wakeMinutes;

    // Sleep usually crosses midnight.
    if (end <= start) {
        end += 24 * 60;
    }

    return end - start;
}
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}
function getLastSevenDays() {
    const days = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        days.push({
            date: formatDate(date),
            day: date.toLocaleDateString("en-US", {
                weekday: "short",
            }),
        });
    }

    return days;
}

function Sleep() {
    const today = formatDate(new Date());

    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [sleepDate, setSleepDate] = useState(today);
    const [bedtime, setBedtime] = useState("22:30");
    const [wakeTime, setWakeTime] = useState("06:30");
    const [sleepQuality, setSleepQuality] = useState(4);
    const [notes, setNotes] = useState("");
    const [sleepScore, setSleepScore] = useState("");
    const [awakeMinutes, setAwakeMinutes] = useState("");
    const [lightSleepMinutes, setLightSleepMinutes] = useState("");
    const [deepSleepMinutes, setDeepSleepMinutes] = useState("");
    const [heartRate, setHeartRate] = useState("");
    const [hrv, setHrv] = useState("");
    const [energy, setEnergy] = useState("");
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("Dashboard");

    const sleepTabs = [
        { label: "Dashboard", icon: LayoutDashboard },
        { label: "History", icon: CalendarDays },
        { label: "Insights", icon: ChartNoAxesCombined },
        { label: "Goals", icon: Target },
    ]

    const sleepDuration = useMemo(
        () => calculateSleepDuration(bedtime, wakeTime),
        [bedtime, wakeTime]
    );

    const todayEntry = entries.find(
        (entry) => entry.sleepDate === today
    );
    function resetSleepForm() {
        setSleepDate(today);
        setBedtime("22:30");
        setWakeTime("06:30");
        setSleepQuality(4);
        setNotes("");
        setSleepScore("");
        setAwakeMinutes("");
        setLightSleepMinutes("");
        setDeepSleepMinutes("");
        setHeartRate("");
        setHrv("");
        setEnergy("");
        setError("");
        setEditingEntry(null);
    }

    function openCreateForm() {
        resetSleepForm();
        setShowForm(true);
    }

    function openEditForm(entry) {
        setEditingEntry(entry);

        setSleepDate(entry.sleepDate.slice(0, 10));
        setBedtime(entry.bedtime);
        setWakeTime(entry.wakeTime);
        setSleepQuality(entry.quality ?? 4);

        setNotes(entry.notes ?? "");
        setSleepScore(entry.sleepScore ?? "");
        setAwakeMinutes(entry.awakeMinutes ?? "");
        setLightSleepMinutes(entry.lightSleepMinutes ?? "");
        setDeepSleepMinutes(entry.deepSleepMinutes ?? "");
        setHeartRate(entry.heartRate ?? "");
        setHrv(entry.hrv ?? "");
        setEnergy(entry.energy ?? "");

        setError("");
        setShowForm(true);
    }

    function closeSleepForm() {
        setShowForm(false);
        setEditingEntry(null);
        setError("");
    }

    const latestEntry = entries[0];

    const weeklyData = useMemo(() => {
        const days = getLastSevenDays();

        return days.map((day) => {
            const entry = entries.find(
                (item) => item.sleepDate === day.date
            );

            return {
                day: day.day,
                hours: entry ? entry.durationMinutes / 60 : 0,
                hasEntry: Boolean(entry),
            };
        });
    }, [entries]);

    const averageSleep = useMemo(() => {
        const recordedDays = weeklyData.filter(
            (day) => day.hasEntry
        );

        if (recordedDays.length === 0) return 0;

        const total = recordedDays.reduce(
            (sum, day) => sum + day.hours,
            0
        );

        return total / recordedDays.length;
    }, [weeklyData]);

    const weeklyGoalProgress = Math.min(
        (averageSleep / SLEEP_GOAL) * 100,
        100
    );
    useEffect(() => {
        async function fetchSleepEntries() {
            try {
                setLoading(true);
                setLoadError("");

                const response = await fetch(
                    "http://localhost:5000/api/sleep"
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error || "Could not load sleep records."
                    );
                }

                if (!Array.isArray(result)) {
                    throw new Error("Unexpected sleep data format.");
                }

                setEntries(
                    result.map((entry) => ({
                        ...entry,
                        sleepDate: entry.sleepDate.slice(0, 10),
                    }))
                );

                console.log("Sleep entries loaded:", result);
            } catch (error) {
                console.error("Error loading sleep entries:", error);

                setLoadError(
                    error.message || "Could not load sleep records."
                );
            } finally {
                setLoading(false);
            }
        }

        fetchSleepEntries();
    }, []);
    async function handleSaveSleep(event) {
        event.preventDefault();
        setError("");

        if (!sleepDate || !bedtime || !wakeTime) {
            setError("Please complete all required fields.");
            return;
        }

        if (sleepDuration <= 0 || sleepDuration > 24 * 60) {
            setError("Please enter a valid sleep duration.");
            return;
        }

        const payload = {
            sleepDate,
            bedtime,
            wakeTime,
            quality: sleepQuality,

            sleepScore: sleepScore === "" ? null : Number(sleepScore),

            awakeMinutes: awakeMinutes === "" ? null : Number(awakeMinutes),
            lightSleepMinutes:
                lightSleepMinutes === "" ? null : Number(lightSleepMinutes),
            deepSleepMinutes:
                deepSleepMinutes === "" ? null : Number(deepSleepMinutes),

            heartRate: heartRate === "" ? null : Number(heartRate),
            hrv: hrv === "" ? null : Number(hrv),
            energy: energy === "" ? null : Number(energy),

            notes: notes.trim(),
        };

        try {
            setIsSaving(true);

            const isEditing = Boolean(editingEntry);

            const response = await fetch(
                isEditing
                    ? `http://localhost:5000/api/sleep/${editingEntry.id}`
                    : "http://localhost:5000/api/sleep",
                {
                    method: isEditing ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    `Failed to ${isEditing ? "update" : "save"} sleep record.`
                );
            }

            const savedEntry = {
                ...result,
                sleepDate: result.sleepDate.slice(0, 10),
            };

            setEntries((current) =>
                [
                    savedEntry,
                    ...current.filter(
                        (item) => item.sleepDate !== savedEntry.sleepDate
                    ),
                ].sort((a, b) =>
                    b.sleepDate.localeCompare(a.sleepDate)
                )
            );

            closeSleepForm();
            resetSleepForm();

        } catch (error) {
            console.error("Error saving sleep record:", error);
            setError(error.message || "Could not save sleep record.");
        } finally {
            setIsSaving(false);
        }
    }
    async function deleteEntry(id) {
        const confirmed = window.confirm(
            "Are you sure you want to delete today's sleep record?"
        );

        if (!confirmed) return;

        try {
            setIsDeleting(true);

            const response = await fetch(
                `http://localhost:5000/api/sleep/${id}`,
                {
                    method: "DELETE",
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Failed to delete sleep record."
                );
            }

            setEntries((current) =>
                current.filter((entry) => entry.id !== id)
            );

        } catch (error) {
            console.error("Error deleting sleep record:", error);
            window.alert(error.message || "Could not delete sleep record.");
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <section className="sleep-page">
            {/* Page heading */}
            <div className="sleep-page-header">
                <div>
                    <div className="sleep-eyebrow">
                        <Moon size={15} />
                        YOUR RECOVERY
                    </div>

                    <h1>
                        Sleep <span>better.</span>
                    </h1>

                    <p>
                        Track your rest. Understand your recovery.
                    </p>
                </div>
                <button
                    className="sleep-add-button"
                    onClick={() => {
                        if (todayEntry) {
                            openEditForm(todayEntry);
                        } else {
                            openCreateForm();
                        }
                    }}
                >
                    {todayEntry ? <Pencil size={18} /> : <Plus size={18} />}
                    {todayEntry ? "Edit sleep" : "Log sleep"}
                </button>
            </div>
            <nav className="sleep-tabs" aria-label="Sleep navigation">
                {sleepTabs.map(({ label, icon: Icon }) => (
                    <button
                        key={label}
                        type="button"
                        className={`sleep-tab ${activeTab === label ? "active" : ""
                            }`}
                        onClick={() => setActiveTab(label)}
                        aria-current={activeTab === label ? "page" : undefined}
                    >
                        <Icon size={18} />
                        <span>{label}</span>
                    </button>
                ))}
            </nav>
            {activeTab === "Dashboard" && (
                <>
                    {/* Summary cards */}
                    {/* Today's sleep overview */}
                    <div className="sleep-overview-panel">
                        {todayEntry ? (
                            <>
                                <div className="sleep-overview-header">
                                    <div>
                                        <span className="sleep-section-label">
                                            TODAY'S RECOVERY
                                        </span>

                                        <h2>Your sleep overview</h2>
                                        <p>Your latest sleep and recovery measurements.</p>
                                    </div>

                                    <div className="sleep-overview-actions">
                                        <span className="sleep-today-badge">Today</span>

                                        <button
                                            type="button"
                                            className="sleep-edit-button"
                                            onClick={() => openEditForm(todayEntry)}
                                            aria-label="Edit today's sleep"
                                        >
                                            <Pencil size={15} />
                                            Edit
                                        </button>

                                        <button
                                            type="button"
                                            className="sleep-delete-button"
                                            onClick={() => deleteEntry(todayEntry.id)}
                                            disabled={isDeleting}
                                            aria-label="Delete today's sleep"
                                        >
                                            <Trash2 size={15} />
                                            {isDeleting ? "Deleting..." : "Delete"}
                                        </button>
                                    </div>
                                </div>

                                <div className="sleep-overview-main">
                                    {/* Sleep score */}
                                    <div className="sleep-score-section">
                                        <div
                                            className="sleep-score-ring"
                                            style={{
                                                "--score-progress": `${Math.min(
                                                    Math.max(todayEntry.sleepScore ?? 0, 0),
                                                    100
                                                ) * 3.6
                                                    }deg`,
                                            }}
                                        >
                                            <div className="sleep-score-inner">
                                                <strong>
                                                    {todayEntry.sleepScore != null
                                                        ? todayEntry.sleepScore
                                                        : "--"}
                                                </strong>
                                                <span>Sleep score</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sleep session information */}
                                    <div className="sleep-session-details">
                                        <div className="sleep-session-item">
                                            <span>Bedtime</span>
                                            <strong>{todayEntry.bedtime}</strong>
                                        </div>

                                        <div className="sleep-session-item">
                                            <span>Wake-up</span>
                                            <strong>{todayEntry.wakeTime}</strong>
                                        </div>

                                        <div className="sleep-session-item sleep-session-highlight">
                                            <span>Time asleep</span>
                                            <strong>
                                                {formatDuration(todayEntry.durationMinutes)}
                                            </strong>
                                        </div>

                                        <div className="sleep-session-item">
                                            <span>Time in bed</span>
                                            <strong>
                                                {formatDuration(todayEntry.timeInBedMinutes)}
                                            </strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Sleep stages */}
                                <div className="sleep-stage-section">
                                    <div className="sleep-subsection-heading">
                                        <h3>Sleep stages</h3>
                                        <span>
                                            {todayEntry.timeInBedMinutes != null
                                                ? formatDuration(todayEntry.timeInBedMinutes)
                                                : "Duration unavailable"}
                                        </span>
                                    </div>

                                    {todayEntry.awakeMinutes != null &&
                                        todayEntry.lightSleepMinutes != null &&
                                        todayEntry.deepSleepMinutes != null ? (
                                        <>
                                            <div className="sleep-stage-legend">
                                                <div>
                                                    <span className="stage-dot awake-dot" />
                                                    <span>Awake</span>
                                                    <strong>
                                                        {formatDuration(todayEntry.awakeMinutes)}
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span className="stage-dot light-dot" />
                                                    <span>Light sleep</span>
                                                    <strong>
                                                        {formatDuration(todayEntry.lightSleepMinutes)}
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span className="stage-dot deep-dot" />
                                                    <span>Deep sleep</span>
                                                    <strong>
                                                        {formatDuration(todayEntry.deepSleepMinutes)}
                                                    </strong>
                                                </div>
                                            </div>

                                            <div
                                                className="sleep-stage-bar"
                                                role="img"
                                                aria-label="Proportional breakdown of awake, light sleep, and deep sleep duration"
                                            >
                                                <div
                                                    className="sleep-stage-segment awake-segment"
                                                    style={{
                                                        width: `${(todayEntry.awakeMinutes /
                                                            todayEntry.timeInBedMinutes) *
                                                            100
                                                            }%`,
                                                    }}
                                                />

                                                <div
                                                    className="sleep-stage-segment light-segment"
                                                    style={{
                                                        width: `${(todayEntry.lightSleepMinutes /
                                                            todayEntry.timeInBedMinutes) *
                                                            100
                                                            }%`,
                                                    }}
                                                />

                                                <div
                                                    className="sleep-stage-segment deep-segment"
                                                    style={{
                                                        width: `${(todayEntry.deepSleepMinutes /
                                                            todayEntry.timeInBedMinutes) *
                                                            100
                                                            }%`,
                                                    }}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <p className="sleep-stage-unavailable">
                                            Sleep-stage measurements haven't been recorded.
                                        </p>
                                    )}
                                </div>

                                {/* Recovery metrics */}
                                <div className="sleep-recovery-section">
                                    <div className="sleep-subsection-heading">
                                        <h3>Recovery metrics</h3>
                                    </div>

                                    <div className="sleep-recovery-grid">
                                        <div className="sleep-recovery-card">
                                            <span>Heart rate</span>
                                            <strong>
                                                {todayEntry.heartRate != null
                                                    ? `${todayEntry.heartRate} BPM`
                                                    : "--"}
                                            </strong>
                                        </div>

                                        <div className="sleep-recovery-card">
                                            <span>HRV</span>
                                            <strong>
                                                {todayEntry.hrv != null
                                                    ? `${todayEntry.hrv} ms`
                                                    : "--"}
                                            </strong>
                                        </div>

                                        <div className="sleep-recovery-card">
                                            <span>Energy</span>
                                            <strong>
                                                {todayEntry.energy != null
                                                    ? `${todayEntry.energy}%`
                                                    : "--"}
                                            </strong>
                                        </div>

                                        <div className="sleep-recovery-card">
                                            <span>Sleep quality</span>
                                            <strong>{todayEntry.quality}/5</strong>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="sleep-empty-state">
                                <div className="sleep-empty-icon">
                                    <BedDouble size={28} />
                                </div>

                                <h3>No sleep data for today</h3>
                                <p>Log your sleep to see your recovery measurements here.</p>

                                <button
                                    className="sleep-empty-button"
                                    onClick={() => {
                                        setSleepDate(today);
                                        setShowForm(true);
                                    }}
                                >
                                    <Plus size={16} />
                                    Log today's sleep
                                </button>
                            </div>
                        )}
                    </div>


                    {/* Sleep insights */}
                    <div className="sleep-insights-panel">
                        <div className="sleep-insights-icon">
                            <Sparkles size={20} />
                        </div>

                        <div>
                            <span className="sleep-section-label">
                                SLEEP INSIGHTS
                            </span>

                            <h3>
                                {averageSleep === 0
                                    ? "Your sleep journey starts here."
                                    : averageSleep >= SLEEP_GOAL
                                        ? "You're meeting your sleep goal!"
                                        : "There's room to improve your sleep duration."}
                            </h3>

                            <p>
                                {averageSleep === 0
                                    ? "Log your sleep consistently to start seeing your weekly patterns."
                                    : `Your average sleep duration is ${averageSleep.toFixed(1)} hours. Your daily target is ${SLEEP_GOAL} hours.`}
                            </p>
                        </div>
                    </div>
                </>)}

            {activeTab === "History" && <SleepHistory />}
            {activeTab === "Insights" && <SleepInsights />}
            {/* Log sleep modal */}
            {showForm && (
                <div
                    className="sleep-modal-backdrop"
                    onClick={() => setShowForm(false)}
                >
                    <form
                        className="sleep-modal"
                        onSubmit={handleSaveSleep}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="sleep-modal-header">
                            <div>
                                <span className="sleep-section-label">
                                    YOUR RECOVERY
                                </span>
                                <h2>{editingEntry ? "Edit your sleep" : "Log your sleep"}</h2>
                            </div>

                            <button
                                type="button"
                                className="sleep-close-button"
                                onClick={closeSleepForm}
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {error && (
                            <div className="sleep-form-error">
                                {error}
                            </div>
                        )}

                        <label className="sleep-form-field">
                            Sleep date
                            <input
                                type="date"
                                value={sleepDate}
                                max={today}
                                onChange={(event) =>
                                    setSleepDate(event.target.value)
                                }
                                required
                            />
                        </label>

                        <div className="sleep-time-grid">
                            <label className="sleep-form-field">
                                <span>
                                    <Moon size={15} /> Bedtime
                                </span>

                                <input
                                    type="time"
                                    value={bedtime}
                                    onChange={(event) =>
                                        setBedtime(event.target.value)
                                    }
                                    required
                                />
                            </label>

                            <label className="sleep-form-field">
                                <span>
                                    <Sunrise size={15} /> Wake-up time
                                </span>

                                <input
                                    type="time"
                                    value={wakeTime}
                                    onChange={(event) =>
                                        setWakeTime(event.target.value)
                                    }
                                    required
                                />
                            </label>
                        </div>

                        <div className="sleep-duration-preview">
                            <span>Calculated sleep duration</span>
                            <strong>{formatDuration(sleepDuration)}</strong>
                        </div>
                        <div className="sleep-form-field">
                            <span>Sleep tracker measurements</span>
                            <small>Enter the values from your sleep tracking app.</small>
                        </div>

                        <label className="sleep-form-field">
                            Sleep score (0–100)
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                value={sleepScore}
                                onChange={(event) => setSleepScore(event.target.value)}
                                placeholder="e.g. 85"
                            />
                        </label>

                        <div className="sleep-time-grid">
                            <label className="sleep-form-field">
                                Awake duration (minutes)
                                <input
                                    type="number"
                                    min="0"
                                    max="1440"
                                    step="1"
                                    value={awakeMinutes}
                                    onChange={(event) => setAwakeMinutes(event.target.value)}
                                    placeholder="e.g. 17"
                                />
                            </label>

                            <label className="sleep-form-field">
                                Light sleep (minutes)
                                <input
                                    type="number"
                                    min="0"
                                    max="1440"
                                    step="1"
                                    value={lightSleepMinutes}
                                    onChange={(event) => setLightSleepMinutes(event.target.value)}
                                    placeholder="e.g. 235"
                                />
                            </label>
                        </div>

                        <label className="sleep-form-field">
                            Deep sleep (minutes)
                            <input
                                type="number"
                                min="0"
                                max="1440"
                                step="1"
                                value={deepSleepMinutes}
                                onChange={(event) => setDeepSleepMinutes(event.target.value)}
                                placeholder="e.g. 145"
                            />
                        </label>

                        <div className="sleep-time-grid">
                            <label className="sleep-form-field">
                                Heart rate (BPM)
                                <input
                                    type="number"
                                    min="1"
                                    max="300"
                                    step="1"
                                    value={heartRate}
                                    onChange={(event) => setHeartRate(event.target.value)}
                                    placeholder="e.g. 73"
                                />
                            </label>

                            <label className="sleep-form-field">
                                HRV (ms)
                                <input
                                    type="number"
                                    min="0"
                                    max="1000"
                                    step="1"
                                    value={hrv}
                                    onChange={(event) => setHrv(event.target.value)}
                                    placeholder="e.g. 62"
                                />
                            </label>
                        </div>

                        <label className="sleep-form-field">
                            Energy (%)
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={energy}
                                onChange={(event) => setEnergy(event.target.value)}
                                placeholder="e.g. 55"
                            />
                        </label>

                        <div className="sleep-form-field">
                            <span>How was your sleep?</span>

                            <div className="sleep-quality-options">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                    <button
                                        key={rating}
                                        type="button"
                                        className={
                                            sleepQuality === rating ? "selected" : ""
                                        }
                                        onClick={() => setSleepQuality(rating)}
                                    >
                                        {rating}
                                    </button>
                                ))}
                            </div>

                            <small>
                                1 = Very poor · 5 = Excellent
                            </small>
                        </div>

                        <label className="sleep-form-field">
                            Notes (optional)
                            <textarea
                                value={notes}
                                onChange={(event) =>
                                    setNotes(event.target.value)
                                }
                                placeholder="How did you feel after waking up?"
                                rows={3}
                                maxLength={500}
                            />
                        </label>

                        <div className="sleep-modal-footer">
                            <button
                                type="button"
                                className="sleep-cancel-button"
                                onClick={() => setShowForm(false)}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="sleep-save-button"
                                disabled={isSaving}
                            >
                                <Check size={17} />
                                {isSaving
                                    ? "Saving..."
                                    : editingEntry
                                        ? "Update sleep"
                                        : "Save sleep"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
}

export default Sleep;
