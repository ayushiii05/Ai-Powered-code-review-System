import mongoose from 'mongoose';

const convertedCodeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
    },
    language: {
      type: String,
      required: true,
    },
    targetLanguage: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const ConvertedCode = mongoose.model('ConvertedCode', convertedCodeSchema);
export default ConvertedCode;
