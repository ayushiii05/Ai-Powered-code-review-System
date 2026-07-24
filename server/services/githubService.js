import axios from 'axios';

const IGNORED_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.vscode', '.idea'];
const IGNORED_FILES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
const ALLOWED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.go', '.php', '.cs', '.html', '.css', '.json', '.md'];

export const validateGithubUrl = (url) => {
  const regex = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/?$/;
  const match = url.match(regex);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace('.git', '') };
};

export const fetchGithubRepository = async (owner, repo, accessToken = null) => {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    let headers = {};
    if (accessToken) {
      headers.Authorization = `token ${accessToken}`;
    } else if (process.env.GITHUB_PAT) {
      headers.Authorization = `token ${process.env.GITHUB_PAT}`;
    }
    
    const { data } = await axios.get(url, { headers });
    
    return {
      repositoryName: data.name,
      owner: data.owner.login,
      description: data.description,
      defaultBranch: data.default_branch,
      languages_url: data.languages_url,
      stars: data.stargazers_count,
      forks: data.forks_count,
    };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error('Repository not found or is private.');
    }
    if (error.response && error.response.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please try again later.');
    }
    throw new Error('Failed to fetch repository details from GitHub.');
  }
};

export const fetchGithubLanguages = async (languages_url, accessToken = null) => {
  try {
    let headers = {};
    if (accessToken) {
      headers.Authorization = `token ${accessToken}`;
    } else if (process.env.GITHUB_PAT) {
      headers.Authorization = `token ${process.env.GITHUB_PAT}`;
    }
    const { data } = await axios.get(languages_url, { headers });
    return Object.keys(data);
  } catch (error) {
    return [];
  }
};

export const fetchGithubTree = async (owner, repo, branch, accessToken = null) => {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    let headers = {};
    if (accessToken) {
      headers.Authorization = `token ${accessToken}`;
    } else if (process.env.GITHUB_PAT) {
      headers.Authorization = `token ${process.env.GITHUB_PAT}`;
    }
    const { data } = await axios.get(url, { headers });
    
    // Filter tree
    const filteredTree = data.tree.filter(item => {
      if (item.type !== 'blob') return false; // Only files
      
      const pathParts = item.path.split('/');
      
      // Check ignored directories
      for (const part of pathParts.slice(0, -1)) {
        if (IGNORED_DIRS.includes(part)) return false;
      }
      
      const filename = pathParts[pathParts.length - 1];
      if (IGNORED_FILES.includes(filename)) return false;
      
      const ext = '.' + filename.split('.').pop();
      if (!ALLOWED_EXTENSIONS.includes(ext) && filename !== 'Dockerfile' && filename !== 'Makefile') {
        return false;
      }
      
      return true;
    });

    return filteredTree;
  } catch (error) {
    throw new Error('Failed to fetch repository tree from GitHub.');
  }
};

export const fetchFileContents = async (owner, repo, branch, tree, accessToken = null) => {
  // To avoid hammering raw.githubusercontent.com and getting blocked, we will limit concurrent requests
  // and limit the total number of files we fetch to save DB/Context space.
  
  // Sort files to prioritize source code over md/json (except package.json)
  const sortedTree = [...tree].sort((a, b) => {
    if (a.path.includes('package.json')) return -1;
    if (b.path.includes('package.json')) return 1;
    if (a.path.endsWith('.md')) return 1;
    if (b.path.endsWith('.md')) return -1;
    return 0;
  });

  // Limit to 50 files for AI context safety
  const topFiles = sortedTree.slice(0, 50);
  const uploadedFiles = [];
  const folderStructure = {};

  const buildTree = (path) => {
    const parts = path.split('/');
    let current = folderStructure;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = 'file';
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    }
  };

  // Fetch concurrently in chunks of 10
  for (let i = 0; i < topFiles.length; i += 10) {
    const chunk = topFiles.slice(i, i + 10);
    const promises = chunk.map(async (file) => {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
        let headers = {};
        if (accessToken) {
          headers.Authorization = `token ${accessToken}`;
        }
        
        const response = await axios.get(rawUrl, { responseType: 'text', headers });
        const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
        
        uploadedFiles.push({ path: file.path, content });
        buildTree(file.path);
      } catch (err) {
        console.warn(`Failed to fetch raw file: ${file.path}`);
      }
    });
    
    await Promise.all(promises);
  }

  return { uploadedFiles, folderStructure };
};

export const fetchUserRepositories = async (accessToken) => {
  try {
    const headers = { Authorization: `token ${accessToken}` };
    // Fetch user's repos (including private), sorted by updated
    const { data } = await axios.get('https://api.github.com/user/repos?sort=updated&per_page=100', { headers });
    
    return data.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      description: repo.description,
      private: repo.private,
      url: repo.html_url,
      language: repo.language,
      updatedAt: repo.updated_at,
      stars: repo.stargazers_count,
    }));
  } catch (error) {
    throw new Error('Failed to fetch user repositories from GitHub.');
  }
};
