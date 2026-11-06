import "./nutrition.css";
import { useEffect, useMemo, useState } from "react";
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Utensils,
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area,
    ReferenceLine
} from "recharts";

const API_URL = "http://localhost:5000/api/nutrition";

const MACRO_COLORS = ["#c6f36a", "#72b8ff", "#ffad73"];
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"];

function getToday() {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
}

function shiftDate(dateString, amount) {
    const date = new Date(`${dateString}T12:00:00`);
    date.setDate(date.getDate() + amount);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getMonday(dateString) {
    const date = new Date(`${dateString}T12:00:00`);
    const day = date.getDay();
    date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${dayOfMonth}`;
}

function formatDay(dateString) {
    return new Date(`${dateString}T12:00:00`).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
    });
}
const MEAL_COLORS = {
    Breakfast: "#c6f36a",
    Lunch: "#72b8ff",
    Dinner: "#bd8aff",
    Snacks: "#ffad73",
};
function formatLongDate(dateString) {
    return new Date(`${dateString}T12:00:00`).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

export default function NutritionHistory() {
    const [selectedDate, setSelectedDate] = useState(getToday);
    const [entries, setEntries] = useState([]);
    const [weekDays, setWeekDays] = useState([]);
    const [period, setPeriod] = useState("weekly");
    const [monthDays, setMonthDays] = useState([]);
    const [loading, setLoading] = useState(false);
    const [weeklyLoading, setWeeklyLoading] = useState(false);
    const [error, setError] = useState("");
    const [weeklyError, setWeeklyError] = useState("");
    const [micronutrients, setMicronutrients] = useState([]);
    const [micronutrientsLoading, setMicronutrientsLoading] = useState(false);
    const [micronutrientsError, setMicronutrientsError] = useState("");
    const [activeMicronutrientFilter, setActiveMicronutrientFilter] =
        useState("All");
    const [activeMetric, setActiveMetric] = useState("calories");
    useEffect(() => {
        const controller = new AbortController();

        async function loadHistory() {
            setLoading(true);
            setError("");

            try {
                const response = await fetch(
                    `${API_URL}?date=${encodeURIComponent(selectedDate)}`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error("Could not load nutrition history.");
                }

                const data = await response.json();

                if (!Array.isArray(data)) {
                    throw new Error("Unexpected response from the server.");
                }

                setEntries(data);
            } catch (err) {
                if (err.name !== "AbortError") {
                    setError(err.message || "Something went wrong.");
                    setEntries([]);
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        loadHistory();
        return () => controller.abort();
    }, [selectedDate]);


    useEffect(() => {
        const controller = new AbortController();

        async function loadMicronutrients() {
            setMicronutrientsLoading(true);
            setMicronutrientsError("");

            try {
                const response = await fetch(
                    `${API_URL}/micronutrients?date=${encodeURIComponent(selectedDate)}`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error("Could not load micronutrient history.");
                }

                const data = await response.json();

                if (!Array.isArray(data.nutrients)) {
                    throw new Error("Unexpected micronutrient response.");
                }

                setMicronutrients(data.nutrients);
            } catch (err) {
                if (err.name !== "AbortError") {
                    setMicronutrientsError(
                        err.message || "Could not load micronutrients."
                    );
                    setMicronutrients([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setMicronutrientsLoading(false);
                }
            }
        }

        loadMicronutrients();

        return () => controller.abort();
    }, [selectedDate]);


    const weekStart = useMemo(() => getMonday(selectedDate), [selectedDate]);
    const weekDates = useMemo(
        () => Array.from({ length: 7 }, (_, index) => shiftDate(weekStart, index)),
        [weekStart]
    );

    const today = getToday();

    function hasNutritionData(date) {
        const dayData = weekDays.find((day) => day.date === date);

        return (
            date <= today &&
            Number(dayData?.entries || 0) > 0
        );
    }

    useEffect(() => {
        const controller = new AbortController();

        async function loadWeek() {
            setWeeklyLoading(true);
            setWeeklyError("");

            try {
                const response = await fetch(
                    `${API_URL}/weekly?startDate=${encodeURIComponent(weekStart)}`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error("Could not load weekly nutrition.");
                }

                const data = await response.json();

                if (!Array.isArray(data.days)) {
                    throw new Error("Unexpected weekly response from the server.");
                }

                setWeekDays(data.days);
            } catch (err) {
                if (err.name !== "AbortError") {
                    setWeeklyError(err.message || "Could not load weekly chart.");
                    setWeekDays([]);
                }
            } finally {
                if (!controller.signal.aborted) setWeeklyLoading(false);
            }
        }

        loadWeek();
        return () => controller.abort();
    }, [weekStart]);

    useEffect(() => {
        if (period !== "monthly") return;

        const controller = new AbortController();

        async function loadMonth() {
            setWeeklyLoading(true);
            setWeeklyError("");

            try {
                const month = selectedDate.slice(0, 7);

                const response = await fetch(
                    `${API_URL}/monthly?month=${encodeURIComponent(month)}`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error("Could not load monthly nutrition.");
                }

                const data = await response.json();

                if (!Array.isArray(data.days)) {
                    throw new Error("Unexpected monthly response from the server.");
                }

                setMonthDays(data.days);
            } catch (err) {
                if (err.name !== "AbortError") {
                    setWeeklyError(
                        err.message || "Could not load monthly nutrition."
                    );
                    setMonthDays([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setWeeklyLoading(false);
                }
            }
        }

        loadMonth();

        return () => controller.abort();
    }, [period, selectedDate]);


    const totals = useMemo(
        () =>
            entries.reduce(
                (sum, entry) => ({
                    calories: sum.calories + Number(entry.calories || 0),
                    protein: sum.protein + Number(entry.protein || 0),
                    carbs: sum.carbs + Number(entry.carbs || 0),
                    fat: sum.fat + Number(entry.fat || 0),
                }),
                { calories: 0, protein: 0, carbs: 0, fat: 0 }
            ),
        [entries]
    );
    const chartMetrics = {
        calories: {
            label: "Calories",
            unit: "kcal",
            goal: 2200,
            color: "#c6f36a",
            gradientId: "calorieGradient",
        },
        protein: {
            label: "Protein",
            unit: "g",
            goal: 150,
            color: "#bd8aff",
            gradientId: "proteinGradient",
        },
    };

    const selectedMetric = chartMetrics[activeMetric];

    const periodDays = period === "weekly" ? weekDays : monthDays;

    const chartData = useMemo(
        () =>
            periodDays.map((day) => ({
                ...day,
                chartValue:
                    day.date <= today && Number(day.entries || 0) > 0
                        ? Number(day[activeMetric] || 0)
                        : null,
            })),
        [periodDays, activeMetric, today]
    );

    const weeklyAverage = useMemo(() => {
        const recordedDays = chartData.filter(
            (day) => day.chartValue !== null
        );

        if (recordedDays.length === 0) return null;

        return (
            recordedDays.reduce(
                (sum, day) => sum + day.chartValue,
                0
            ) / recordedDays.length
        );
    }, [chartData]);
    const nutritionMetrics = [
        {
            label: "Calories",
            value: totals.calories,
            goal: 2200,
            unit: "kcal",
            style: "calories",
            decimals: 0,
        },
        {
            label: "Protein",
            value: totals.protein,
            goal: 150,
            unit: "g",
            style: "protein",
            decimals: 1,
        },
        {
            label: "Carbs",
            value: totals.carbs,
            goal: 250,
            unit: "g",
            style: "carbs",
            decimals: 1,
        },
        {
            label: "Fat",
            value: totals.fat,
            goal: 70,
            unit: "g",
            style: "fat",
            decimals: 1,
        },
    ].map((metric) => {
        const percentage =
            metric.goal > 0
                ? (metric.value / metric.goal) * 100
                : null;

        return {
            ...metric,
            percentage,
            progress: percentage === null
                ? 0
                : Math.min(percentage, 100),
        };
    });

    const macroBreakdown = [
        {
            name: "Protein",
            grams: totals.protein,
            calories: totals.protein * 4,
            color: "#c6f36a",
        },
        {
            name: "Carbs",
            grams: totals.carbs,
            calories: totals.carbs * 4,
            color: "#72b8ff",
        },
        {
            name: "Fat",
            grams: totals.fat,
            calories: totals.fat * 9,
            color: "#ffad73",
        },
    ];

    const totalMacroCalories = macroBreakdown.reduce(
        (sum, macro) => sum + macro.calories,
        0
    );

    const macroData = macroBreakdown
        .filter((macro) => macro.calories > 0)
        .map((macro) => ({
            ...macro,
            value: macro.calories,
        }));

    const mealData = useMemo(
        () =>
            MEAL_TYPES.map((mealType) => ({
                meal: mealType,
                calories: Math.round(
                    entries
                        .filter((entry) => entry.mealType === mealType)
                        .reduce((sum, entry) => sum + Number(entry.calories || 0), 0)
                ),
                count: entries.filter((entry) => entry.mealType === mealType).length,
            })),
        [entries]
    );
    function getMicronutrientCategory(nutrient) {
        const category = String(nutrient.category || "").toLowerCase();

        if (category.includes("vitamin")) return "Vitamins";
        if (category.includes("mineral")) return "Minerals";

        return "Other";
    }

    const micronutrientCategories = ["All", "Vitamins", "Minerals", "Other"];

    const micronutrientCounts = {
        All: micronutrients.length,
        Vitamins: micronutrients.filter(
            (item) => getMicronutrientCategory(item) === "Vitamins"
        ).length,
        Minerals: micronutrients.filter(
            (item) => getMicronutrientCategory(item) === "Minerals"
        ).length,
        Other: micronutrients.filter(
            (item) => getMicronutrientCategory(item) === "Other"
        ).length,
    };

    const filteredMicronutrients =
        activeMicronutrientFilter === "All"
            ? micronutrients
            : micronutrients.filter(
                (item) =>
                    getMicronutrientCategory(item) === activeMicronutrientFilter
            );

    const isToday = selectedDate === getToday();

    return (
        <div className="nutrition-history">
            <div className="nutrition-history-heading">
                <div>
                    <h2>Nutrition History</h2>
                    <p>Your nutrition patterns, one day at a time.</p>
                </div>
                <CalendarDays size={24} />
            </div>

            <div className="nutrition-history-date">
                <button
                    type="button"
                    className="nutrition-history-nav"
                    aria-label="Previous day"
                    onClick={() => setSelectedDate((date) => shiftDate(date, -1))}
                >
                    <ChevronLeft size={19} />
                </button>

                <div className="nutrition-history-date-input">
                    <label htmlFor="history-date">Selected day</label>
                    <input
                        id="history-date"
                        type="date"
                        value={selectedDate}
                        max={getToday()}
                        onChange={(event) => {
                            if (event.target.value) setSelectedDate(event.target.value);
                        }}
                    />
                </div>

                <button
                    type="button"
                    className="nutrition-history-nav"
                    aria-label="Next day"
                    disabled={isToday}
                    onClick={() => setSelectedDate((date) => shiftDate(date, 1))}
                >
                    <ChevronRight size={19} />
                </button>
            </div>

            <div className="nutrition-history-date-label">
                <div className="nutrition-history-selected-label">
                    {formatLongDate(selectedDate)}
                    {isToday && <span>Today</span>}
                </div>

                {!isToday && (
                    <button
                        type="button"
                        className="nutrition-history-today-button"
                        onClick={() => setSelectedDate(today)}
                    >
                        Today
                    </button>
                )}
            </div>
            <div className="nutrition-history-week-strip">
                {weekDates.map((date) => {
                    const isSelected = date === selectedDate;
                    const isCurrentDay = date === today;
                    const isFuture = date > today;
                    const hasData = hasNutritionData(date);

                    return (
                        <button
                            key={date}
                            type="button"
                            className={`nutrition-history-week-day ${isSelected ? "selected" : ""
                                } ${isCurrentDay ? "current-day" : ""}`}
                            disabled={isFuture}
                            aria-pressed={isSelected}
                            aria-label={formatLongDate(date)}
                            onClick={() => setSelectedDate(date)}
                        >
                            <span className="nutrition-history-week-name">
                                {new Date(`${date}T12:00:00`).toLocaleDateString(
                                    "en-IN",
                                    { weekday: "short" }
                                )}
                            </span>

                            <span className="nutrition-history-week-number">
                                {new Date(`${date}T12:00:00`).getDate()}
                            </span>

                            <span className="nutrition-history-week-indicator">
                                {hasData ? "●" : ""}
                            </span>
                        </button>
                    );
                })}
            </div>

            {error && (
                <div role="alert" className="nutrition-history-error">
                    {error}
                </div>
            )}

            {!error && (
                <>
                    <section className="nutrition-history-section">
                        <div className="nutrition-history-section-heading">
                            <div>
                                <h3>{period === "weekly" ? "Weekly nutrition trend" : "Monthly nutrition trend"}</h3>
                                <p>
                                    Track your daily intake against your nutrition goals.
                                </p>
                            </div>

                            <div className="nutrition-history-metric-switch" role="group" aria-label="Select nutrition metric">
                                <button
                                    type="button"
                                    className={activeMetric === "calories" ? "active" : ""}
                                    aria-pressed={activeMetric === "calories"}
                                    onClick={() => setActiveMetric("calories")}
                                >
                                    Calories
                                </button>

                                <button
                                    type="button"
                                    className={activeMetric === "protein" ? "active" : ""}
                                    aria-pressed={activeMetric === "protein"}
                                    onClick={() => setActiveMetric("protein")}
                                >
                                    Protein
                                </button>
                            </div>
                            <div className="nutrition-history-period-switch">
                                <button
                                    type="button"
                                    className={period === "weekly" ? "active" : ""}
                                    aria-pressed={period === "weekly"}
                                    onClick={() => setPeriod("weekly")}
                                >
                                    Weekly
                                </button>

                                <button
                                    type="button"
                                    className={period === "monthly" ? "active" : ""}
                                    aria-pressed={period === "monthly"}
                                    onClick={() => setPeriod("monthly")}
                                >
                                    Monthly
                                </button>
                            </div>
                        </div>

                        {weeklyError ? (
                            <p role="alert" className="nutrition-history-error">
                                {weeklyError}
                            </p>
                        ) : weeklyLoading ? (
                            <p className="nutrition-history-status">
                                Loading {period === "weekly" ? "weekly" : "monthly"} trend...
                            </p>
                        ) : (
                            <>
                                <div className="nutrition-history-chart-summary">
                                    <div>
                                        <span>
                                            {period === "weekly" ? "Weekly average" : "Monthly average"}
                                        </span>
                                        <strong style={{ color: selectedMetric.color }}>
                                            {weeklyAverage === null
                                                ? "--"
                                                : `${weeklyAverage.toLocaleString("en-IN", {
                                                    maximumFractionDigits: activeMetric === "calories" ? 0 : 1,
                                                })} ${selectedMetric.unit}`}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Daily target</span>
                                        <strong>
                                            {selectedMetric.goal.toLocaleString("en-IN")}{" "}
                                            {selectedMetric.unit}
                                        </strong>
                                    </div>
                                </div>

                                <div
                                    className={`nutrition-history-chart ${period === "monthly" ? "monthly-chart" : ""
                                        }`}
                                >
                                    <div className={period === "monthly" ? "monthly-chart-inner" : ""}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart
                                                data={chartData}
                                                margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                                            >
                                                <defs>
                                                    <linearGradient
                                                        id={selectedMetric.gradientId}
                                                        x1="0"
                                                        y1="0"
                                                        x2="0"
                                                        y2="1"
                                                    >
                                                        <stop
                                                            offset="0%"
                                                            stopColor={selectedMetric.color}
                                                            stopOpacity={0.35}
                                                        />
                                                        <stop
                                                            offset="55%"
                                                            stopColor={selectedMetric.color}
                                                            stopOpacity={0.12}
                                                        />
                                                        <stop
                                                            offset="100%"
                                                            stopColor={selectedMetric.color}
                                                            stopOpacity={0.01}
                                                        />
                                                    </linearGradient>
                                                    <filter id="chartLineGlow" x="-50%" y="-50%" width="200%" height="200%">
                                                        <feGaussianBlur stdDeviation="3" result="blur" />
                                                        <feMerge>
                                                            <feMergeNode in="blur" />
                                                            <feMergeNode in="SourceGraphic" />
                                                        </feMerge>
                                                    </filter>
                                                </defs>

                                                <CartesianGrid
                                                    stroke="#343a34"
                                                    strokeDasharray="4 4"
                                                    vertical={false}
                                                />

                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={formatDay}
                                                    stroke="#8b9488"
                                                    tickLine={false}
                                                    axisLine={false}
                                                />

                                                <YAxis
                                                    stroke="#8b9488"
                                                    tickLine={false}
                                                    axisLine={false}
                                                    width={55}
                                                    domain={[
                                                        0,
                                                        (dataMax) =>
                                                            Math.ceil(
                                                                Math.max(dataMax, selectedMetric.goal) * 1.15
                                                            ),
                                                    ]}
                                                />

                                                <Tooltip
                                                    labelFormatter={(label) => formatLongDate(label)}
                                                    formatter={(value) => [
                                                        `${Number(value).toLocaleString("en-IN", {
                                                            maximumFractionDigits: 1,
                                                        })} ${selectedMetric.unit}`,
                                                        selectedMetric.label,
                                                    ]}
                                                    contentStyle={{
                                                        background: "#1c211c",
                                                        border: "1px solid #3a4436",
                                                        borderRadius: 12,
                                                        color: "#f2f5ed",
                                                    }}
                                                />

                                                <ReferenceLine
                                                    y={selectedMetric.goal}
                                                    stroke="#FFA454"
                                                    strokeDasharray="6 5"
                                                    strokeWidth={2}
                                                    label={{
                                                        value: `Goal: ${selectedMetric.goal.toLocaleString("en-IN")} ${selectedMetric.unit}`,
                                                        position: "insideTopRight",
                                                        fill: "#FFA454",
                                                        fontSize: 11,
                                                    }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="chartValue"
                                                    stroke={selectedMetric.color}
                                                    strokeWidth={3}
                                                    strokeLinecap="round"
                                                    fill={`url(#${selectedMetric.gradientId})`}
                                                    connectNulls={false}
                                                    dot={{
                                                        r: 3.5,
                                                        fill: selectedMetric.color,
                                                        stroke: "#171c17",
                                                        strokeWidth: 2,
                                                    }}
                                                    activeDot={{
                                                        r: 6,
                                                        fill: selectedMetric.color,
                                                        stroke: "#f2eaff",
                                                        strokeWidth: 2,
                                                        style: {
                                                            filter: "drop-shadow(0 0 7px rgba(192, 132, 252, 0.8))",
                                                        },
                                                    }}
                                                    style={{
                                                        filter: "url(#chartLineGlow)",
                                                    }}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </>
                        )}
                    </section>

                    {/* <section className="nutrition-history-section">
                        <div className="nutrition-history-section-heading">
                            <div>
                                <h3>Weekly calorie trend</h3>
                                <p>Daily calorie intake, Monday through Sunday.</p>
                            </div>
                            <span className="nutrition-history-chart-unit">kcal</span>
                        </div>



                        {weeklyError ? (
                            <p role="alert" className="nutrition-history-error">{weeklyError}</p>
                        ) : weeklyLoading ? (
                            <p className="nutrition-history-status">Loading weekly trend...</p>
                        ) : (
                            <div className="nutrition-history-chart">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={weekDays}>
                                        <defs>
                                            <linearGradient id="calorieGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#c6f36a" stopOpacity={0.3} />
                                                <stop offset="100%" stopColor="#c6f36a" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid stroke="#343a34" strokeDasharray="4 4" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={formatDay}
                                            stroke="#8b9488"
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#8b9488"
                                            tickLine={false}
                                            axisLine={false}
                                            width={48}
                                        />
                                        <Tooltip
                                            labelFormatter={(label) => formatLongDate(label)}
                                            formatter={(value) => [`${Math.round(value)} kcal`, "Calories"]}
                                            contentStyle={{
                                                background: "#1c211c",
                                                border: "1px solid #3a4436",
                                                borderRadius: 12,
                                                color: "#f2f5ed",
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="calories"
                                            stroke="#c6f36a"
                                            strokeWidth={3}
                                            fill="url(#calorieGradient)"
                                            activeDot={{ r: 5 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </section> */}
                    <section className="nutrition-history-section micronutrient-panel">
                        <div className="panel-heading micronutrient-heading">
                            <div>
                                <h2>Micronutrient intake</h2>
                                <p>Vitamins, minerals, and other nutrients for this day.</p>
                            </div>

                            <span className="micronutrient-source-note">
                                <span className="micronutrient-source-dot" />
                                Daily history
                            </span>
                        </div>

                        {micronutrientsLoading ? (
                            <p className="nutrition-history-status">
                                Loading micronutrient history...
                            </p>
                        ) : micronutrientsError ? (
                            <div className="micronutrient-empty" role="alert">
                                <p>Could not load micronutrient history.</p>
                                <span>{micronutrientsError}</span>
                            </div>
                        ) : micronutrients.length === 0 ? (
                            <div className="micronutrient-empty">
                                <p>No micronutrient data for this day yet.</p>
                                <span>
                                    Record food or supplement entries to see your daily
                                    micronutrient intake here.
                                </span>
                            </div>
                        ) : (
                            <>
                                <div
                                    className="micronutrient-filters"
                                    role="group"
                                    aria-label="Filter micronutrients by category"
                                >
                                    {micronutrientCategories.map((category) => (
                                        <button
                                            key={category}
                                            type="button"
                                            className={`micronutrient-filter ${activeMicronutrientFilter === category
                                                ? "active"
                                                : ""
                                                }`}
                                            aria-pressed={activeMicronutrientFilter === category}
                                            onClick={() => setActiveMicronutrientFilter(category)}
                                        >
                                            {category}

                                            <span>{micronutrientCounts[category]}</span>
                                        </button>
                                    ))}
                                </div>

                                {filteredMicronutrients.length === 0 ? (
                                    <div className="micronutrient-filter-empty">
                                        No nutrients found in this category.
                                    </div>
                                ) : (
                                    <div
                                        className="micronutrient-scroll"
                                        aria-label="Daily micronutrient intake"
                                    >
                                        {filteredMicronutrients.map((nutrient) => {
                                            const amount =
                                                nutrient.amount === null ||
                                                    nutrient.amount === undefined ||
                                                    nutrient.amount === ""
                                                    ? null
                                                    : Number(nutrient.amount);

                                            const target =
                                                nutrient.target === null ||
                                                    nutrient.target === undefined ||
                                                    nutrient.target === ""
                                                    ? null
                                                    : Number(nutrient.target);

                                            const hasAmount =
                                                amount !== null && Number.isFinite(amount);

                                            const hasTarget =
                                                target !== null &&
                                                Number.isFinite(target) &&
                                                target > 0;

                                            const percentage =
                                                hasAmount && hasTarget
                                                    ? (amount / target) * 100
                                                    : null;

                                            const progress =
                                                percentage === null
                                                    ? 0
                                                    : Math.min(percentage, 100);

                                            const statusClass =
                                                !hasAmount
                                                    ? "micronutrient-unavailable"
                                                    : !hasTarget
                                                        ? "micronutrient-no-target"
                                                        : percentage >= 100
                                                            ? "micronutrient-complete"
                                                            : "micronutrient-progress";

                                            return (
                                                <article
                                                    className={`micronutrient-card ${statusClass}`}
                                                    key={nutrient.key || nutrient.name}
                                                >
                                                    <div className="micronutrient-card-header">
                                                        <div className="micronutrient-card-top">
                                                            <span>{nutrient.name}</span>

                                                            <span className="micronutrient-category">
                                                                {nutrient.category || "Nutrient"}
                                                            </span>
                                                        </div>

                                                        <span className="micronutrient-percent-badge">
                                                            {percentage === null
                                                                ? "—"
                                                                : `${Math.round(percentage)}%`}
                                                        </span>
                                                    </div>

                                                    <div className="micronutrient-amount">
                                                        {hasAmount
                                                            ? amount.toLocaleString("en-IN", {
                                                                maximumFractionDigits: 2,
                                                            })
                                                            : "—"}

                                                        <span>{nutrient.unit || ""}</span>
                                                    </div>

                                                    <div
                                                        className="micronutrient-progress-track"
                                                        role="progressbar"
                                                        aria-label={`${nutrient.name} daily target`}
                                                        aria-valuemin={0}
                                                        aria-valuemax={100}
                                                        aria-valuenow={progress}
                                                    >
                                                        <div
                                                            className="micronutrient-progress-fill"
                                                            style={{
                                                                width: `${progress}%`,
                                                            }}
                                                        />
                                                    </div>

                                                    {hasAmount ? (
                                                        <div className="micronutrient-card-footer">
                                                            <span>
                                                                {percentage === null
                                                                    ? "Amount recorded"
                                                                    : percentage >= 100
                                                                        ? "Target reached"
                                                                        : `${Math.round(percentage)}% of daily target`}
                                                            </span>

                                                            <span>
                                                                {hasTarget
                                                                    ? `Target: ${target.toLocaleString(
                                                                        "en-IN"
                                                                    )} ${nutrient.unit || ""}`
                                                                    : "No target configured"}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="micronutrient-unavailable">
                                                            Amount unavailable
                                                        </div>
                                                    )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                    <div className="nutrition-history-chart-grid">
                        <section className="nutrition-history-section">
                            <div className="nutrition-history-section-heading">
                                <div>
                                    <h3>Macro composition</h3>
                                    <p>Estimated calories by macronutrient.</p>
                                </div>
                            </div>

                            {loading ? (
                                <p className="nutrition-history-status">Loading macros...</p>
                            ) : macroData.length === 0 ? (
                                <div className="nutrition-history-chart-empty">
                                    <p>No macro data for this day yet.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="nutrition-history-macro-layout">
                                        <div className="nutrition-history-donut-wrap">
                                            <div className="nutrition-history-donut">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={macroData}
                                                            dataKey="value"
                                                            nameKey="name"
                                                            innerRadius="66%"
                                                            outerRadius="86%"
                                                            paddingAngle={4}
                                                            stroke="none"
                                                        >
                                                            {macroData.map((macro) => (
                                                                <Cell
                                                                    key={macro.name}
                                                                    fill={macro.color}
                                                                />
                                                            ))}
                                                        </Pie>

                                                        <Tooltip
                                                            formatter={(value) => [
                                                                `${Math.round(value)} kcal`,
                                                                "Energy",
                                                            ]}
                                                            contentStyle={{
                                                                background: "#1c211c",
                                                                border: "1px solid #3a4436",
                                                                borderRadius: 12,
                                                                color: "#f2f5ed",
                                                            }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>

                                            <div className="nutrition-history-donut-center">
                                                <strong>
                                                    {Math.round(totalMacroCalories).toLocaleString("en-IN")}
                                                </strong>
                                                <span>macro kcal</span>
                                            </div>
                                        </div>

                                        <div className="nutrition-history-macro-legend">
                                            {macroBreakdown.map((macro) => {
                                                const percentage =
                                                    totalMacroCalories > 0
                                                        ? (macro.calories / totalMacroCalories) * 100
                                                        : 0;

                                                return (
                                                    <div
                                                        className="nutrition-history-macro-item"
                                                        key={macro.name}
                                                    >
                                                        <div className="nutrition-history-macro-item-heading">
                                                            <span>
                                                                <i style={{ background: macro.color }} />
                                                                {macro.name}
                                                            </span>

                                                            <strong>{percentage.toFixed(1)}%</strong>
                                                        </div>

                                                        <div className="nutrition-history-macro-item-values">
                                                            <span>{Number(macro.grams).toFixed(1)} g</span>
                                                            <span>{Math.round(macro.calories)} kcal</span>
                                                        </div>

                                                        <div className="nutrition-history-macro-track">
                                                            <div
                                                                style={{
                                                                    width: `${percentage}%`,
                                                                    background: macro.color,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <p className="nutrition-history-chart-note">
                                        Protein and carbohydrates provide 4 kcal/g, while fat provides
                                        9 kcal/g. Percentages represent each macro's share of total
                                        macro calories.
                                    </p>
                                </>
                            )}
                        </section>

                        <section className="nutrition-history-section">
                            <div className="nutrition-history-section-heading">
                                <div>
                                    <h3>Meal breakdown</h3>
                                    <p>Calories recorded for each meal.</p>
                                </div>
                            </div>

                            {loading ? (
                                <p className="nutrition-history-status">Loading meal breakdown...</p>
                            ) : (
                                <div className="nutrition-history-meals-chart">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={mealData}
                                            layout="vertical"
                                            margin={{ top: 8, right: 20, left: 4, bottom: 0 }}
                                            barCategoryGap="35%"
                                        >
                                            <CartesianGrid
                                                stroke="#343a34"
                                                strokeDasharray="3 5"
                                                horizontal={false}
                                                vertical
                                            />

                                            <XAxis
                                                type="number"
                                                stroke="#8b9488"
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{ fill: "#8b9488", fontSize: 11 }}
                                            />

                                            <YAxis
                                                type="category"
                                                dataKey="meal"
                                                width={75}
                                                stroke="#b8c0b2"
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{ fill: "#cbd3c4", fontSize: 12 }}
                                            />

                                            <Tooltip
                                                formatter={(value) => [
                                                    `${Math.round(value)} kcal`,
                                                    "Calories",
                                                ]}
                                                contentStyle={{
                                                    background: "#1c211c",
                                                    border: "1px solid #3a4436",
                                                    borderRadius: 12,
                                                    color: "#ADD8E6",
                                                }}
                                                itemStyle={{
                                                    color: "#CBC3E3",
                                                    fontWeight: 600,
                                                }}
                                                labelStyle={{
                                                    color: "#ffad73",
                                                    fontWeight: 600,
                                                    marginBottom: 6,
                                                }}
                                                cursor={{ fill: "rgba(255,255,255,0.035)" }}
                                            />

                                            <Bar
                                                dataKey="calories"
                                                radius={[0, 7, 7, 0]}
                                                maxBarSize={25}
                                            >
                                                {mealData.map((meal) => (
                                                    <Cell
                                                        key={meal.meal}
                                                        fill={MEAL_COLORS[meal.meal]}
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                            {!loading && (
                                <div className="nutrition-history-meal-counts">
                                    {mealData.map((meal) => {
                                        const percentage =
                                            totals.calories > 0
                                                ? (meal.calories / totals.calories) * 100
                                                : 0;

                                        return (
                                            <div
                                                className="nutrition-history-meal-summary"
                                                key={meal.meal}
                                            >
                                                <div className="nutrition-history-meal-summary-name">
                                                    <span
                                                        className="nutrition-history-meal-dot"
                                                        style={{
                                                            background: MEAL_COLORS[meal.meal],
                                                        }}
                                                    />
                                                    <span>{meal.meal}</span>
                                                </div>

                                                <strong>
                                                    {Math.round(meal.calories)} kcal
                                                </strong>

                                                <span className="nutrition-history-meal-percentage">
                                                    {percentage.toFixed(1)}%
                                                </span>

                                                <span className="nutrition-history-meal-entry-count">
                                                    {meal.count} {meal.count === 1 ? "entry" : "entries"}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>

                    <section className="nutrition-history-section nutrition-history-list">
                        <div className="nutrition-history-section-heading">
                            <div>
                                <h3>Food journal</h3>
                                <p>Everything recorded on this day.</p>
                            </div>
                            <span className="nutrition-history-entry-count">
                                {entries.length} {entries.length === 1 ? "entry" : "entries"}
                            </span>
                        </div>

                        {loading ? (
                            <p className="nutrition-history-status">Loading food journal...</p>
                        ) : entries.length === 0 ? (
                            <div className="nutrition-history-empty">
                                <Utensils size={28} />
                                <p>No food entries for this date.</p>
                            </div>
                        ) : (
                            <div className="nutrition-history-entry-scroll">
                                <div className="nutrition-history-entry-list">
                                    {entries.map((entry) => (
                                        <article className="nutrition-history-entry" key={entry.id}>
                                            <div className="nutrition-history-entry-main">
                                                <h4>{entry.foodName}</h4>
                                                <span>{entry.mealType}</span>
                                            </div>
                                            <div className="nutrition-history-entry-values">
                                                <strong className="nutrition-history-calorie-badge">
                                                    {Math.round(Number(entry.calories))} kcal
                                                </strong>

                                                <div className="nutrition-history-macro-badges">
                                                    <span className="nutrition-history-macro-badge protein">
                                                        <b>P</b> {Number(entry.protein).toFixed(1)} g
                                                    </span>

                                                    <span className="nutrition-history-macro-badge carbs">
                                                        <b>C</b> {Number(entry.carbs).toFixed(1)} g
                                                    </span>

                                                    <span className="nutrition-history-macro-badge fat">
                                                        <b>F</b> {Number(entry.fat).toFixed(1)} g
                                                    </span>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                </>
            )}

        </div>
    );
}