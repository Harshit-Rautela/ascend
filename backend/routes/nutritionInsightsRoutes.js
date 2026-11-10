
/**
 * ASCEND — NUTRITION INSIGHTS ROUTES
 *
 * Routes for nutrition analytics and AI-powered insights.
 */

import { Router } from "express";

import {
    getNutritionAnalyticsController,
    generateNutritionInsightController,
    nutritionAIChatController,
} from "../controllers/nutritionInsightsController.js";

const router = Router();

router.get("/analytics", getNutritionAnalyticsController);
router.post("/generate", generateNutritionInsightController);
router.post("/chat", nutritionAIChatController);

export default router;
