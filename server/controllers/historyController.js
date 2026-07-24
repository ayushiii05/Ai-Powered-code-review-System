import Review from '../models/Review.js';
import Project from '../models/Project.js';

// @desc    Get all reviews and projects for logged-in user with pagination and filters
// @route   GET /api/history
// @access  Private
export const getHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };
    const projectQuery = { userId: req.user._id };

    // Search by title or language
    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' };
      query.$or = [
        { title: searchRegex },
        { language: searchRegex },
      ];
      projectQuery.$or = [
        { projectName: searchRegex },
        { framework: searchRegex },
      ];
    }

    // Filter by language
    if (req.query.language) {
      query.language = req.query.language;
      projectQuery.languages = req.query.language;
    }

    // Filter by favorite
    if (req.query.favorite === 'true') {
      query.favorite = true;
      projectQuery.favorite = true;
    }

    // Sorting parameters
    const sortField = req.query.sort;

    // Fetch both collections
    const [reviews, projects] = await Promise.all([
      Review.find(query).select('title language score createdAt favorite summary'),
      Project.find(projectQuery).select('projectName framework languages review createdAt favorite'),
    ]);

    // Normalize and merge
    const normalizedReviews = reviews.map(r => ({
      _id: r._id,
      title: r.title,
      language: r.language,
      score: r.score,
      summary: r.summary,
      favorite: r.favorite,
      createdAt: r.createdAt,
      type: 'review'
    }));

    const normalizedProjects = projects.map(p => ({
      _id: p._id,
      title: p.projectName,
      language: p.framework || (p.languages && p.languages[0]) || 'Multiple',
      score: p.review?.overallScore ? String(p.review.overallScore) : 'N/A',
      summary: p.review?.summary || 'No review generated yet',
      favorite: p.favorite || false,
      createdAt: p.createdAt,
      type: 'project'
    }));

    let merged = [...normalizedReviews, ...normalizedProjects];

    // Sorting in JS
    if (sortField === 'oldest') {
      merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortField === 'highest') {
      merged.sort((a, b) => {
        const scoreA = isNaN(parseFloat(a.score)) ? 0 : parseFloat(a.score);
        const scoreB = isNaN(parseFloat(b.score)) ? 0 : parseFloat(b.score);
        return scoreB - scoreA;
      });
    } else if (sortField === 'lowest') {
      merged.sort((a, b) => {
        const scoreA = isNaN(parseFloat(a.score)) ? 100 : parseFloat(a.score);
        const scoreB = isNaN(parseFloat(b.score)) ? 100 : parseFloat(b.score);
        return scoreA - scoreB;
      });
    } else {
      // default newest
      merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const total = merged.length;
    const paginated = merged.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      count: paginated.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: paginated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Get single review details
// @route   GET /api/history/:id
// @access  Private
export const getReviewById = async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Update review or project (title, favorite)
// @route   PATCH /api/history/:id
// @access  Private
export const updateReview = async (req, res) => {
  try {
    const { title, favorite } = req.body;
    
    let item = await Review.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) {
      item = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    }
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (title !== undefined) {
      if (item.projectName !== undefined) item.projectName = title;
      else item.title = title;
    }
    if (favorite !== undefined) item.favorite = favorite;

    await item.save();

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Delete a review or project
// @route   DELETE /api/history/:id
// @access  Private
export const deleteReview = async (req, res) => {
  try {
    let deleted = await Review.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    
    if (!deleted) {
      deleted = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    }
    
    if (!deleted) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.status(200).json({ success: true, message: 'Item removed' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Get Dashboard Statistics
// @route   GET /api/history/stats
// @access  Private
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const totalReviews = await Review.countDocuments({ user: userId });
    const totalProjects = await Project.countDocuments({ userId });
    const totalItems = totalReviews + totalProjects;

    const favoritesReviews = await Review.countDocuments({ user: userId, favorite: true });
    const favoritesProjects = await Project.countDocuments({ userId, favorite: true });
    const favoritesCount = favoritesReviews + favoritesProjects;
    
    // Aggregation for languages and avg score (Reviews)
    const stats = await Review.aggregate([
      { $match: { user: userId } },
      { 
        $group: { 
          _id: "$language", 
          count: { $sum: 1 },
          avgScore: { $avg: { $convert: { input: "$score", to: "double", onError: 0, onNull: 0 } } }
        } 
      },
      { $sort: { count: -1 } }
    ]);

    let overallAvgScore = 0;
    if (totalReviews > 0) {
       const globalStats = await Review.aggregate([
         { $match: { user: userId } },
         { $group: { _id: null, avgScore: { $avg: { $convert: { input: "$score", to: "double", onError: 0, onNull: 0 } } } } }
       ]);
       if(globalStats.length > 0) {
         overallAvgScore = globalStats[0].avgScore;
       }
    }

    const mostUsedLanguage = stats.length > 0 ? stats[0]._id : 'None';
    const uniqueLanguages = stats.length;

    // Get 5 recent mixed
    const [recentReviews, recentProjects] = await Promise.all([
      Review.find({ user: userId }).sort({ createdAt: -1 }).limit(5).select('title language score createdAt favorite summary'),
      Project.find({ userId }).sort({ createdAt: -1 }).limit(5).select('projectName framework languages review createdAt favorite')
    ]);

    let recentMixed = [
      ...recentReviews.map(r => ({ ...r.toObject(), type: 'review' })),
      ...recentProjects.map(p => ({
        _id: p._id,
        title: p.projectName,
        language: p.framework || (p.languages && p.languages[0]) || 'Multiple',
        score: p.review?.overallScore ? String(p.review.overallScore) : 'N/A',
        summary: p.review?.summary || 'No review generated yet',
        createdAt: p.createdAt,
        favorite: p.favorite || false,
        type: 'project'
      }))
    ];
    
    recentMixed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recent5 = recentMixed.slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        totalReviews: totalItems, // combining them for dashboard
        favoritesCount,
        overallAvgScore: overallAvgScore.toFixed(1),
        mostUsedLanguage,
        uniqueLanguages,
        languageDistribution: stats,
        recentReviews: recent5
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};
