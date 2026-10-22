
import { useEffect, useState } from "react";
import {
  Activity,
  Flame,
  Beef,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import "./nutrition.css";

const MACRO_COLORS = ["#c6f36a", "#7c9cff", "#f5a66b"];

function getMonday(date) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);

  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));

  return result;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatShortDate(dateString) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(
    "en-IN",
    { weekday: "short", day: "numeric" }
  );
}

function formatWeekRange(startDate) {
  const endDate = new Date(`${startDate}T12:00:00`);
  endDate.setDate(endDate.getDate() + 6);

  return `${new Date(`${startDate}T12:00:00`).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "short" }
  )} – ${endDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

const number = (value) => Math.round(Number(value) || 0);

export default function NutritionInsights() {
  const [weekStart, setWeekStart] = useState(() =>
    getMonday(new Date())
  );
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const startDate = formatDate(weekStart);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchWeeklyNutrition() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `http://localhost:5000/api/nutrition/weekly?startDate=${startDate}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Unable to load nutrition insights.");
        }

        const result = await response.json();
        setDays(Array.isArray(result.days) ? result.days : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Something went wrong.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchWeeklyNutrition();

    return () => controller.abort();
  }, [startDate]);

  const totals = days.reduce(
    (acc, day) => ({
      calories: acc.calories + Number(day.calories || 0),
      protein: acc.protein + Number(day.protein || 0),
      carbs: acc.carbs + Number(day.carbs || 0),
      fat: acc.fat + Number(day.fat || 0),
      entries: acc.entries + Number(day.entries || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 }
  );

  const daysWithEntries = days.filter(
    (day) => Number(day.entries || 0) > 0
  ).length;

  const average = (value) =>
    days.length ? Math.round(value / days.length) : 0;

  const macroData = [
    { name: "Protein", value: Math.round(totals.protein) },
    { name: "Carbs", value: Math.round(totals.carbs) },
    { name: "Fat", value: Math.round(totals.fat) },
  ].filter((item) => item.value > 0);

  const highestCalorieDay = days.reduce(
    (best, day) =>
      !best || Number(day.calories || 0) > Number(best.calories || 0)
        ? day
        : best,
    null
  );

  const previousWeek = () => {
    setWeekStart((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const nextWeek = () => {
    const currentMonday = getMonday(new Date());

    setWeekStart((current) => {
      if (current >= currentMonday) return current;

      const next = new Date(current);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const isCurrentWeek = weekStart >= getMonday(new Date());

  return (
    <main className="nutrition-insights">
      <header className="ni-header">
        <div>
          <p className="ni-eyebrow">YOUR NUTRITION</p>
          <h1>Nutrition Insights</h1>
          <p className="ni-subtitle">
            Understand your eating patterns and track your progress.
          </p>
        </div>

        <div className="ni-header-icon">
          <Activity size={25} />
        </div>
      </header>

      <section className="ni-week-selector">
        <button
          type="button"
          className="ni-icon-button"
          onClick={previousWeek}
          aria-label="Previous week"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="ni-week-label">
          <span>WEEKLY OVERVIEW</span>
          <strong>{formatWeekRange(startDate)}</strong>
        </div>

        <button
          type="button"
          className="ni-icon-button"
          onClick={nextWeek}
          disabled={isCurrentWeek}
          aria-label="Next week"
        >
          <ChevronRight size={20} />
        </button>
      </section>

      {error && (
        <div className="ni-error">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setWeekStart(new Date(weekStart))}
          >
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="ni-state">Loading your nutrition data...</div>
      ) : !error ? (
        <>
          <section className="ni-stats-grid">
            <article className="ni-stat-card">
              <div className="ni-stat-icon ni-lime">
                <Flame size={20} />
              </div>
              <p>Average daily calories</p>
              <h2>{number(average(totals.calories)).toLocaleString("en-IN")}</h2>
              <span>kcal per calendar day</span>
            </article>

            <article className="ni-stat-card">
              <div className="ni-stat-icon ni-blue">
                <Beef size={20} />
              </div>
              <p>Average daily protein</p>
              <h2>{average(totals.protein)}<small> g</small></h2>
              <span>Across the selected week</span>
            </article>

            <article className="ni-stat-card">
              <div className="ni-stat-icon ni-orange">
                <TrendingUp size={20} />
              </div>
              <p>Days logged</p>
              <h2>{daysWithEntries}<small> / 7</small></h2>
              <span>{totals.entries} food entries recorded</span>
            </article>
          </section>

          <section className="ni-chart-grid">
            <article className="ni-panel ni-calorie-panel">
              <div className="ni-panel-heading">
                <div>
                  <h2>Calorie trend</h2>
                  <p>Your daily calorie intake</p>
                </div>
                <Flame size={20} />
              </div>

              {days.length > 0 ? (
                <div className="ni-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={days.map((day) => ({
                        ...day,
                        label: formatShortDate(day.date),
                      }))}
                      margin={{ top: 12, right: 4, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid
                        stroke="#30352e"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#9b9f96", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#9b9f96", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "#ffffff08" }}
                        contentStyle={{
                          background: "#20231e",
                          border: "1px solid #3a4033",
                          borderRadius: 10,
                          color: "#f4f5ef",
                        }}
                        formatter={(value) => [
                          `${number(value).toLocaleString("en-IN")} kcal`,
                          "Calories",
                        ]}
                      />
                      <Bar
                        dataKey="calories"
                        fill="#c6f36a"
                        radius={[5, 5, 0, 0]}
                        maxBarSize={38}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="ni-empty">No daily data available yet.</div>
              )}
            </article>

            <article className="ni-panel">
              <div className="ni-panel-heading">
                <div>
                  <h2>Macro breakdown</h2>
                  <p>Total grams for this week</p>
                </div>
                <Beef size={20} />
              </div>

              {macroData.length > 0 ? (
                <>
                  <div className="ni-donut">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={macroData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="62%"
                          outerRadius="84%"
                          paddingAngle={4}
                          stroke="none"
                        >
                          {macroData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={
                                MACRO_COLORS[
                                  ["Protein", "Carbs", "Fat"].indexOf(entry.name)
                                ]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "#20231e",
                            border: "1px solid #3a4033",
                            borderRadius: 10,
                            color: "#f4f5ef",
                          }}
                          formatter={(value) => [`${number(value)} g`]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="ni-donut-center">
                      <strong>
                        {number(
                          totals.protein + totals.carbs + totals.fat
                        )}
                      </strong>
                      <span>total grams</span>
                    </div>
                  </div>

                  <div className="ni-macro-legend">
                    {macroData.map((macro) => (
                      <div key={macro.name}>
                        <span>
                          <i
                            style={{
                              background:
                                MACRO_COLORS[
                                  ["Protein", "Carbs", "Fat"].indexOf(macro.name)
                                ],
                            }}
                          />
                          {macro.name}
                        </span>
                        <strong>{number(macro.value)} g</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="ni-empty">Log food to see your macros.</div>
              )}
            </article>
          </section>

          <section className="ni-panel ni-breakdown-panel">
            <div className="ni-panel-heading">
              <div>
                <h2>Daily breakdown</h2>
                <p>Compare your nutrition across the week.</p>
              </div>
            </div>

            {days.length > 0 ? (
              <div className="ni-table-scroll">
                <table className="ni-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Calories</th>
                      <th>Protein</th>
                      <th>Carbs</th>
                      <th>Fat</th>
                      <th>Entries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((day) => (
                      <tr key={day.date}>
                        <td>{formatShortDate(day.date)}</td>
                        <td>{number(day.calories).toLocaleString("en-IN")} kcal</td>
                        <td>{number(day.protein)} g</td>
                        <td>{number(day.carbs)} g</td>
                        <td>{number(day.fat)} g</td>
                        <td>{number(day.entries)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="ni-empty">No nutrition records for this week.</div>
            )}
          </section>

          <section className="ni-highlight">
            <div className="ni-highlight-icon">
              <TrendingUp size={21} />
            </div>
            <div>
              <span>WEEKLY HIGHLIGHT</span>
              {totals.entries === 0 ? (
                <p>
                  Start logging your meals to discover patterns in your
                  calorie and macro intake.
                </p>
              ) : (
                <p>
                  You logged food on {daysWithEntries} of 7 days and recorded{" "}
                  {number(totals.calories).toLocaleString("en-IN")} kcal in
                  total.
                  {highestCalorieDay &&
                    Number(highestCalorieDay.calories) > 0 && (
                      <>
                        {" "}Your highest-calorie day was{" "}
                        {formatShortDate(highestCalorieDay.date)}.
                      </>
                    )}
                </p>
              )}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
