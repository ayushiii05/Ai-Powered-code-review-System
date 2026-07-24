import Project from '../models/Project.js';
import AdmZip from 'adm-zip';
import { analyzeProjectStructure, generateProjectDocs, sendProjectChatMessage } from '../services/groqService.js';
import Notification from '../models/Notification.js';
import ProjectChat from '../models/ProjectChat.js';

// Ignore patterns
const IGNORED_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.vscode', '.idea'];
const IGNORED_FILES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store'];
const ALLOWED_EXTS = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.go', '.php', '.cs', '.html', '.css', '.json', '.md'];

const isIgnored = (path) => {
  const parts = path.split('/');
  for (let part of parts) {
    if (IGNORED_DIRS.includes(part)) return true;
  }
  const filename = parts[parts.length - 1];
  if (IGNORED_FILES.includes(filename)) return true;
  return false;
};

const getExtension = (filename) => {
  const match = filename.match(/\.[0-9a-z]+$/i);
  return match ? match[0].toLowerCase() : '';
};

const buildFolderStructure = (files) => {
  const root = {};
  files.forEach(file => {
    const parts = file.path.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = "file";
      } else {
        current[part] = current[part] || {};
        current = current[part];
      }
    }
  });
  return root;
};

const detectFramework = (files) => {
  const packageJsonFile = files.find(f => f.path.endsWith('package.json'));
  if (packageJsonFile) {
    try {
      const pkg = JSON.parse(packageJsonFile.content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps['next']) return 'Next.js';
      if (deps['react']) return 'React';
      if (deps['vue']) return 'Vue.js';
      if (deps['@angular/core']) return 'Angular';
      if (deps['express']) return 'Express / Node.js';
    } catch(e) {}
  }
  const reqTxt = files.find(f => f.path.endsWith('requirements.txt'));
  if (reqTxt) {
    if (reqTxt.content.includes('Django')) return 'Django';
    if (reqTxt.content.includes('Flask')) return 'Flask';
  }
  return 'Unknown/Vanilla';
};

// @desc    Upload ZIP project
// @route   POST /api/project/upload/zip
// @access  Private
export const uploadProjectZip = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();
    
    let uploadedFiles = [];
    let languagesSet = new Set();
    
    let totalSize = 0;
    const MAX_TOTAL_SIZE = 12 * 1024 * 1024; // 12 MB max for MongoDB BSON limit

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      const path = entry.entryName;
      if (isIgnored(path)) continue;
      
      const ext = getExtension(path);
      if (!ALLOWED_EXTS.includes(ext) && ext !== '') continue;
      
      if (!ALLOWED_EXTS.includes(ext)) {
        if (!path.endsWith('Dockerfile') && !path.endsWith('.env.example')) continue;
      }

      // Skip individual files larger than 250KB to save DB space
      if (entry.header.size > 250 * 1024) continue;

      if (ext) languagesSet.add(ext.replace('.', ''));

      const content = entry.getData().toString('utf8');
      
      // Skip empty files to prevent Mongoose "Path `content` is required" validation errors
      if (!content || content.trim() === '') continue;
      
      if (totalSize + content.length > MAX_TOTAL_SIZE) {
        console.warn('Hit maximum DB storage size for project, truncating remaining files.');
        break; 
      }
      
      totalSize += content.length;
      uploadedFiles.push({ path, content });
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ message: 'No supported source files found in ZIP' });
    }

    const folderStructure = buildFolderStructure(uploadedFiles);
    const framework = detectFramework(uploadedFiles);
    const projectName = req.file.originalname.replace('.zip', '');

    const project = await Project.create({
      userId: req.user._id,
      projectName,
      projectType: 'zip',
      framework,
      languages: Array.from(languagesSet),
      folderStructure,
      uploadedFiles
    });

    res.status(201).json({ success: true, projectId: project._id, project });
  } catch (error) {
    import('fs').then(fs => fs.appendFileSync('crash.log', error.stack + '\\n'));
    console.error('ZIP Upload Error:', error);
    res.status(500).json({ message: 'Failed to process ZIP file: ' + (error.message || error.toString()) });
  }
};

// @desc    Upload Single File as Project
// @route   POST /api/project/upload/file
// @access  Private
export const uploadSingleFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const path = req.file.originalname;
    const content = req.file.buffer.toString('utf8');
    const ext = getExtension(path);
    const languages = ext ? [ext.replace('.', '')] : [];
    
    const folderStructure = { [path]: "file" };

    const project = await Project.create({
      userId: req.user._id,
      projectName: path,
      projectType: 'single_file',
      framework: 'Vanilla',
      languages,
      folderStructure,
      uploadedFiles: [{ path, content }]
    });

    res.status(201).json({ success: true, projectId: project._id, project });
  } catch (error) {
    console.error('File Upload Error:', error);
    res.status(500).json({ message: 'Failed to process file: ' + (error.message || error.toString()) });
  }
};

// @desc    Get Project by ID
// @route   GET /api/project/:id
// @access  Private
export const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.userId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Generate Project Review
// @route   POST /api/project/:id/review
// @access  Private
export const generateProjectReview = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.userId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });

    const reviewData = await analyzeProjectStructure(project.uploadedFiles, project);
    project.review = reviewData;
    await project.save();

    await Notification.create({
      userId: req.user._id,
      title: 'Project Analysis Complete',
      message: `AI has completed architectural review of ${project.projectName}.`,
      type: 'success'
    });

    res.json({ success: true, review: reviewData });
  } catch (error) {
    console.error('Project Review Error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate project review' });
  }
};

// @desc    Generate Project Documentation
// @route   POST /api/project/:id/documentation
// @access  Private
export const generateProjectDocumentation = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.userId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });

    const docs = await generateProjectDocs(project.uploadedFiles, project, project.review);
    project.documentation = docs;
    await project.save();

    await Notification.create({
      userId: req.user._id,
      title: 'Documentation Generated',
      message: `AI has generated comprehensive documentation for ${project.projectName}.`,
      type: 'success'
    });

    res.json({ success: true, documentation: docs });
  } catch (error) {
    console.error('Project Docs Error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate project documentation' });
  }
};

// @desc    Send a chat message for a project
// @route   POST /api/project/:id/chat
// @access  Private
export const sendProjectChat = async (req, res) => {
  try {
    const { message } = req.body;
    const projectId = req.params.id;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const project = await Project.findOne({ _id: projectId, userId: req.user._id });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get or create chat history
    let chat = await ProjectChat.findOne({ projectId, userId: req.user._id });
    if (!chat) {
      chat = await ProjectChat.create({
        projectId,
        userId: req.user._id,
        messages: []
      });
    }

    // Call Groq API
    const aiResponseContent = await sendProjectChatMessage(
      project.uploadedFiles,
      project,
      project.review,
      chat.messages,
      message
    );

    // Save messages
    const userMessage = { role: 'user', content: message };
    const aiMessage = { role: 'assistant', content: aiResponseContent };

    chat.messages.push(userMessage, aiMessage);
    await chat.save();

    res.status(200).json({
      success: true,
      data: {
        userMessage,
        aiResponse: aiMessage
      }
    });
  } catch (error) {
    console.error('Project Chat Controller Error:', error);
    res.status(500).json({ message: error.message || 'Server Error during chat' });
  }
};

// @desc    Get chat history for a project
// @route   GET /api/project/:id/chat
// @access  Private
export const getProjectChatHistory = async (req, res) => {
  try {
    const projectId = req.params.id;
    const chat = await ProjectChat.findOne({ projectId, userId: req.user._id });
    
    res.status(200).json({
      success: true,
      data: chat ? chat.messages : []
    });
  } catch (error) {
    console.error('Get Project Chat Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Clear chat history for a project
// @route   DELETE /api/project/:id/chat
// @access  Private
export const clearProjectChat = async (req, res) => {
  try {
    const projectId = req.params.id;
    await ProjectChat.findOneAndDelete({ projectId, userId: req.user._id });
    
    res.status(200).json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    console.error('Clear Project Chat Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

