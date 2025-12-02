import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
    console.error("CRITICAL: Missing GOOGLE_API_KEY environment variable. AI features will not work.");
}

const genAI = new GoogleGenerativeAI(apiKey || "dummy_key_to_prevent_crash_on_init");
export const model = genAI.getGenerativeModel({ model: "gemini-pro" });
