import { Router } from "express";
import {
  getSleepAnalyticsController,
  generateSleepInsightController,  sleepAIChatController,

} from "../controllers/sleepInsightsController.js";

const router = Router();

router.get("/analytics", getSleepAnalyticsController);
router.post("/generate", generateSleepInsightController);
router.post("/chat", sleepAIChatController);



export default router;