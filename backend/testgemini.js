
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("FAIL: GEMINI_API_KEY was not found.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function testGemini() {
  console.log("Testing Gemini connection...");

  const start = Date.now();
//   console.log(start)

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: 'What is the capital of France? Then say Gemini is working"',
      config: {
        maxOutputTokens: 30,
      },
    });

    console.log("SUCCESS: Gemini responded.");
    console.log("Response:", response.text);
    console.log("Time:", Date.now() - start, "ms");
  } catch (error) {
    console.error("FAIL: Gemini request failed.");
    console.error(error.message);
  }
}

testGemini();
