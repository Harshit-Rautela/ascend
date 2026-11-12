
/*
 * ASCEND — NUTRITION AI TOOL DECLARATIONS
 *
 * Defines the approved analytics functions available
 * to Gemini through function calling.
 */

const dateProperties = {
    startDate: {
        type: "string",
        description: "Optional start date in YYYY-MM-DD format.",
    },
    endDate: {
        type: "string",
        description: "Optional end date in YYYY-MM-DD format.",
    },
};

const dateParameters = {
    type: "object",
    properties: dateProperties,
};

const foodParameters = {
    type: "object",
    properties: {
        ...dateProperties,
        limit: {
            type: "integer",
            description: "Maximum number of foods to return. Defaults to 20.",
        },
    },
};

export const nutritionTools = [
    {
        functionDeclarations: [
            {
                name: "get_nutrition_analytics",
                description:
                    "Retrieve overall nutrition totals, daily averages, data coverage, and comparison with the preceding period of equal duration.",
                parametersJsonSchema: dateParameters,
            },
            {
                name: "get_macro_analysis",
                description:
                    "Analyze total and average calorie, protein, carbohydrate, and fat intake, including daily breakdowns. Macro goals are not configured.",
                parametersJsonSchema: dateParameters,
            },
            {
                name: "get_micronutrient_analysis",
                description:
                    "Analyze vitamin and mineral intake from food and supplements, including average intake on nutrient-recorded days and configured daily targets.",
                parametersJsonSchema: dateParameters,
            },
            {
                name: "get_food_frequency",
                description:
                    "Find frequently logged foods, unique food counts, and recorded food variety. Use for questions about foods eaten most often.",
                parametersJsonSchema: foodParameters,
            },
            {
                name: "get_food_contribution",
                description:
                    "Identify foods contributing the most calories and protein, including their percentage contribution to recorded totals.",
                parametersJsonSchema: foodParameters,
            },
            {
                name: "get_meal_analysis",
                description:
                    "Analyze breakfast, lunch, dinner, and snacks, including meal totals, averages, calorie contributions, and meal comparisons.",
                parametersJsonSchema: dateParameters,
            },
            {
                name: "get_nutrition_trends",
                description:
                    "Retrieve daily and weekly calorie and macronutrient trends, including highest and lowest recorded intake days.",
                parametersJsonSchema: dateParameters,
            },
            {
                name: "get_nutrition_consistency",
                description:
                    "Analyze nutrition logging consistency, recorded days, coverage, current logging streak, longest streak, and gaps between recorded days.",
                parametersJsonSchema: dateParameters,
            },
            {
                name: "get_nutrition_goal_analysis",
                description:
                    "Compare average recorded micronutrient intake with configured nutrient targets and report which macro goals are unavailable.",
                parametersJsonSchema: dateParameters,
            },

            {
                name: "get_micronutrient_trends",
                description:
                    "Analyze vitamin and mineral intake trends over time. Returns daily and weekly intake patterns, food versus supplement contributions, increasing or decreasing trends, highest and lowest intake days, and tracking coverage.",

                parametersJsonSchema: {
                    type: "object",
                    properties: {
                        startDate: {
                            type: "string",
                            description:
                                "Start date in YYYY-MM-DD format. Optional."
                        },
                        endDate: {
                            type: "string",
                            description:
                                "End date in YYYY-MM-DD format. Optional."
                        }
                    }
                }
            }

        ],
    },
];

