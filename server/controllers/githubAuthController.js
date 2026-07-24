import axios from 'axios';
import User from '../models/User.js';
import { encrypt, decrypt } from '../utils/encryption.js';

// @desc    Initiate GitHub OAuth
// @route   GET /api/github-auth/auth
// @access  Private (Needs to pass frontend auth token to maintain session somehow? Wait, frontend will just window.location.href to GitHub, and we need a way to link it back to the current user. A common approach is to pass the user ID in the state parameter.)
export const githubAuthRedirect = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.CLIENT_URL}/github/callback`; // Frontend will handle this and send code to backend
  // We'll let the frontend do the redirect so we don't need this endpoint.
  res.json({ clientId, redirectUri });
};

// @desc    Handle GitHub OAuth Callback
// @route   POST /api/github-auth/callback
// @access  Private
export const githubAuthCallback = async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Authorization code is required' });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;
    
    if (!accessToken) {
      return res.status(400).json({ message: 'Failed to retrieve access token from GitHub' });
    }

    // Fetch user details from GitHub
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    });

    const githubUsername = userResponse.data.login;

    // Encrypt token and save to user
    const encryptedToken = encrypt(accessToken);

    const user = await User.findById(req.user._id);
    user.githubUsername = githubUsername;
    user.githubAccessToken = encryptedToken;
    await user.save();

    res.json({
      success: true,
      githubUsername,
      message: 'GitHub account successfully linked',
    });
  } catch (error) {
    console.error('GitHub Auth Callback Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to authenticate with GitHub' });
  }
};

// @desc    Get GitHub Connection Status
// @route   GET /api/github-auth/status
// @access  Private
export const getGithubStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user && user.githubUsername && user.githubAccessToken) {
      res.json({
        connected: true,
        githubUsername: user.githubUsername,
      });
    } else {
      res.json({
        connected: false,
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Disconnect GitHub Account
// @route   DELETE /api/github-auth/disconnect
// @access  Private
export const disconnectGithub = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.githubUsername = '';
    user.githubAccessToken = '';
    await user.save();
    
    res.json({ success: true, message: 'GitHub account disconnected' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
