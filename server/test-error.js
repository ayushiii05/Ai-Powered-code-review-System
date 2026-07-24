import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: "Return a tiny JSON object with key 'hello' and value 'world'.",
    });
    console.log(response.text);
  } catch (error) {
    console.log("Keys:", Object.keys(error));
    console.log("Name:", error.name);
    console.log("Message:", error.message);
    console.log("Status:", error.status);
    
    let errMsg = "Failed to generate AI code review";
    if (error.status === 429) {
      errMsg = 'Google Gemini API Quota Exceeded. Please check your API billing details.';
    } else if (error.status === 400 || error.status === 403) {
      errMsg = 'Invalid Gemini API Key or permissions denied.';
    } else if (error.status === 404) {
      errMsg = 'AI Model not found or not supported.';
    } else if (error.message) {
      try {
        const parsed = JSON.parse(error.message.replace(/^ApiError: /, ''));
        if (parsed.error && parsed.error.message) {
           errMsg = parsed.error.message;
        }
      } catch(e) {
        errMsg = error.message;
      }
    }
    console.log("Extracted Msg:", errMsg);
  }
};

test();
