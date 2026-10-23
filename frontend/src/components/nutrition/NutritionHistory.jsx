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
    const [loading, setLoading] = useState(false);
    const [weeklyLoading, setWeeklyLoading] = useState(false);
    const [error, setError] = useState("");
    const [weeklyError, setWeeklyError] = useState("");
    const [micronutrients, setMicronutrients] = useState([]);
    const [micronutrientsLoading, setMicronutrientsLoading] = useState(false);
    const [micronutrientsError, setMicronutrientsError] = useState("");

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

    const macroData = useMemo(
        () => [
            { name: "Protein", value: totals.protein * 4 },
            { name: "Carbs", value: totals.carbs * 4 },
            { name: "Fat", value: totals.fat * 9 },
        ].filter((macro) => macro.value > 0),
        [totals]
    );

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
                {formatLongDate(selectedDate)}
                {isToday && <span>Today</span>}
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
                                <h3>Daily overview</h3>
                                <p>Your total intake for this day.</p>
                            </div>
                        </div>

                        {loading ? (
                            <p className="nutrition-history-status">Loading daily nutrition...</p>
                        ) : (
                            <div className="nutrition-history-summary">
                                <div>
                                    <span>Calories</span>
                                    <strong>{Math.round(totals.calories)} <small>kcal</small></strong>
                                </div>
                                <div>
                                    <span>Protein</span>
                                    <strong>{totals.protein.toFixed(1)} <small>g</small></strong>
                                </div>
                                <div>
                                    <span>Carbs</span>
                                    <strong>{totals.carbs.toFixed(1)} <small>g</small></strong>
                                </div>
                                <div>
                                    <span>Fat</span>
                                    <strong>{totals.fat.toFixed(1)} <small>g</small></strong>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="nutrition-history-section">
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
                    </section>
                    <section className="nutrition-history-section">
                        <div className="nutrition-history-section-heading">
                            <div>
                                <h3>Micronutrient intake</h3>
                                <p>Vitamins, minerals, and other nutrients for this day.</p>
                            </div>
                        </div>

                        {micronutrientsLoading ? (
                            <p className="nutrition-history-status">
                                Loading micronutrient history...
                            </p>
                        ) : micronutrientsError ? (
                            <p role="alert" className="nutrition-history-error">
                                {micronutrientsError}
                            </p>
                        ) : micronutrients.length === 0 ? (
                            <div className="nutrition-history-chart-empty">
                                <p>No micronutrient data for this day yet.</p>
                            </div>
                        ) : (
                            <div className="history-micronutrient-grid">
                                {micronutrients.map((nutrient) => {
                                    const amount = Number(nutrient.amount) || 0;
                                    const target = Number(nutrient.target);

                                    const hasTarget =
                                        nutrient.target != null &&
                                        Number.isFinite(target) &&
                                        target > 0;

                                    const percentage = hasTarget
                                        ? Math.round((amount / target) * 100)
                                        : null;

                                    const progress = percentage == null
                                        ? 0
                                        : Math.min(percentage, 100);

                                    return (
                                        <article
                                            className="history-micronutrient-card"
                                            key={nutrient.key}
                                        >
                                            <div className="history-micronutrient-heading">
                                                <h4>{nutrient.name}</h4>
                                                <span>{nutrient.category || "Nutrient"}</span>
                                            </div>

                                            <div className="history-micronutrient-amount">
                                                {amount.toLocaleString("en-IN", {
                                                    maximumFractionDigits: 2,
                                                })}
                                                <span>{nutrient.unit}</span>
                                            </div>

                                            <div
                                                className="history-micronutrient-track"
                                                role="progressbar"
                                                aria-label={`${nutrient.name} daily target`}
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                                aria-valuenow={progress}
                                            >
                                                <div
                                                    className="history-micronutrient-fill"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>

                                            <p className="history-micronutrient-percentage">
                                                {percentage == null
                                                    ? "No target set"
                                                    : `${percentage}% of daily target`}
                                            </p>

                                            <p className="history-micronutrient-target">
                                                Target: {hasTarget
                                                    ? `${target.toLocaleString("en-IN")} ${nutrient.unit}`
                                                    : "No target set"}
                                            </p>
                                        </article>
                                    );
                                })}
                            </div>
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
                                    <div className="nutrition-history-donut">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={macroData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    innerRadius="62%"
                                                    outerRadius="82%"
                                                    paddingAngle={4}
                                                    stroke="none"
                                                >
                                                    {macroData.map((item, index) => (
                                                        <Cell
                                                            key={item.name}
                                                            fill={MACRO_COLORS[
                                                                ["Protein", "Carbs", "Fat"].indexOf(item.name)
                                                            ]}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value) => [`${Math.round(value)} kcal`, "Energy"]}
                                                    contentStyle={{
                                                        background: "#1c211c",
                                                        border: "1px solid #3a4436",
                                                        borderRadius: 12,
                                                        color: "#f2f5ed",
                                                    }}
                                                />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <p className="nutrition-history-chart-note">
                                        Protein and carbs are estimated at 4 kcal/g; fat at 9 kcal/g.
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
                                        <BarChart data={mealData} layout="vertical" margin={{ left: 4, right: 14 }}>
                                            <CartesianGrid stroke="#343a34" strokeDasharray="4 4" horizontal={false} />
                                            <XAxis
                                                type="number"
                                                stroke="#8b9488"
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                type="category"
                                                dataKey="meal"
                                                width={75}
                                                stroke="#b8c0b2"
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <Tooltip
                                                formatter={(value) => [`${value} kcal`, "Calories"]}
                                                contentStyle={{
                                                    background: "#1c211c",
                                                    border: "1px solid #3a4436",
                                                    borderRadius: 12,
                                                    color: "#f2f5ed",
                                                }}
                                            />
                                            <Bar
                                                dataKey="calories"
                                                fill="#c6f36a"
                                                radius={[0, 6, 6, 0]}
                                                maxBarSize={24}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {!loading && (
                                <div className="nutrition-history-meal-counts">
                                    {mealData.map((meal) => (
                                        <div key={meal.meal}>
                                            <span>{meal.meal}</span>
                                            <strong>{meal.count} {meal.count === 1 ? "entry" : "entries"}</strong>
                                        </div>
                                    ))}
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
                                                <strong>{Math.round(Number(entry.calories))} kcal</strong>
                                                <span>
                                                    P {Number(entry.protein).toFixed(1)} g · C{" "}
                                                    {Number(entry.carbs).toFixed(1)} g · F{" "}
                                                    {Number(entry.fat).toFixed(1)} g
                                                </span>
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