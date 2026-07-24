import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FolderTree, File, FileText, ChevronRight, ChevronDown, CheckCircle, AlertTriangle, Bug, ShieldAlert, Zap, Loader2, Download, Copy, Activity, MessageSquare, Star, GitFork } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import GithubChatAssistant from '../components/GithubChatAssistant';

const FileTreeNode = ({ name, node, currentPath, onSelect, selectedPath }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isFile = node === 'file';
  const fullPath = currentPath ? `${currentPath}/${name}` : name;

  if (isFile) {
    return (
      <div 
        onClick={() => onSelect(fullPath)}
        className={`flex items-center space-x-2 px-2 py-1 cursor-pointer text-sm rounded-md transition-colors ${selectedPath === fullPath ? 'bg-purple-100 text-purple-700 font-medium dark:bg-purple-900/30 dark:text-purple-300' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
      >
        <File className="w-4 h-4 opacity-70" />
        <span className="truncate">{name}</span>
      </div>
    );
  }

  return (
    <div className="select-none">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-2 py-1 cursor-pointer text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-md transition-colors font-medium"
      >
        {isOpen ? <ChevronDown className="w-4 h-4 opacity-70" /> : <ChevronRight className="w-4 h-4 opacity-70" />}
        <FolderTree className="w-4 h-4 text-blue-500 opacity-80" />
        <span className="truncate">{name}</span>
      </div>
      {isOpen && (
        <div className="ml-4 border-l border-gray-200 dark:border-gray-700 pl-1 mt-1 space-y-0.5">
          {Object.entries(node).map(([childName, childNode]) => (
            <FileTreeNode 
              key={childName}
              name={childName}
              node={childNode}
              currentPath={fullPath}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const GithubWorkspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [repoUrl, setRepoUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [githubStatus, setGithubStatus] = useState({ connected: false, username: '' });
  const [userRepos, setUserRepos] = useState([]);
  const [isFetchingRepos, setIsFetchingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [repository, setRepository] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('review');
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRepository();
    } else {
      checkGithubStatus();
    }
  }, [id]);

  const checkGithubStatus = async () => {
    try {
      const { data } = await api.get('/github-auth/status');
      setGithubStatus({ connected: data.connected, username: data.githubUsername });
      if (data.connected) {
        fetchUserRepos();
      }
    } catch (error) {
      console.error('Failed to get GitHub status');
    }
  };

  const fetchUserRepos = async () => {
    setIsFetchingRepos(true);
    try {
      const { data } = await api.get('/github/user-repos');
      setUserRepos(data.repositories || []);
    } catch (error) {
      toast.error('Failed to fetch your GitHub repositories');
    } finally {
      setIsFetchingRepos(false);
    }
  };

  const handleGithubLogin = async () => {
    try {
      const { data } = await api.get('/github-auth/auth');
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${data.clientId}&scope=repo,user`;
      window.location.href = authUrl;
    } catch (error) {
      toast.error('Failed to initialize GitHub login');
    }
  };

  const handleGithubDisconnect = async () => {
    try {
      await api.delete('/github-auth/disconnect');
      setGithubStatus({ connected: false, username: '' });
      setUserRepos([]);
      toast.success('GitHub account disconnected');
    } catch (error) {
      toast.error('Failed to disconnect GitHub account');
    }
  };

  const fetchRepository = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/github/repository/${id}`);
      setRepository(data.repository);
      if (data.repository.uploadedFiles?.length > 0) {
        setSelectedFile(data.repository.uploadedFiles[0]);
      }
    } catch (error) {
      toast.error('Failed to load repository');
      navigate('/github');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setIsImporting(true);
    try {
      const { data } = await api.post('/github/repository', { url: repoUrl });
      toast.success('Repository fetched successfully!');
      navigate(`/github/${data.repositoryId}`);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to import repository');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSelectFile = (path) => {
    if (!repository) return;
    const fileObj = repository.uploadedFiles.find(f => f.path === path);
    if (fileObj) {
      setSelectedFile(fileObj);
    }
  };

  const handleGenerateReview = async () => {
    if (!repository) return;
    setIsGeneratingReview(true);
    try {
      const { data } = await api.post(`/github/review/${repository._id}`);
      setRepository(prev => ({ ...prev, review: data.review }));
      toast.success('Repository analysis complete!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to analyze repository');
    } finally {
      setIsGeneratingReview(false);
    }
  };

  const handleGenerateDocs = async () => {
    if (!repository) return;
    setIsGeneratingDocs(true);
    try {
      const { data } = await api.post(`/github/documentation/${repository._id}`);
      setRepository(prev => ({ ...prev, documentation: data.documentation }));
      toast.success('Documentation generated!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate documentation');
    } finally {
      setIsGeneratingDocs(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('repo-pdf-export');
    element.style.display = 'block';
    const opt = {
      margin: [15, 15, 15, 15],
      filename: `${repository.repositoryName}-Documentation.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    await html2pdf().set(opt).from(element).save();
    element.style.display = 'none';
    toast.success('PDF Downloaded!');
  };

  const handleExportWord = () => {
    const element = document.getElementById('repo-pdf-export');
    const htmlString = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${repository.repositoryName} Documentation</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
            h1 { color: #581c87; border-bottom: 2px solid #581c87; padding-bottom: 5px; }
            h2 { color: #6b21a8; margin-top: 20px; }
            h3 { color: #7e22ce; }
            pre { background-color: #f3f4f6; padding: 10px; border-radius: 5px; }
            code { font-family: Consolas, monospace; }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `;
    try {
      const blob = new Blob(['\ufeff', htmlString], { type: 'application/msword' });
      saveAs(blob, `${repository.repositoryName}-Documentation.doc`);
      toast.success('Word Document Downloaded!');
    } catch (err) {
      toast.error('Failed to generate Word document.');
    }
  };

  const renderList = (items, icon, title, emptyMsg, colorClass) => {
    if (!items || items.length === 0) return null;
    return (
      <div className={`p-4 rounded-xl border ${colorClass.bg} ${colorClass.border}`}>
        <h4 className={`font-semibold flex items-center mb-3 ${colorClass.text}`}>
          {icon} <span className="ml-2">{title}</span>
        </h4>
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start text-sm">
              <span className={`mr-2 mt-1 ${colorClass.bullet}`}>•</span>
              <span className="text-gray-700 dark:text-gray-300">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const getLanguage = (filename) => {
    if (!filename) return 'javascript';
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'javascript';
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript';
    if (filename.endsWith('.py')) return 'python';
    if (filename.endsWith('.java')) return 'java';
    if (filename.endsWith('.cpp')) return 'cpp';
    if (filename.endsWith('.go')) return 'go';
    if (filename.endsWith('.php')) return 'php';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.md')) return 'markdown';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.html')) return 'html';
    return 'plaintext';
  };

  // IMPORT VIEW
  if (!id) {
    const filteredRepos = userRepos.filter(repo => 
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
      <div className="max-w-4xl mx-auto animate-fade-in mt-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white flex justify-center items-center">
            <FaGithub className="w-10 h-10 mr-4 text-gray-900 dark:text-white" />
            GitHub Repository Import
          </h1>
          <p className="text-gray-500 mt-3 text-lg">Paste a public GitHub URL to securely fetch and analyze the repository.</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 shadow-lg border border-gray-200 dark:border-gray-700">
          
          {githubStatus.connected ? (
            <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    Welcome, {githubStatus.username}
                  </h3>
                  <p className="text-sm text-gray-500">Your GitHub account is securely linked.</p>
                </div>
                <button 
                  onClick={handleGithubDisconnect}
                  className="mt-4 md:mt-0 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-lg transition-colors"
                >
                  Disconnect GitHub
                </button>
              </div>

              <div className="mb-4 relative">
                <input 
                  type="text" 
                  placeholder="Search your repositories..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white"
                />
                <div className="absolute left-3 top-3.5 text-gray-400">
                  <FaGithub className="w-5 h-5" />
                </div>
              </div>

              <div className="h-72 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                {isFetchingRepos ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  </div>
                ) : filteredRepos.length > 0 ? (
                  filteredRepos.map(repo => (
                    <div 
                      key={repo.id}
                      onClick={() => {
                        setRepoUrl(repo.url);
                        handleImport({ preventDefault: () => {} });
                      }}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-500 dark:hover:border-purple-500 cursor-pointer transition-all group"
                    >
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">{repo.name}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${repo.private ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                            {repo.private ? 'Private' : 'Public'}
                          </span>
                        </div>
                        {repo.description && <p className="text-xs text-gray-500 line-clamp-1">{repo.description}</p>}
                      </div>
                      <div className="flex items-center space-x-4 mt-3 md:mt-0 text-xs text-gray-500 font-medium">
                        {repo.language && <span>{repo.language}</span>}
                        <span className="flex items-center"><Star className="w-3 h-3 mr-1" /> {repo.stars}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    No repositories found.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <button
                onClick={handleGithubLogin}
                className="w-full py-4 bg-[#24292e] hover:bg-[#1b1f23] text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center shadow-md"
              >
                <FaGithub className="w-6 h-6 mr-3" /> Continue with GitHub (For Private Repos)
              </button>
              
              <div className="flex items-center my-6">
                <div className="flex-1 border-t border-gray-300 dark:border-gray-700"></div>
                <span className="px-4 text-sm text-gray-500 font-medium">OR PASTE A PUBLIC URL</span>
                <div className="flex-1 border-t border-gray-300 dark:border-gray-700"></div>
              </div>
            </div>
          )}

          <form onSubmit={handleImport} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Public Repository URL
              </label>
              <input 
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/facebook/react"
                className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 outline-none text-gray-900 dark:text-white transition-all text-lg font-medium"
                required={!githubStatus.connected}
                disabled={isImporting}
              />
            </div>
            
            <button
              type="submit"
              disabled={isImporting || !repoUrl.trim()}
              className="w-full py-4 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-gray-900 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center disabled:opacity-70"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" /> Fetching Repository...
                </>
              ) : (
                <>
                  <FaGithub className="w-6 h-6 mr-3" /> Analyze Repository
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Supported Languages</h4>
            <div className="flex flex-wrap gap-3">
              {['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'PHP', 'C#'].map(lang => (
                <span key={lang} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
                  {lang}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-6">Note: For large repositories, we automatically prioritize fetching the most relevant source files to ensure optimal AI performance.</p>
          </div>
        </div>
      </div>
    );
  }

  // WORKSPACE VIEW
  if (isLoading || !repository) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-gray-900 dark:text-white" />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto animate-fade-in flex flex-col h-[calc(100vh-8rem)]">
      
      {/* Header Info */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <FaGithub className="w-6 h-6 mr-3 text-gray-900 dark:text-white" />
            <a href={repository.repositoryUrl} target="_blank" rel="noreferrer" className="hover:underline">
              {repository.owner} / {repository.repositoryName}
            </a>
            {repository.languages?.[0] && (
              <span className="ml-4 px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 text-xs rounded-full uppercase tracking-wider font-bold">
                {repository.languages[0]}
              </span>
            )}
          </h1>
          <div className="flex items-center text-gray-500 dark:text-gray-400 mt-2 text-sm space-x-4">
            <span className="flex items-center"><File className="w-4 h-4 mr-1" /> {repository.uploadedFiles.length} files fetched</span>
            <span className="flex items-center"><GitFork className="w-4 h-4 mr-1" /> {repository.defaultBranch}</span>
          </div>
        </div>
        <div className="mt-4 lg:mt-0 flex space-x-3">
          <button
            onClick={handleGenerateReview}
            disabled={isGeneratingReview}
            className="bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center disabled:opacity-50 border border-gray-300 dark:border-gray-600"
          >
            {isGeneratingReview ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
            {repository.review ? 'Re-Analyze Repository' : 'Analyze Repository Architecture'}
          </button>
          
          <button
            onClick={handleGenerateDocs}
            disabled={isGeneratingDocs || !repository.review}
            className="bg-purple-600 text-white hover:bg-purple-700 px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            title={!repository.review ? 'Analyze the repository first to unlock documentation' : ''}
          >
            {isGeneratingDocs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            {repository.documentation ? 'Regenerate Docs' : 'Generate Project Docs'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* Left: Explorer */}
        <div className="w-full lg:w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden min-h-[300px] lg:min-h-0 flex-shrink-0">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Explorer</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
            {Object.entries(repository.folderStructure).map(([name, node]) => (
              <FileTreeNode 
                key={name}
                name={name}
                node={node}
                currentPath=""
                onSelect={handleSelectFile}
                selectedPath={selectedFile?.path}
              />
            ))}
          </div>
        </div>

        {/* Middle: Code Editor */}
        <div className="flex-1 bg-[#1e1e1e] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden min-h-[400px] lg:min-h-0">
          <div className="px-4 py-2 bg-[#2d2d2d] flex justify-between items-center">
            <span className="text-sm font-medium text-gray-300 flex items-center">
              <File className="w-4 h-4 mr-2" />
              {selectedFile ? selectedFile.path : 'No file selected'}
            </span>
          </div>
          <div className="flex-1 min-h-0 relative">
            {selectedFile ? (
              <Editor
                height="100%"
                language={getLanguage(selectedFile.path)}
                value={selectedFile.content}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Select a file from the explorer to view code.
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Analysis & Docs */}
        <div className="w-full lg:w-[450px] bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden min-h-[500px] lg:min-h-0 flex-shrink-0">
          
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button 
              onClick={() => setActiveTab('review')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'review' ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Review
            </button>
            <button 
              onClick={() => setActiveTab('docs')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'docs' ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Documentation
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center ${activeTab === 'chat' ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              <MessageSquare className="w-4 h-4 mr-1.5" /> Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/30">
            
            {activeTab === 'review' && (
              <div className="space-y-6 p-5">
                {!repository.review ? (
                  <div className="text-center py-10 opacity-60">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">Click "Analyze Repository" to generate a full architectural review.</p>
                  </div>
                ) : (
                  <div className="animate-fade-in space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
                      <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-2">Repository Score</p>
                      <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-300 dark:to-white">
                        {repository.review.overallScore}/10
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-5 rounded-xl">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Summary</h4>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">{repository.review.summary}</p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                      <h4 className="font-semibold mb-2 flex items-center text-gray-900 dark:text-white">
                        <FolderTree className="w-4 h-4 mr-2 text-blue-500" /> Architecture
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{repository.review.architectureAnalysis}</p>
                    </div>

                    {renderList(repository.review.securityIssues, <ShieldAlert className="w-4 h-4"/>, "Security Risks", null, { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-100 dark:border-red-900/50', text: 'text-red-800 dark:text-red-300', bullet: 'text-red-500' })}
                    {renderList(repository.review.potentialBugs, <Bug className="w-4 h-4"/>, "Potential Bugs", null, { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-100 dark:border-orange-900/50', text: 'text-orange-800 dark:text-orange-300', bullet: 'text-orange-500' })}
                    {renderList(repository.review.missingFeatures, <AlertTriangle className="w-4 h-4"/>, "Missing Features", null, { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-100 dark:border-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-300', bullet: 'text-yellow-500' })}
                    {renderList(repository.review.performanceSuggestions, <Zap className="w-4 h-4"/>, "Performance Tips", null, { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-900/50', text: 'text-blue-800 dark:text-blue-300', bullet: 'text-blue-500' })}
                    {renderList(repository.review.bestPractices, <CheckCircle className="w-4 h-4"/>, "Best Practices Violated", null, { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-100 dark:border-indigo-900/50', text: 'text-indigo-800 dark:text-indigo-300', bullet: 'text-indigo-500' })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'docs' && (
              <div className="space-y-4 h-full flex flex-col p-5">
                {!repository.documentation ? (
                  <div className="text-center py-10 opacity-60">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">Click "Generate Docs" to create full README documentation for this repository.</p>
                  </div>
                ) : (
                  <div className="animate-fade-in flex flex-col h-full border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                    <div className="bg-gray-100 dark:bg-gray-900 px-4 py-2 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                      <span className="text-xs font-bold text-gray-500 uppercase">Repository README.md</span>
                      <div className="flex space-x-2">
                        <button onClick={handleExportWord} className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" title="Download Word (.docx)">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button onClick={handleExportPDF} className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" title="Download PDF">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => copyToClipboard(repository.documentation)} className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" title="Copy Markdown">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto prose prose-sm prose-gray dark:prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" className="rounded-lg my-2" {...props}>
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-300 px-1 py-0.5 rounded text-xs" {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {repository.documentation}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'chat' && (
              <GithubChatAssistant repositoryId={repository._id} repository={repository} />
            )}

          </div>
        </div>
      </div>

      {/* Hidden Div for PDF Generation */}
      {repository.documentation && (
        <div id="repo-pdf-export" style={{ display: 'none' }} className="p-8 bg-white text-black font-sans w-[800px]">
          <div className="border-b-2 border-gray-900 pb-4 mb-6">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{repository.repositoryName} Documentation</h1>
            <p className="text-gray-500 font-medium">Owner: <span>{repository.owner}</span></p>
            <p className="text-gray-500 font-medium text-sm">Generated on: {new Date().toLocaleString()}</p>
          </div>
          <div className="prose prose-gray max-w-none">
            <ReactMarkdown>{repository.documentation}</ReactMarkdown>
          </div>
        </div>
      )}

    </div>
  );
};

export default GithubWorkspace;
