import GithubRepository from '../models/GithubRepository.js';
import GithubChat from '../models/GithubChat.js';
import Notification from '../models/Notification.js';
import { analyzeProjectStructure, generateProjectDocs, sendProjectChatMessage } from '../services/groqService.js';
import { 
  validateGithubUrl, 
  fetchGithubRepository, 
  fetchGithubLanguages, 
  fetchGithubTree, 
  fetchFileContents,
  fetchUserRepositories
} from '../services/githubService.js';
import User from '../models/User.js';
import { decrypt } from '../utils/encryption.js';

// @desc    Import GitHub repository
// @route   POST /api/github/repository
// @access  Private
export const importGithubRepo = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ message: 'GitHub URL is required' });
    }

    const repoInfo = validateGithubUrl(url);
    if (!repoInfo) {
      return res.status(400).json({ message: 'Invalid GitHub URL format. Use https://github.com/owner/repo' });
    }

    // Check if recently imported to avoid duplicate fetches
    let existingRepo = await GithubRepository.findOne({ 
      userId: req.user._id, 
      repositoryUrl: url 
    }).sort({ createdAt: -1 });

    if (existingRepo && (Date.now() - new Date(existingRepo.createdAt).getTime() < 3600000)) {
      return res.status(200).json({ 
        success: true, 
        message: 'Repository recently fetched',
        repositoryId: existingRepo._id 
      });
    }

    let accessToken = null;
    const user = await User.findById(req.user._id);
    if (user && user.githubAccessToken) {
      accessToken = decrypt(user.githubAccessToken);
    }

    const details = await fetchGithubRepository(repoInfo.owner, repoInfo.repo, accessToken);
    const languages = await fetchGithubLanguages(details.languages_url, accessToken);
    const tree = await fetchGithubTree(repoInfo.owner, repoInfo.repo, details.defaultBranch, accessToken);
    const { uploadedFiles, folderStructure } = await fetchFileContents(repoInfo.owner, repoInfo.repo, details.defaultBranch, tree, accessToken);

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ message: 'No valid source files found in this repository.' });
    }

    const repository = await GithubRepository.create({
      userId: req.user._id,
      repositoryName: details.repositoryName,
      repositoryUrl: url,
      owner: details.owner,
      defaultBranch: details.defaultBranch,
      languages: languages,
      folderStructure: folderStructure,
      uploadedFiles: uploadedFiles
    });

    await Notification.create({
      userId: req.user._id,
      title: 'GitHub Repo Imported',
      message: `Successfully imported ${details.repositoryName} from GitHub.`,
      type: 'success'
    });

    res.status(201).json({
      success: true,
      repositoryId: repository._id
    });
  } catch (error) {
    console.error('Import GitHub Repo Error:', error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Get user's GitHub repositories
// @route   GET /api/github/user-repos
// @access  Private
export const getUserGithubRepos = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.githubAccessToken) {
      return res.status(401).json({ message: 'GitHub account not linked' });
    }
    const accessToken = decrypt(user.githubAccessToken);
    
    const repos = await fetchUserRepositories(accessToken);
    res.json({ success: true, repositories: repos });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch repositories' });
  }
};

// @desc    Get GitHub repository
// @route   GET /api/github/repository/:id
// @access  Private
export const getGithubRepo = async (req, res) => {
  try {
    const repository = await GithubRepository.findById(req.params.id);
    if (!repository) return res.status(404).json({ message: 'Repository not found' });
    if (repository.userId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });

    res.json({ success: true, repository });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Generate AI Review for Github Repo
// @route   POST /api/github/review/:id
// @access  Private
export const reviewGithubRepo = async (req, res) => {
  try {
    const repository = await GithubRepository.findById(req.params.id);
    if (!repository) return res.status(404).json({ message: 'Repository not found' });
    if (repository.userId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });

    const review = await analyzeProjectStructure(repository.uploadedFiles, {
      projectName: repository.repositoryName,
      framework: repository.languages.length > 0 ? repository.languages[0] : 'Unknown',
      languages: repository.languages
    });

    repository.review = review;
    await repository.save();

    res.json({ success: true, review });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to review repository' });
  }
};

// @desc    Generate Documentation for Github Repo
// @route   POST /api/github/documentation/:id
// @access  Private
export const generateGithubDocs = async (req, res) => {
  try {
    const repository = await GithubRepository.findById(req.params.id);
    if (!repository) return res.status(404).json({ message: 'Repository not found' });
    if (repository.userId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });

    const docs = await generateProjectDocs(repository.uploadedFiles, {
      projectName: repository.repositoryName,
      framework: repository.languages.length > 0 ? repository.languages[0] : 'Unknown',
      languages: repository.languages
    }, repository.review);

    repository.documentation = docs;
    await repository.save();

    res.json({ success: true, documentation: docs });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to generate documentation' });
  }
};

// @desc    Send Chat Message
// @route   POST /api/github/chat/:id
// @access  Private
export const sendGithubChat = async (req, res) => {
  try {
    const { message } = req.body;
    const repositoryId = req.params.id;

    if (!message) return res.status(400).json({ message: 'Message is required' });

    const repository = await GithubRepository.findOne({ _id: repositoryId, userId: req.user._id });
    if (!repository) return res.status(404).json({ message: 'Repository not found' });

    let chat = await GithubChat.findOne({ repositoryId, userId: req.user._id });
    if (!chat) {
      chat = await GithubChat.create({ repositoryId, userId: req.user._id, messages: [] });
    }

    const aiResponseContent = await sendProjectChatMessage(
      repository.uploadedFiles,
      {
        projectName: repository.repositoryName,
        framework: repository.languages.length > 0 ? repository.languages[0] : 'Unknown',
        languages: repository.languages
      },
      repository.review,
      chat.messages,
      message
    );

    const userMessage = { role: 'user', content: message };
    const aiMessage = { role: 'assistant', content: aiResponseContent };

    chat.messages.push(userMessage, aiMessage);
    await chat.save();

    res.status(200).json({
      success: true,
      data: { userMessage, aiResponse: aiMessage }
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error during chat' });
  }
};

// @desc    Get Chat History
// @route   GET /api/github/chat/:id
// @access  Private
export const getGithubChatHistory = async (req, res) => {
  try {
    const chat = await GithubChat.findOne({ repositoryId: req.params.id, userId: req.user._id });
    res.status(200).json({ success: true, data: chat ? chat.messages : [] });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Clear Chat History
// @route   DELETE /api/github/chat/:id
// @access  Private
export const clearGithubChat = async (req, res) => {
  try {
    await GithubChat.findOneAndDelete({ repositoryId: req.params.id, userId: req.user._id });
    res.status(200).json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
