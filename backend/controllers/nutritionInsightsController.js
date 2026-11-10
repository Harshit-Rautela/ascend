
/**
 * ASCEND — NUTRITION INSIGHTS CONTROLLER
 *
 * Handles nutrition analytics and AI-powered nutrition conversations.
 */

import { getNutritionAnalytics } from "../services/nutritionAnalyticsService.js";
import { generateNutritionInsight } from "../services/nutritionInsightsAI.js";

/**
 * Returns calculated nutrition analytics.
 */
export async function getNutritionAnalyticsController(req, res) {
    try {
        const analytics = await getNutritionAnalytics(req.query);

        return res.status(200).json({
            success: true,
            data: analytics,
        });
    } catch (error) {
        console.error("Nutrition analytics error:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to generate nutrition analytics.",
        });
    }
}

/**
 * Generates AI-powered insights from nutrition data.
 */
export async function generateNutritionInsightController(req, res) {
    try {
        const result = await generateNutritionInsight(
            "Analyze my nutrition over the latest 30 days. " +
            "Summarize my calorie and macro intake, identify meaningful " +
            "patterns, compare the current period with the previous period, " +
            "and explain any limitations caused by missing food records."
        );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("Nutrition insight generation error:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to generate nutrition insights.",
        });
    }
}

/**
 * Handles conversational nutrition insight requests.
 */
export async function nutritionAIChatController(req, res) {
    try {
        const { message } = req.body;

        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: "Please provide a message.",
            });
        }

        if (message.length > 1000) {
            return res.status(400).json({
                success: false,
                error: "Message cannot exceed 1000 characters.",
            });
        }

        const result = await generateNutritionInsight(message);

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("Nutrition AI chat error:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to process your nutrition question.",
        });
    }
}
