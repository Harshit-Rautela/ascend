
import { getSleepAnalytics } from "../services/sleepAnalyticsService.js";
import { generateSleepInsight } from "../services/sleepAI.js";

/**
 * Returns calculated sleep analytics.
 */
export async function getSleepAnalyticsController(req, res) {
  try {
    const analytics = await getSleepAnalytics();

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Sleep analytics error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to generate sleep analytics.",
    });
  }
}

/**
 * Generates AI-powered insights from sleep analytics.
 */
export async function generateSleepInsightController(req, res) {
  try {
    // Step 1: Fetch analytics calculated by our backend.
    const analytics = await getSleepAnalytics();

    // Step 2: Ask Gemini to interpret those analytics.
    const insight = await generateSleepInsight(analytics);

    return res.status(200).json({
      success: true,
      data: {
        insight,
        analytics,
      },
    });
  } catch (error) {
    console.error("Sleep insight generation error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to generate sleep insights.",
    });
  }
}


/**
 * Handles conversational sleep insight requests.
 */
export async function sleepAIChatController(req, res) {
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

    const result = await generateSleepInsight(message);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Sleep AI chat error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to process your sleep question.",
    });
  }
}
