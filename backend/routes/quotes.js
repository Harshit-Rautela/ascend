import { Router } from "express";
import { generateDailyQuote } from "../services/quoteAI.js";

const router = Router();

router.get("/daily", async (req, res, next) => {
  try {
    const quote = await generateDailyQuote();

    res.set("Cache-Control", "no-store");
    res.json(quote);
  } catch (error) {
    next(error);
  }
});

export default router;