import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    // In @google/genai, listing models is generally through ai.models.list()
    // Wait, let's just test gemini-2.5-pro or gemini-2.0-flash
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: "Return a tiny JSON object with key 'hello' and value 'world'.",
      config: {
        responseMimeType: "application/json",
      }
    });
    console.log("SUCCESS");
    console.log(response.text);
  } catch (err) {
    console.error("ERROR CAUGHT:");
    console.error(err);
  }
};

test();
