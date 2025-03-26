import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("Missing Google Gemini API Key in environment variables");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export const generativeModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash", // Or "gemini-1.5-pro" - flash is faster/cheaper
  // Optional: Configure safety settings if needed
  // safetySettings: [
  //   { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  //   // ... other categories
  // ],
});

// You might add more helper functions here later
