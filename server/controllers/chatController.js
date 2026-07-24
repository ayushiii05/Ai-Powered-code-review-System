import ReviewChat from '../models/ReviewChat.js';
import Review from '../models/Review.js';
import { sendChatMessage as aiChatService } from '../services/groqService.js';

// @desc    Send a chat message about a review
// @route   POST /api/review/chat
// @access  Private
export const sendChatMessage = async (req, res) => {
  try {
    const { reviewId, language, code, review, message } = req.body;
    
    if (!message || !code || !language) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let chatData = null;
    let chatHistory = [];
    
    if (reviewId) {
      // Find existing chat history for this review
      chatData = await ReviewChat.findOne({ reviewId, userId: req.user._id });
      if (chatData) {
        chatHistory = chatData.messages;
      }
    }

    // Call AI
    const aiResponseContent = await aiChatService(language, code, review, chatHistory, message);

    // Save to DB
    const newMessageObj = { role: 'user', content: message };
    const aiMessageObj = { role: 'assistant', content: aiResponseContent };

    if (reviewId) {
      if (chatData) {
        chatData.messages.push(newMessageObj, aiMessageObj);
        await chatData.save();
      } else {
        chatData = await ReviewChat.create({
          reviewId,
          userId: req.user._id,
          messages: [newMessageObj, aiMessageObj]
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        userMessage: newMessageObj,
        aiResponse: aiMessageObj,
        chatId: chatData ? chatData._id : null
      }
    });

  } catch (error) {
    console.error('Chat Controller Error:', error);
    res.status(500).json({ message: error.message || 'Server Error processing chat' });
  }
};

// @desc    Get chat history for a review
// @route   GET /api/review/chat/:reviewId
// @access  Private
export const getChatHistory = async (req, res) => {
  try {
    const chatData = await ReviewChat.findOne({ 
      reviewId: req.params.reviewId, 
      userId: req.user._id 
    });

    res.status(200).json({
      success: true,
      data: chatData ? chatData.messages : []
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Clear chat history for a review
// @route   DELETE /api/review/chat/:reviewId
// @access  Private
export const clearChatHistory = async (req, res) => {
  try {
    const chatData = await ReviewChat.findOneAndDelete({ 
      reviewId: req.params.reviewId, 
      userId: req.user._id 
    });

    res.status(200).json({
      success: true,
      message: 'Chat history cleared'
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};
