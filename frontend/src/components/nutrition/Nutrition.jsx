

import { useState, useEffect } from "react";

import {
    Flame,
    Wheat,
    Droplets,
    Plus,
    Utensils, CalendarDays,
    ChartNoAxesCombined,
    Target,
    LayoutDashboard,
    Trash2,
    Drumstick, Coffee,
    Sun,
    Moon,
    Cookie,
    Sparkles,
    ChevronDown
} from "lucide-react";

import NutritionHistory from "./NutritionHistory";

import NutritionInsights from "./NutritionInsights";
import "./nutrition.css";



const initialMeals = [

    { id: 1, name: "Breakfast", foods: [] },

    { id: 2, name: "Lunch", foods: [] },

    { id: 3, name: "Dinner", foods: [] },

    { id: 4, name: "Snacks", foods: [] },

];

const quickFoodSuggestions = [
    "3 boiled eggs",
    "Oats with milk and banana",
    "Chicken rice bowl",
    "Greek yogurt",
];

const mealIcons = {
    Breakfast: Coffee,
    Lunch: Sun,
    Dinner: Moon,
    Snacks: Cookie,
};


function Nutrition() {

    const [meals, setMeals] = useState(initialMeals);
    const [expandedMeals, setExpandedMeals] = useState({});

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
    const [micronutrients, setMicronutrients] = useState([]);
    const [micronutrientsLoading, setMicronutrientsLoading] = useState(true);
    const [micronutrientsError, setMicronutrientsError] = useState("");
    const [activeMicronutrientFilter, setActiveMicronutrientFilter] = useState("All");


    const nutritionTabs = [

        { label: "Dashboard", icon: LayoutDashboard },

        { label: "History", icon: CalendarDays },

        { label: "Insights", icon: ChartNoAxesCombined },

        { label: "Goals", icon: Target },

    ];

    const recentFoods = [
        ...new Map(
            meals
                .flatMap((meal) => meal.foods)
                .filter((food) => food.name?.trim())
                .map((food) => [
                    food.name.trim().toLowerCase(),
                    food.name,
                ])
        ).values(),
    ].slice(0, 4);

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




    async function fetchMicronutrients() {
        const today = new Date();

        const date = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, "0"),
            String(today.getDate()).padStart(2, "0"),
        ].join("-");

        setMicronutrientsLoading(true);
        setMicronutrientsError("");

        try {
            const response = await fetch(
                `http://localhost:5000/api/nutrition/micronutrients?date=${date}`
            );

            // const data = await response.json();
            const contentType = response.headers.get("content-type") || "";

            if (!contentType.includes("application/json")) {
                throw new Error(
                    `Expected JSON but received ${contentType || "an unknown response type"}.`
                );
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Could not load micronutrients."
                );
            }

            setMicronutrients(
                Array.isArray(data.nutrients) ? data.nutrients : []
            );
        } catch (error) {
            console.error("Error loading micronutrients:", error);
            setMicronutrientsError(
                error.message || "Could not load micronutrients."
            );
        } finally {
            setMicronutrientsLoading(false);
        }
    }

    useEffect(() => {
        fetchMicronutrients();
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
            await fetchMicronutrients();
        } catch (error) {

            console.error("Error deleting food:", error);

            alert(error.message || "Could not delete this food.");

        }

    }





    function progress(value, goal) {
        if (!Number.isFinite(goal) || goal <= 0) return 0;

        return Math.min(100, Math.max(0, (value / goal) * 100));
    }

    function goalPercentage(value, goal) {
        if (!Number.isFinite(goal) || goal <= 0) return 0;

        return Math.round((value / goal) * 100);
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


    const macroProgress = [
        {
            label: "Protein",
            value: totals.protein,
            goal: proteinGoal,
            icon: Drumstick,
            unit: "g",
            style: "protein",
        },
        {
            label: "Carbs",
            value: totals.carbs,
            goal: carbsGoal,
            icon: Wheat,
            unit: "g",
            style: "carbs",
        },
        {
            label: "Fat",
            value: totals.fat,
            goal: fatGoal,
            icon: Droplets,
            unit: "g",
            style: "fat",
        },
    ];

    const nutritionMetrics = [
        {
            label: "Calories",
            value: totals.calories,
            goal: calorieGoal,
            unit: "kcal",
            style: "calorie",
        },
        ...macroProgress,
    ];

    // Compare macro progress against their respective daily targets.
    const biggestMacroGap = [...macroProgress].sort(
        (a, b) => goalPercentage(a.value, a.goal) -
            goalPercentage(b.value, b.goal)
    )[0];

    // Macro distribution is based on calories contributed by each macro.
    // Protein = 4 kcal/g, Carbs = 4 kcal/g, Fat = 9 kcal/g.
    const macroCalories = {
        protein: totals.protein * 4,
        carbs: totals.carbs * 4,
        fat: totals.fat * 9,
    };

    const totalMacroCalories =
        macroCalories.protein +
        macroCalories.carbs +
        macroCalories.fat;

    const macroDistribution = [
        {
            label: "Protein",
            grams: totals.protein,
            calories: macroCalories.protein,
            percentage: totalMacroCalories > 0
                ? (macroCalories.protein / totalMacroCalories) * 100
                : 0,
            style: "protein",
        },
        {
            label: "Carbs",
            grams: totals.carbs,
            calories: macroCalories.carbs,
            percentage: totalMacroCalories > 0
                ? (macroCalories.carbs / totalMacroCalories) * 100
                : 0,
            style: "carbs",
        },
        {
            label: "Fat",
            grams: totals.fat,
            calories: macroCalories.fat,
            percentage: totalMacroCalories > 0
                ? (macroCalories.fat / totalMacroCalories) * 100
                : 0,
            style: "fat",
        },
    ];
    // Normalize categories returned by the backend.
    function getMicronutrientCategory(nutrient) {
        const category = String(nutrient.category || "").toLowerCase();

        if (category.includes("vitamin")) return "Vitamins";
        if (category.includes("mineral")) return "Minerals";

        return "Other";
    }

    const micronutrientCategories = [
        "All",
        "Vitamins",
        "Minerals",
        "Other",
    ];

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

    <section className="nutrition-overview">
        <div className="nutrition-overview-heading">
            <h2>Daily nutrition overview</h2>
            <span>Today's progress</span>
        </div>

        <div className="nutrition-summary-grid">
            {nutritionMetrics.map((item) => {
                const Icon = item.icon;
                const percentage = goalPercentage(item.value, item.goal);
                const remaining = Math.max(0, item.goal - item.value);

                return (
                    <article
                        className={`nutrition-card nutrition-card-${item.style}`}
                        key={item.label}
                    >
                        <div className="nutrition-card-heading">
                            <span>{item.label}</span>

                            {Icon && <Icon size={19} />}

                            <span className="nutrition-percentage">
                                {percentage.toFixed(1)}%
                            </span>
                        </div>

                        <div className="nutrition-big-number">
                            {item.label === "Calories"
                                ? Math.round(item.value).toLocaleString("en-IN")
                                : Math.round(item.value)}
                            <span> {item.unit}</span>
                        </div>

                        <div className="nutrition-track">
                            <div
                                className={`nutrition-fill ${item.style}-fill`}
                                style={{
                                    width: `${progress(item.value, item.goal)}%`,
                                }}
                            />
                        </div>

                        <div className="nutrition-progress-label">
                            {remaining > 0
                                ? `${item.label === "Calories"
                                    ? Math.round(remaining).toLocaleString("en-IN")
                                    : Math.round(remaining)} ${item.unit} remaining`
                                : "Daily target reached"}
                        </div>
                    </article>
                );
            })}
        </div>

        {/* Today's insight */}
        <section className="nutrition-daily-insight">
            <div className="nutrition-insight-heading">
                <Sparkles size={19} />
                <h3>Today's insight</h3>
            </div>

            {totalMacroCalories === 0 ? (
                <p>Log your first meal to see how your nutrition is progressing.</p>
            ) : biggestMacroGap &&
                goalPercentage(biggestMacroGap.value, biggestMacroGap.goal) < 100 ? (
                <p>
                    {biggestMacroGap.label} is currently your biggest gap
                    relative to its daily target.
                </p>
            ) : (
                <p>
                    You've reached all your daily macro targets. Keep up the good work!
                </p>
            )}
        </section>

        {/* Macro distribution */}
        <section className="nutrition-macro-distribution">
            <div className="nutrition-distribution-heading">
                <div>
                    <h3>Macro distribution</h3>
                    <p>Based on calories from today's macros</p>
                </div>

                <span>Today's intake</span>
            </div>

            {totalMacroCalories > 0 ? (
                <>
                    <div
                        className="nutrition-distribution-bar"
                        role="img"
                        aria-label={macroDistribution
                            .map((macro) =>
                                `${macro.label}: ${Math.round(macro.percentage)}%`
                            )
                            .join(", ")}
                    >
                        {macroDistribution.map((macro) => (
                            <div
                                key={macro.label}
                                className={`nutrition-distribution-segment ${macro.style}`}
                                style={{
                                    width: `${macro.percentage}%`,
                                }}
                            />
                        ))}
                    </div>

                    <div className="nutrition-distribution-legend">
                        {macroDistribution.map((macro) => (
                            <div key={macro.label}>
                                <span>
                                    <i className={macro.style} />
                                    {macro.label}
                                </span>

                                <strong>
                                    {Math.round(macro.percentage)}%
                                </strong>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <p className="nutrition-distribution-empty">
                    Your macro distribution will appear after you log food.
                </p>
            )}
        </section>
    </section>


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
                            micronutrients: item.micronutrients ?? [],

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


            await fetchMicronutrients();
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

                    <section className="nutrition-overview">
                        <div className="nutrition-overview-heading">
                            <h2>Daily nutrition overview</h2>
                            <span>Today's progress</span>
                        </div>

                        <div className="nutrition-summary-grid">
                            {nutritionMetrics.map((item) => {
                                const Icon = item.icon;
                                const percentage = goalPercentage(item.value, item.goal);
                                const remaining = Math.max(0, item.goal - item.value);

                                return (
                                    <article
                                        className={`nutrition-card nutrition-card-${item.style}`}
                                        key={item.label}
                                    >
                                        <div className="nutrition-card-heading">
                                            <span>{item.label}</span>

                                            {Icon && <Icon size={19} />}

                                            <span className="nutrition-percentage">
                                                {percentage.toFixed(1)}%
                                            </span>
                                        </div>

                                        <div className="nutrition-big-number">
                                            {item.label === "Calories"
                                                ? Math.round(item.value).toLocaleString("en-IN")
                                                : Math.round(item.value)}
                                            <span> {item.unit}</span>
                                        </div>

                                        <div className="nutrition-track">
                                            <div
                                                className={`nutrition-fill ${item.style}-fill`}
                                                style={{
                                                    width: `${progress(item.value, item.goal)}%`,
                                                }}
                                            />
                                        </div>

                                        <div className="nutrition-progress-label">
                                            {remaining > 0
                                                ? `${item.label === "Calories"
                                                    ? Math.round(remaining).toLocaleString("en-IN")
                                                    : Math.round(remaining)} ${item.unit} remaining`
                                                : "Daily target reached"}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        {/* Today's insight */}
                        {/* <section className="nutrition-daily-insight">
                            <div className="nutrition-insight-heading">
                                <Sparkles size={19} />
                                <h3>Today's insight</h3>
                            </div>

                            {totalMacroCalories === 0 ? (
                                <p>Log your first meal to see how your nutrition is progressing.</p>
                            ) : biggestMacroGap &&
                                goalPercentage(biggestMacroGap.value, biggestMacroGap.goal) < 100 ? (
                                <p>
                                    {biggestMacroGap.label} is currently your biggest gap
                                    relative to its daily target.
                                </p>
                            ) : (
                                <p>
                                    You've reached all your daily macro targets. Keep up the good work!
                                </p>
                            )}
                        </section> */}

                        {/* Macro distribution */}
                        <section className="nutrition-macro-distribution">
                            <div className="nutrition-distribution-heading">
                                <div>
                                    <h3>Macro distribution</h3>
                                    <p>Based on calories from today's macros</p>
                                </div>

                                <span>Today's intake</span>
                            </div>

                            {totalMacroCalories > 0 ? (
                                <>
                                    <div
                                        className="nutrition-distribution-bar"
                                        role="img"
                                        aria-label={macroDistribution
                                            .map((macro) =>
                                                `${macro.label}: ${Math.round(macro.percentage)}%`
                                            )
                                            .join(", ")}
                                    >
                                        {macroDistribution.map((macro) => (
                                            <div
                                                key={macro.label}
                                                className={`nutrition-distribution-segment ${macro.style}`}
                                                style={{
                                                    width: `${macro.percentage}%`,
                                                }}
                                            />
                                        ))}
                                    </div>

                                    <div className="nutrition-distribution-legend">
                                        {macroDistribution.map((macro) => (
                                            <div key={macro.label}>
                                                <span>
                                                    <i className={macro.style} />
                                                    {macro.label}
                                                </span>

                                                <strong>
                                                    {Math.round(macro.percentage)}%
                                                </strong>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <p className="nutrition-distribution-empty">
                                    Your macro distribution will appear after you log food.
                                </p>
                            )}
                        </section>
                    </section>




                    <section
                        className="panel micronutrient-panel"
                        aria-labelledby="micronutrient-heading"
                    >
                        {/* Header */}
                        <div className="panel-heading micronutrient-heading">
                            <div>
                                <h2 id="micronutrient-heading">Micronutrients</h2>
                                <p>Vitamins, minerals and other essential nutrients</p>
                            </div>

                            <span className="micronutrient-source-note">
                                <span className="micronutrient-source-dot" />
                                Food + supplements
                            </span>
                        </div>

                        {micronutrientsLoading ? (

                            <p className="nutrition-muted">
                                Loading micronutrient totals…
                            </p>

                        ) : micronutrientsError ? (

                            <div className="micronutrient-empty" role="status">
                                <p>Could not load micronutrient totals.</p>
                                <span>{micronutrientsError}</span>
                            </div>

                        ) : micronutrients.length === 0 ? (

                            <div className="micronutrient-empty">
                                <p>No micronutrient data available for today yet.</p>
                                <span>
                                    Your nutrient totals will appear here once food
                                    or supplement data is available.
                                </span>
                            </div>

                        ) : (

                            <>
                                {/* Category filters */}
                                <div
                                    className="micronutrient-filters"
                                    role="group"
                                    aria-label="Filter micronutrients"
                                >
                                    {micronutrientCategories.map((category) => (

                                        <button
                                            key={category}
                                            type="button"
                                            className={`micronutrient-filter ${activeMicronutrientFilter === category
                                                    ? "active"
                                                    : ""
                                                }`}
                                            onClick={() =>
                                                setActiveMicronutrientFilter(category)
                                            }
                                            aria-pressed={
                                                activeMicronutrientFilter === category
                                            }
                                        >
                                            {category}

                                            <span>
                                                {micronutrientCounts[category]}
                                            </span>
                                        </button>

                                    ))}
                                </div>

                                {/* Nutrient cards */}
                                {filteredMicronutrients.length > 0 ? (

                                    <div
                                        className="micronutrient-scroll"
                                        aria-label="Daily micronutrient totals"
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
                                                amount !== null &&
                                                Number.isFinite(amount);

                                            const hasTarget =
                                                target !== null &&
                                                Number.isFinite(target) &&
                                                target > 0;

                                            const hasProgress = hasAmount && hasTarget;

                                            const actualPercentage = hasProgress
                                                ? (amount / target) * 100
                                                : null;

                                            const barPercentage = hasProgress
                                                ? Math.min(100, actualPercentage)
                                                : 0;

                                            const status = !hasAmount
                                                ? "unavailable"
                                                : !hasTarget
                                                    ? "no-target"
                                                    : actualPercentage >= 100
                                                        ? "complete"
                                                        : "progress";

                                            const category =
                                                getMicronutrientCategory(nutrient);

                                            return (

                                                <article
                                                    className={`micronutrient-card micronutrient-${status}`}
                                                    key={nutrient.key || nutrient.name}
                                                >

                                                    <div className="micronutrient-card-header">

                                                        <div className="micronutrient-card-top">
                                                            <span>{nutrient.name}</span>

                                                            <span className="micronutrient-category">
                                                                {category}
                                                            </span>
                                                        </div>

                                                        {hasProgress && (
                                                            <span className="micronutrient-percent-badge">
                                                                {Math.round(actualPercentage)}%
                                                            </span>
                                                        )}

                                                    </div>

                                                    <div className="micronutrient-amount">
                                                        {hasAmount
                                                            ? amount.toLocaleString("en-IN", {
                                                                maximumFractionDigits: 2,
                                                            })
                                                            : "—"}

                                                        <span>{nutrient.unit || ""}</span>
                                                    </div>

                                                    {hasProgress ? (

                                                        <>
                                                            <div
                                                                className="micronutrient-progress-track"
                                                                role="progressbar"
                                                                aria-label={`${nutrient.name} daily target`}
                                                                aria-valuenow={Math.min(
                                                                    100,
                                                                    Math.round(actualPercentage)
                                                                )}
                                                                aria-valuemin={0}
                                                                aria-valuemax={100}
                                                            >
                                                                <div
                                                                    className="micronutrient-progress-fill"
                                                                    style={{
                                                                        width: `${barPercentage}%`,
                                                                    }}
                                                                />
                                                            </div>

                                                            <div className="micronutrient-card-footer">

                                                                <span>
                                                                    {actualPercentage >= 100
                                                                        ? "Target reached"
                                                                        : `${Math.round(actualPercentage)}% of target`}
                                                                </span>

                                                                <span>
                                                                    Target: {target.toLocaleString("en-IN")} {nutrient.unit || ""}
                                                                </span>

                                                            </div>
                                                        </>

                                                    ) : (

                                                        <div className="micronutrient-unavailable">
                                                            {!hasAmount
                                                                ? "Amount unavailable"
                                                                : "No target configured"}
                                                        </div>

                                                    )}

                                                </article>

                                            );
                                        })}

                                    </div>

                                ) : (

                                    <div className="micronutrient-filter-empty">
                                        No nutrients found in this category.
                                    </div>

                                )}
                            </>

                        )}

                    </section>


                    <div className="nutrition-content-grid">

                        <article className="panel nutrition-log-panel">

                            <div className="nutrition-log-header">
                                <div>
                                    <span className="nutrition-log-eyebrow">
                                        YOUR DAILY FUEL
                                    </span>

                                    <h2>Log your food</h2>

                                    <p>Fuel your goals. Understand your nutrition.</p>
                                </div>

                                <div className="nutrition-panel-icon">
                                    <Sparkles size={21} />
                                </div>
                            </div>





                            <form className="nutrition-form nutrition-premium-form" onSubmit={analyzeFood}>

                                {/* FOOD DESCRIPTION */}
                                <div className="nutrition-description-section">

                                    <div className="nutrition-input-heading">
                                        <label htmlFor="food-description">
                                            Describe your meal
                                        </label>

                                        <span className="nutrition-ai-status">
                                            <span className="nutrition-ai-dot" />
                                            AI POWERED
                                        </span>
                                    </div>

                                    <div className="nutrition-textarea-wrap">
                                        <textarea
                                            id="food-description"
                                            value={foodDescription}
                                            onChange={(event) => {
                                                setFoodDescription(event.target.value);
                                                setAnalysisError("");
                                            }}
                                            placeholder="Tell us what you ate, including quantities..."
                                            rows={3}
                                            maxLength={500}
                                            required
                                        />

                                        <div className="nutrition-textarea-footer">
                                            <span>Be as descriptive as possible</span>
                                            <span>{foodDescription.length}/500</span>
                                        </div>
                                    </div>

                                </div>

                                {/* QUICK SUGGESTIONS */}
                                {/* <div className="nutrition-suggestions-section">

                                    <div className="nutrition-section-label">
                                        <span>QUICK SUGGESTIONS</span>
                                        <span>Tap to add</span>
                                    </div>

                                    <div className="nutrition-suggestions">

                                        {quickFoodSuggestions.map((suggestion) => (
                                            <button
                                                type="button"
                                                key={suggestion}
                                                className="nutrition-suggestion-chip"
                                                onClick={() => {
                                                    setFoodDescription(suggestion);
                                                    setAnalysisError("");
                                                }}
                                            >
                                                <Plus size={13} />
                                                {suggestion}
                                            </button>
                                        ))}

                                    </div>

                                </div> */}

                                {/* RECENT FOODS */}
                                {recentFoods.length > 0 && (
                                    <div className="nutrition-suggestions-section">

                                        <div className="nutrition-section-label">
                                            <span>RECENTLY LOGGED</span>
                                            <span>From today's meals</span>
                                        </div>

                                        <div className="nutrition-suggestions">

                                            {recentFoods.map((food) => (
                                                <button
                                                    type="button"
                                                    key={food}
                                                    className="nutrition-suggestion-chip nutrition-recent-chip"
                                                    onClick={() => {
                                                        setFoodDescription(food);
                                                        setAnalysisError("");
                                                    }}
                                                >
                                                    <Plus size={13} />
                                                    {food}
                                                </button>
                                            ))}

                                        </div>

                                    </div>
                                )}

                                {/* MEAL SELECTOR */}
                                <div className="nutrition-meal-picker">

                                    <div className="nutrition-section-label">
                                        <span>WHICH MEAL IS THIS?</span>
                                        <span>Select one</span>
                                    </div>

                                    <div className="nutrition-meal-options">

                                        {initialMeals.map((meal) => {
                                            const MealIcon = mealIcons[meal.name];

                                            return (
                                                <button
                                                    type="button"
                                                    key={meal.id}
                                                    className={`nutrition-meal-option ${selectedMeal === meal.name ? "active" : ""
                                                        }`}
                                                    onClick={() => setSelectedMeal(meal.name)}
                                                    aria-pressed={selectedMeal === meal.name}
                                                >
                                                    {MealIcon && <MealIcon size={18} />}

                                                    <span>{meal.name}</span>
                                                </button>
                                            );
                                        })}

                                    </div>

                                </div>

                                {/* ERROR */}
                                {analysisError && (
                                    <p role="alert" className="nutrition-error">
                                        {analysisError}
                                    </p>
                                )}

                                {/* AI ANALYZE BUTTON */}
                                <button
                                    type="submit"
                                    className="nutrition-submit nutrition-analyze-button"
                                    disabled={analyzing || !foodDescription.trim()}
                                >
                                    {analyzing ? (
                                        <>
                                            <span className="nutrition-spinner" />
                                            Analyzing your meal...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={17} />
                                            Analyze my meal
                                        </>
                                    )}
                                </button>

                                <div className="nutrition-form-footer">
                                    <span>AI-generated estimates</span>
                                    <span>Review before saving</span>
                                </div>

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



                                    <div className="nutrition-preview-actions">

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

                                </div>

                            )}







                        </article>




                        <article className="panel meals-panel">

                            <div className="panel-heading">
                                <div>
                                    <h2>Today's meals</h2>
                                    <p>
                                        {meals.reduce(
                                            (count, meal) => count + meal.foods.length,
                                            0
                                        )} foods logged
                                    </p>
                                </div>

                                <Utensils size={21} />
                            </div>

                            <div className="nutrition-meals-list">

                                {meals.map((meal) => {

                                    const mealTotals = meal.foods.reduce(
                                        (total, food) => ({
                                            calories: total.calories + Number(food.calories || 0),
                                            protein: total.protein + Number(food.protein || 0),
                                            carbs: total.carbs + Number(food.carbs || 0),
                                            fat: total.fat + Number(food.fat || 0),
                                        }),
                                        {
                                            calories: 0,
                                            protein: 0,
                                            carbs: 0,
                                            fat: 0,
                                        }
                                    );

                                    const isExpanded = Boolean(expandedMeals[meal.id]);

                                    return (
                                        <section className="nutrition-meal" key={meal.id}>

                                            {/* MEAL HEADER */}
                                            <div className="nutrition-meal-heading">

                                                <h3>{meal.name}</h3>

                                                <span className="nutrition-meal-calories">
                                                    {Math.round(mealTotals.calories)} kcal
                                                </span>

                                            </div>

                                            {/* FOOD ENTRIES */}
                                            {meal.foods.length === 0 ? (

                                                <p className="nutrition-empty-meal">
                                                    Nothing logged yet
                                                </p>

                                            ) : (

                                                <>
                                                    <div className="nutrition-food-list">

                                                        {meal.foods.map((food) => (

                                                            <div
                                                                className="nutrition-food-item"
                                                                key={food.id}
                                                            >

                                                                <div className="nutrition-food-details">

                                                                    <strong>{food.name}</strong>

                                                                    <div className="nutrition-food-nutrients">

                                                                        <span className="food-nutrient food-calories">
                                                                            {Math.round(Number(food.calories) || 0)} kcal
                                                                        </span>

                                                                        <span className="food-nutrient food-protein">
                                                                            P {Number(food.protein || 0)}g
                                                                        </span>

                                                                        <span className="food-nutrient food-carbs">
                                                                            C {Number(food.carbs || 0)}g
                                                                        </span>

                                                                        <span className="food-nutrient food-fat">
                                                                            F {Number(food.fat || 0)}g
                                                                        </span>

                                                                    </div>

                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    className="nutrition-remove"
                                                                    aria-label={`Remove ${food.name}`}
                                                                    onClick={() => removeFood(meal.id, food.id)}
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>

                                                            </div>

                                                        ))}

                                                    </div>

                                                    {/* EXPANDABLE MEAL MACROS */}
                                                    <div className="nutrition-meal-macro-section">

                                                        <button
                                                            type="button"
                                                            className={`nutrition-macro-toggle ${isExpanded ? "expanded" : ""
                                                                }`}
                                                            onClick={() => {
                                                                setExpandedMeals((current) => ({
                                                                    ...current,
                                                                    [meal.id]: !current[meal.id],
                                                                }));
                                                            }}
                                                            aria-expanded={isExpanded}
                                                        >
                                                            {isExpanded ? "Hide macros" : "View meal macros"}

                                                            <ChevronDown size={15} />
                                                        </button>

                                                        {isExpanded && (

                                                            <div className="nutrition-meal-macro-breakdown">

                                                                <div className="nutrition-meal-macro-card macro-protein">
                                                                    <span>PROTEIN</span>
                                                                    <strong>
                                                                        {mealTotals.protein.toFixed(1).replace(/\.0$/, "")}g
                                                                    </strong>
                                                                </div>

                                                                <div className="nutrition-meal-macro-card macro-carbs">
                                                                    <span>CARBS</span>
                                                                    <strong>
                                                                        {mealTotals.carbs.toFixed(1).replace(/\.0$/, "")}g
                                                                    </strong>
                                                                </div>

                                                                <div className="nutrition-meal-macro-card macro-fat">
                                                                    <span>FAT</span>
                                                                    <strong>
                                                                        {mealTotals.fat.toFixed(1).replace(/\.0$/, "")}g
                                                                    </strong>
                                                                </div>

                                                            </div>

                                                        )}

                                                    </div>
                                                </>

                                            )}

                                        </section>
                                    );
                                })}

                            </div>

                        </article>


                    </div>

                </>

            )}

            {activeTab === "History" && <NutritionHistory />}



            {activeTab === "Insights" && <NutritionInsights />}



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
