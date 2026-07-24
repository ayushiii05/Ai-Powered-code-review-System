import { getCodeReview } from './services/groqService.js';
import dotenv from 'dotenv';
dotenv.config();

const test = async () => {
  try {
    const response = await getCodeReview("javascript", "const x = 10;\nconsole.log(x);");
    console.log("SUCCESS!");
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error("ERROR CAUGHT:");
    console.error(error.message);
  }
};

test();
