
import { useState, useEffect } from "react";
import {
    Flame,
    Beef,
    Wheat,
    Droplets,
    Plus,
    Utensils, CalendarDays,
    ChartNoAxesCombined,
    Target,
    LayoutDashboard,
    Trash2,
} from "lucide-react";
import NutritionHistory from "./NutritionHistory";
import NutritionInsights from "./NutritionInsights";

const initialMeals = [
    { id: 1, name: "Breakfast", foods: [] },
    { id: 2, name: "Lunch", foods: [] },
    { id: 3, name: "Dinner", foods: [] },
    { id: 4, name: "Snacks", foods: [] },
];

function Nutrition() {
    const [meals, setMeals] = useState(initialMeals);
    const [selectedMeal, setSelectedMeal] = useState("Breakfast");
    const [foodName, setFoodName] = useState("");
    const [calories, setCalories] = useState("");
    const [protein, setProtein] = useState("");
    const [carbs, setCarbs] = useState("");
    const [fat, setFat] = useState("");
    const [foodDescription, setFoodDescription] = useState("");
    const [analyzedFood, setAnalyzedFood] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState("");
    const [activeTab, setActiveTab] = useState("Dashboard");

    const nutritionTabs = [
        { label: "Dashboard", icon: LayoutDashboard },
        { label: "History", icon: CalendarDays },
        { label: "Insights", icon: ChartNoAxesCombined },
        { label: "Goals", icon: Target },
    ];

    useEffect(() => {
        async function fetchMeals() {
            try {
                const today = new Date();

                const date = [
                    today.getFullYear(),
                    String(today.getMonth() + 1).padStart(2, "0"),
                    String(today.getDate()).padStart(2, "0"),
                ].join("-");

                const response = await fetch(
                    `http://localhost:5000/api/nutrition?date=${date}`
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error || "Could not load saved meals."
                    );
                }

                if (!Array.isArray(result)) {
                    throw new Error("Unexpected nutrition data format.");
                }

                const loadedMeals = initialMeals.map((meal) => ({
                    ...meal,
                    foods: result
                        .filter((entry) => entry.mealType === meal.name)
                        .map((entry) => ({
                            id: entry.id,
                            name: entry.foodName,
                            calories: Number(entry.calories),
                            protein: Number(entry.protein),
                            carbs: Number(entry.carbs),
                            fat: Number(entry.fat),
                        })),
                }));

                setMeals(loadedMeals);

                console.log("Nutrition meals loaded:", loadedMeals);
            } catch (error) {
                console.error("Error loading meals:", error);
            }
        }

        fetchMeals();
    }, []);


    const totals = meals.reduce(
        (total, meal) =>
            meal.foods.reduce(
                (sum, food) => ({
                    calories: sum.calories + food.calories,
                    protein: sum.protein + food.protein,
                    carbs: sum.carbs + food.carbs,
                    fat: sum.fat + food.fat,
                }),
                total
            ),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const calorieGoal = 2200;
    const proteinGoal = 150;
    const carbsGoal = 250;
    const fatGoal = 70;

    function addFood(event) {
        event.preventDefault();

        if (
            !foodName.trim() ||
            calories === "" ||
            protein === "" ||
            carbs === "" ||
            fat === ""
        ) {
            return;
        }

        const values = [calories, protein, carbs, fat].map(Number);

        if (
            values.some((value) => !Number.isFinite(value) || value < 0) ||
            Number(calories) > 10000 ||
            [protein, carbs, fat].some((value) => Number(value) > 1000)
        ) {
            return;
        }

        const food = {
            id: crypto.randomUUID(),
            name: foodName.trim(),
            calories: Number(calories),
            protein: Number(protein),
            carbs: Number(carbs),
            fat: Number(fat),
        };

        setMeals((current) =>
            current.map((meal) =>
                meal.name === selectedMeal
                    ? { ...meal, foods: [...meal.foods, food] }
                    : meal
            )
        );

        setFoodName("");
        setCalories("");
        setProtein("");
        setCarbs("");
        setFat("");
    }


    async function removeFood(mealId, foodId) {
        try {
            const response = await fetch(
                `http://localhost:5000/api/nutrition/${foodId}`,
                {
                    method: "DELETE",
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Failed to delete nutrition entry."
                );
            }

            // Update the UI only after the backend confirms deletion.
            setMeals((current) =>
                current.map((meal) =>
                    meal.id === mealId
                        ? {
                            ...meal,
                            foods: meal.foods.filter(
                                (food) => food.id !== foodId
                            ),
                        }
                        : meal
                )
            );
        } catch (error) {
            console.error("Error deleting food:", error);
            alert(error.message || "Could not delete this food.");
        }
    }


    function progress(value, goal) {
        return Math.min(100, (value / goal) * 100);
    }


    async function analyzeFood(event) {
        event.preventDefault();

        if (!foodDescription.trim()) {
            setAnalysisError("Describe what you ate first.");
            return;
        }

        setAnalysisError("");
        setAnalyzing(true);
        setAnalyzedFood(null);

        try {
            const response = await fetch(
                "http://localhost:5000/api/nutrition/analyze",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        description: foodDescription.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Food analysis failed.");
            }

            if (!Array.isArray(data.items) || data.items.length === 0) {
                throw new Error("No food items were identified.");
            }

            setAnalyzedFood({
                items: data.items,
                assumptions: data.assumptions || [],
                note: data.note || "",
            });
        } catch (error) {
            console.error("Food analysis error:", error);
            setAnalysisError(
                error.message || "Could not analyze your food. Please try again."
            );
        } finally {
            setAnalyzing(false);
        }
    }


    async function confirmFood() {
        if (!analyzedFood?.items?.length) return;

        setAnalysisError("");
        setAnalyzing(true);

        try {
            const now = new Date();
            const entryDate = [
                now.getFullYear(),
                String(now.getMonth() + 1).padStart(2, "0"),
                String(now.getDate()).padStart(2, "0"),
            ].join("-");

            const savedFoods = [];

            for (const item of analyzedFood.items) {
                const response = await fetch(
                    "http://localhost:5000/api/nutrition",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            foodName: item.name,
                            mealType: selectedMeal,
                            calories: Number(item.calories),
                            protein: Number(item.protein),
                            carbs: Number(item.carbs),
                            fat: Number(item.fat),
                            entryDate,
                        }),
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || `Failed to save ${item.name}.`
                    );
                }

                savedFoods.push({
                    id: data.id,
                    name: data.foodName,
                    calories: data.calories,
                    protein: data.protein,
                    carbs: data.carbs,
                    fat: data.fat,
                });
            }

            setMeals((currentMeals) =>
                currentMeals.map((meal) =>
                    meal.name === selectedMeal
                        ? {
                            ...meal,
                            foods: [...meal.foods, ...savedFoods],
                        }
                        : meal
                )
            );

            setFoodDescription("");
            setAnalyzedFood(null);
            setAnalysisError("");
        } catch (error) {
            console.error("Saving nutrition entries failed:", error);

            setAnalysisError(
                error.message || "Could not save food entries."
            );
        } finally {
            setAnalyzing(false);
        }
    }

    return (
        <section className="nutrition-page">
            <div className="nutrition-page-heading">
                <div>
                    <div className="eyebrow">YOUR DAILY FUEL</div>
                    <h1>Nutrition<span>.</span></h1>
                    <p>Fuel your body. Support your progress.</p>
                </div>
                <div className="nutrition-date">
                    {new Date().toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                    })}
                </div>
            </div>
            <nav className="nutrition-tabs" aria-label="Nutrition navigation">
                {nutritionTabs.map(({ label, icon: Icon }) => (
                    <button
                        key={label}
                        type="button"
                        className={`nutrition-tab ${activeTab === label ? "active" : ""
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
                    <div className="nutrition-summary-grid">
                        <article className="nutrition-card calorie-card">
                            <div className="nutrition-card-heading">
                                <span>Calories consumed</span>
                                <Flame size={20} />
                            </div>
                            <div className="nutrition-big-number">
                                {totals.calories.toLocaleString("en-IN")}
                                <span> kcal</span>
                            </div>
                            <div className="nutrition-muted">
                                Target: {calorieGoal.toLocaleString("en-IN")} kcal
                            </div>
                            <div className="nutrition-track">
                                <div
                                    className="nutrition-fill calorie-fill"
                                    style={{ width: `${progress(totals.calories, calorieGoal)}%` }}
                                />
                            </div>
                            <div className="nutrition-progress-label">
                                {Math.max(0, calorieGoal - totals.calories).toLocaleString("en-IN")}
                                {" "}kcal remaining
                            </div>
                        </article>

                        {[
                            { label: "Protein", value: totals.protein, goal: proteinGoal, icon: Beef, unit: "g", style: "protein" },
                            { label: "Carbs", value: totals.carbs, goal: carbsGoal, icon: Wheat, unit: "g", style: "carbs" },
                            { label: "Fat", value: totals.fat, goal: fatGoal, icon: Droplets, unit: "g", style: "fat" },
                        ].map((item) => {
                            const Icon = item.icon;

                            return (
                                <article className="nutrition-card" key={item.label}>
                                    <div className="nutrition-card-heading">
                                        <span>{item.label}</span>
                                        <Icon size={20} />
                                    </div>
                                    <div className="nutrition-big-number">
                                        {Math.round(item.value)}
                                        <span> {item.unit}</span>
                                    </div>
                                    <div className="nutrition-muted">
                                        Target: {item.goal} {item.unit}
                                    </div>
                                    <div className="nutrition-track">
                                        <div
                                            className={`nutrition-fill ${item.style}-fill`}
                                            style={{ width: `${progress(item.value, item.goal)}%` }}
                                        />
                                    </div>
                                    <div className="nutrition-progress-label">
                                        {Math.max(0, item.goal - Math.round(item.value))} {item.unit} remaining
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <div className="nutrition-content-grid">
                        <article className="panel nutrition-log-panel">
                            <div className="panel-heading">
                                <div>
                                    <h2>Log your food</h2>
                                    <p>Keep track of what fuels you.</p>
                                </div>
                                <div className="nutrition-panel-icon">
                                    <Plus size={20} />
                                </div>
                            </div>


                            <form className="nutrition-form" onSubmit={analyzeFood}>
                                <label>
                                    What did you eat?
                                    <textarea
                                        value={foodDescription}
                                        onChange={(event) => {
                                            setFoodDescription(event.target.value);
                                            setAnalysisError("");
                                        }}
                                        placeholder="e.g. 6 boiled eggs and 2 slices of toast"
                                        rows={3}
                                        maxLength={500}
                                        required
                                    />
                                </label>

                                <label>
                                    Meal
                                    <select
                                        value={selectedMeal}
                                        onChange={(event) => setSelectedMeal(event.target.value)}
                                    >
                                        {initialMeals.map((meal) => (
                                            <option key={meal.id} value={meal.name}>
                                                {meal.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                {analysisError && (
                                    <p role="alert" className="nutrition-error">
                                        {analysisError}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    className="nutrition-submit"
                                    disabled={analyzing}
                                >
                                    {analyzing ? "Analyzing..." : "✦ Analyze food"}
                                </button>
                            </form>



                            {analyzedFood && (
                                <div className="nutrition-preview">
                                    <div className="nutrition-preview-heading">
                                        <div>
                                            <h3>Nutrition estimate</h3>
                                            <p>{foodDescription}</p>
                                        </div>
                                        <span className="nutrition-estimate-badge">AI estimate</span>
                                    </div>

                                    {analyzedFood.items.map((item, index) => (
                                        <div className="nutrition-food-item" key={`${item.name}-${index}`}>
                                            <div>
                                                <strong>{item.name}</strong>
                                                <span>
                                                    {Math.round(item.calories)} kcal · P{" "}
                                                    {item.protein.toFixed(1)}g · C {item.carbs.toFixed(1)}g · F{" "}
                                                    {item.fat.toFixed(1)}g
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="nutrition-preview-grid">
                                        <div>
                                            <span>Total calories</span>
                                            <strong>
                                                {Math.round(
                                                    analyzedFood.items.reduce(
                                                        (sum, item) => sum + item.calories,
                                                        0
                                                    )
                                                )}{" "}
                                                kcal
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Protein</span>
                                            <strong>
                                                {analyzedFood.items
                                                    .reduce((sum, item) => sum + item.protein, 0)
                                                    .toFixed(1)}{" "}
                                                g
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Carbs</span>
                                            <strong>
                                                {analyzedFood.items
                                                    .reduce((sum, item) => sum + item.carbs, 0)
                                                    .toFixed(1)}{" "}
                                                g
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Fat</span>
                                            <strong>
                                                {analyzedFood.items
                                                    .reduce((sum, item) => sum + item.fat, 0)
                                                    .toFixed(1)}{" "}
                                                g
                                            </strong>
                                        </div>
                                    </div>

                                    {analyzedFood.assumptions.length > 0 && (
                                        <div className="nutrition-preview-note">
                                            <strong>Portion assumptions</strong>
                                            <ul>
                                                {analyzedFood.assumptions.map((assumption, index) => (
                                                    <li key={index}>{assumption}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {analyzedFood.note && (
                                        <p className="nutrition-preview-note">{analyzedFood.note}</p>
                                    )}

                                    <p className="nutrition-preview-note">
                                        These are estimates, not exact nutritional measurements.
                                        Review them before adding your meal.
                                    </p>

                                    <button
                                        type="button"
                                        className="nutrition-submit"
                                        onClick={confirmFood}
                                    >
                                        Confirm and add to {selectedMeal}
                                    </button>

                                    <button
                                        type="button"
                                        className="nutrition-cancel"
                                        onClick={() => setAnalyzedFood(null)}
                                    >
                                        Discard estimate
                                    </button>
                                </div>
                            )}



                        </article>

                        <article className="panel meals-panel">
                            <div className="panel-heading">
                                <div>
                                    <h2>Today's meals</h2>
                                    <p>{meals.reduce((count, meal) => count + meal.foods.length, 0)} foods logged</p>
                                </div>
                                <Utensils size={21} />
                            </div>

                            <div className="nutrition-meals-list">
                                {meals.map((meal) => (
                                    <section className="nutrition-meal" key={meal.id}>
                                        <div className="nutrition-meal-heading">
                                            <h3>{meal.name}</h3>
                                            <span>
                                                {meal.foods.reduce((sum, food) => sum + food.calories, 0)} kcal
                                            </span>
                                        </div>

                                        {meal.foods.length === 0 ? (
                                            <p className="nutrition-empty-meal">Nothing logged yet</p>
                                        ) : (
                                            meal.foods.map((food) => (
                                                <div className="nutrition-food-item" key={food.id}>
                                                    <div>
                                                        <strong>{food.name}</strong>
                                                        <span>
                                                            {food.calories} kcal · P {food.protein}g · C {food.carbs}g · F {food.fat}g
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="nutrition-remove"
                                                        aria-label={`Remove ${food.name}`}
                                                        onClick={() => removeFood(meal.id, food.id)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </section>
                                ))}
                            </div>
                        </article>
                    </div>
                </>
            )}
            {activeTab === "History" && <NutritionHistory/>}

            {activeTab === "Insights" && <NutritionInsights/>}

            {activeTab === "Goals" && (
                <section className="nutrition-subpage">
                    <h2>Nutrition Goals</h2>
                    <p>Manage your daily calorie and macronutrient targets.</p>
                </section>
            )}
        </section>
    );
}

export default Nutrition;
