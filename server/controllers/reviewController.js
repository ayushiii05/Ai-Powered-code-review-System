import Review from '../models/Review.js';
import Notification from '../models/Notification.js';
import { getCodeReview } from '../services/groqService.js';

export const generateReview = async (req, res) => {
  try {
    const { language, code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Code is required' });
    }
    if (!language) {
      return res.status(400).json({ message: 'Language is required' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ message: 'Groq API Key is not configured on the server.' });
    }

    // Call Groq API
    const aiResponse = await getCodeReview(language, code);

    // Save to Database
    const review = await Review.create({
      user: req.user._id,
      title: aiResponse.title || `${language.charAt(0).toUpperCase() + language.slice(1)} Code Review`,
      language,
      code,
      optimizedCode: aiResponse.optimizedCode || '',
      score: aiResponse.overallScore?.toString() || '0',
      summary: aiResponse.summary || '',
      aiResponse,
    });

    res.status(201).json({
      success: true,
      data: aiResponse,
      reviewId: review._id
    });
  } catch (error) {
    console.error('Controller Error:', error);
    res.status(500).json({ message: error.message || 'Server Error during review generation' });
  }
};
