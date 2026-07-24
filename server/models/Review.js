import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      default: 'Untitled Review'
    },
    language: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    optimizedCode: {
      type: String,
    },
    score: {
      type: String,
    },
    summary: {
      type: String,
    },
    favorite: {
      type: Boolean,
      default: false
    },
    aiResponse: {
      type: Object, // Store the structured JSON response from Gemini/Groq
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Review = mongoose.model('Review', reviewSchema);
export default Review;
