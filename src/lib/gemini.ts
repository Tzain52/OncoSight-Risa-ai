import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set. Please add it to your environment.");
}

export const gemini = new GoogleGenerativeAI(apiKey);
