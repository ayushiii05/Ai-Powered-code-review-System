import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FolderTree, UploadCloud, File, FileText, ChevronRight, ChevronDown, CheckCircle, AlertTriangle, Bug, Code2, ShieldAlert, Zap, Loader2, Play, Download, Copy, Activity, Cpu, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ProjectChatAssistant from '../components/ProjectChatAssistant';

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

const ProjectWorkspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State: Upload
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // State: Workspace
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeTab, setActiveTab] = useState('review'); // 'review' | 'docs'
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProject();
    }
  }, [id]);

  const fetchProject = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/project/${id}`);
      setProject(data.project);
      
      // Auto-select first file if available
      if (data.project.uploadedFiles?.length > 0) {
        setSelectedFile(data.project.uploadedFiles[0]);
      }
    } catch (error) {
      toast.error('Failed to load project');
      navigate('/workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isZip = file.name.endsWith('.zip');
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File exceeds 100MB limit.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const endpoint = isZip ? '/project/upload/zip' : '/project/upload/file';
      const { data } = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Project uploaded successfully!');
      navigate(`/workspace/${data.projectId}`);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to upload project');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectFile = (path) => {
    if (!project) return;
    const fileObj = project.uploadedFiles.find(f => f.path === path);
    if (fileObj) {
      setSelectedFile(fileObj);
    }
  };

  const handleGenerateReview = async () => {
    if (!project) return;
    setIsGeneratingReview(true);
    try {
      const { data } = await api.post(`/project/${project._id}/review`);
      setProject(prev => ({ ...prev, review: data.review }));
      toast.success('Project analysis complete!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to analyze project');
    } finally {
      setIsGeneratingReview(false);
    }
  };

  const handleGenerateDocs = async () => {
    if (!project) return;
    setIsGeneratingDocs(true);
    try {
      const { data } = await api.post(`/project/${project._id}/documentation`);
      setProject(prev => ({ ...prev, documentation: data.documentation }));
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
    const element = document.getElementById('project-pdf-export');
    element.style.display = 'block';
    const opt = {
      margin: [15, 15, 15, 15],
      filename: `${project.projectName}-Documentation.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    await html2pdf().set(opt).from(element).save();
    element.style.display = 'none';
    toast.success('PDF Downloaded!');
  };

  const handleExportWord = () => {
    const element = document.getElementById('project-pdf-export');
    
    const htmlString = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${project.projectName} Documentation</title>
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
      saveAs(blob, `${project.projectName}-Documentation.doc`);
      toast.success('Word Document Downloaded!');
    } catch (err) {
      console.error(err);
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

  // UPLOAD VIEW
  if (!id) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in mt-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white flex justify-center items-center">
            <FolderTree className="w-10 h-10 mr-4 text-purple-600" />
            Project Workspace
          </h1>
          <p className="text-gray-500 mt-3 text-lg">Upload an entire ZIP project or a single file for deep architectural AI analysis.</p>
        </div>

        <div 
          className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl p-16 text-center hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all cursor-pointer relative"
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".zip,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.go,.php,.cs" 
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-16 h-16 text-purple-600 animate-spin mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Uploading & Processing...</h3>
              <p className="text-gray-500 mt-2">Extracting safe files and building workspace tree.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-6">
                <UploadCloud className="w-10 h-10 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Click to Upload or Drag & Drop</h3>
              <p className="text-gray-500 mb-6">Supports .ZIP projects or single source files (Max 100MB)</p>
              
              <div className="flex space-x-4">
                <span className="px-4 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium text-gray-600 dark:text-gray-400">Node.js</span>
                <span className="px-4 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium text-gray-600 dark:text-gray-400">React</span>
                <span className="px-4 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium text-gray-600 dark:text-gray-400">Python</span>
                <span className="px-4 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium text-gray-600 dark:text-gray-400">Java</span>
              </div>
              <p className="text-xs text-gray-400 mt-8">Note: Heavy folders like node_modules, build, and binaries are automatically ignored.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // WORKSPACE VIEW
  if (isLoading || !project) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

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

  return (
    <div className="max-w-[1600px] mx-auto animate-fade-in flex flex-col h-[calc(100vh-8rem)]">
      
      {/* Header Info */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <FolderTree className="w-6 h-6 mr-3 text-purple-600" />
            {project.projectName}
            <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full uppercase tracking-wider font-bold">
              {project.framework}
            </span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm flex items-center">
            <File className="w-4 h-4 mr-1" /> {project.uploadedFiles.length} files extracted
          </p>
        </div>
        <div className="mt-4 lg:mt-0 flex space-x-3">
          <button
            onClick={handleGenerateReview}
            disabled={isGeneratingReview}
            className="bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center disabled:opacity-50"
          >
            {isGeneratingReview ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
            {project.review ? 'Re-Analyze Project' : 'Analyze Project Architecture'}
          </button>
          
          <button
            onClick={handleGenerateDocs}
            disabled={isGeneratingDocs || !project.review}
            className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            title={!project.review ? 'Analyze the project first to unlock documentation' : ''}
          >
            {isGeneratingDocs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            {project.documentation ? 'Regenerate Docs' : 'Generate Project Docs'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* Left: VS Code Explorer */}
        <div className="w-full lg:w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden min-h-[300px] lg:min-h-0 flex-shrink-0">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Explorer</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
            {Object.entries(project.folderStructure).map(([name, node]) => (
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
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'review' ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Project Review
            </button>
            <button 
              onClick={() => setActiveTab('docs')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'docs' ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Documentation
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center ${activeTab === 'chat' ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              <MessageSquare className="w-4 h-4 mr-1.5" /> AI Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/30">
            
            {activeTab === 'review' && (
              <div className="space-y-6 p-5">
                {!project.review ? (
                  <div className="text-center py-10 opacity-60">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">Click "Analyze Project" to generate a full architectural review.</p>
                  </div>
                ) : (
                  <div className="animate-fade-in space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
                      <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-2">Project Score</p>
                      <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                        {project.review.overallScore}/10
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/50 p-5 rounded-xl">
                      <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">Summary</h4>
                      <p className="text-purple-800 dark:text-purple-400 text-sm">{project.review.summary}</p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                      <h4 className="font-semibold mb-2 flex items-center text-gray-900 dark:text-white">
                        <FolderTree className="w-4 h-4 mr-2 text-blue-500" /> Architecture
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{project.review.architectureAnalysis}</p>
                    </div>

                    {renderList(project.review.securityIssues, <ShieldAlert className="w-4 h-4"/>, "Security Risks", null, { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-100 dark:border-red-900/50', text: 'text-red-800 dark:text-red-300', bullet: 'text-red-500' })}
                    {renderList(project.review.potentialBugs, <Bug className="w-4 h-4"/>, "Potential Bugs", null, { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-100 dark:border-orange-900/50', text: 'text-orange-800 dark:text-orange-300', bullet: 'text-orange-500' })}
                    {renderList(project.review.missingFeatures, <AlertTriangle className="w-4 h-4"/>, "Missing Features", null, { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-100 dark:border-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-300', bullet: 'text-yellow-500' })}
                    {renderList(project.review.performanceSuggestions, <Zap className="w-4 h-4"/>, "Performance Tips", null, { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-900/50', text: 'text-blue-800 dark:text-blue-300', bullet: 'text-blue-500' })}
                    {renderList(project.review.bestPractices, <CheckCircle className="w-4 h-4"/>, "Best Practices Violated", null, { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-100 dark:border-indigo-900/50', text: 'text-indigo-800 dark:text-indigo-300', bullet: 'text-indigo-500' })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'docs' && (
              <div className="space-y-4 h-full flex flex-col">
                {!project.documentation ? (
                  <div className="text-center py-10 opacity-60">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">Click "Generate Docs" to create full README documentation for this project.</p>
                  </div>
                ) : (
                  <div className="animate-fade-in flex flex-col h-full border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                    <div className="bg-gray-100 dark:bg-gray-900 px-4 py-2 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                      <span className="text-xs font-bold text-gray-500 uppercase">Project README.md</span>
                      <div className="flex space-x-2">
                        <button onClick={handleExportWord} className="p-1.5 text-gray-500 hover:text-purple-600 transition-colors" title="Download Word (.docx)">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button onClick={handleExportPDF} className="p-1.5 text-gray-500 hover:text-purple-600 transition-colors" title="Download PDF">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => copyToClipboard(project.documentation)} className="p-1.5 text-gray-500 hover:text-purple-600 transition-colors" title="Copy Markdown">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto prose prose-sm prose-purple dark:prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" className="rounded-lg my-2" {...props}>
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className="bg-gray-100 dark:bg-gray-800 text-purple-600 dark:text-purple-400 px-1 py-0.5 rounded text-xs" {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {project.documentation}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'chat' && (
              <ProjectChatAssistant projectId={project._id} project={project} />
            )}

          </div>
        </div>
      </div>

      {/* Hidden Div for PDF Generation */}
      {project.documentation && (
        <div id="project-pdf-export" style={{ display: 'none' }} className="p-8 bg-white text-black font-sans w-[800px]">
          <div className="border-b-2 border-purple-600 pb-4 mb-6">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{project.projectName} Documentation</h1>
            <p className="text-gray-500 font-medium">Framework: <span className="uppercase">{project.framework}</span></p>
            <p className="text-gray-500 font-medium text-sm">Generated on: {new Date().toLocaleString()}</p>
          </div>
          <div className="prose prose-purple max-w-none">
            <ReactMarkdown>{project.documentation}</ReactMarkdown>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProjectWorkspace;
