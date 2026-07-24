import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Copy, Trash2, Maximize, CheckCircle, AlertTriangle, Code2, Loader2, Bug, ShieldAlert, Zap, BookOpen, ThumbsUp, Activity, Cpu, FileText, ArrowRightLeft, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ChatAssistant from '../components/ChatAssistant';
import html2pdf from 'html2pdf.js';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const LANGUAGE_TEMPLATES = {
  javascript: '// JavaScript Template\nfunction greet(name) {\n  console.log(`Hello, ${name}!`);\n}\ngreet("World");',
  typescript: '// TypeScript Template\nfunction add(a: number, b: number): number {\n  return a + b;\n}\nconsole.log(add(5, 10));',
  python: '# Python Template\ndef fibonacci(n):\n    if n <= 0: return []\n    if n == 1: return [0]\n    seq = [0, 1]\n    while len(seq) < n:\n        seq.append(seq[-1] + seq[-2])\n    return seq\n\nprint(fibonacci(10))',
  java: '// Java Template\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
  c: '// C Template\n#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
  cpp: '// C++ Template\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
  go: '// Go Template\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
  php: '<?php\n// PHP Template\nfunction factorial($n) {\n    if ($n <= 1) return 1;\n    return $n * factorial($n - 1);\n}\n\necho factorial(5);\n?>'
};

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
  { value: 'php', label: 'PHP' }
];

const Review = () => {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(LANGUAGE_TEMPLATES.javascript);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const editorContainerRef = useRef(null);

  // New Advanced Phase 7 States
  const [activeTab, setActiveTab] = useState('review');
  const [documentation, setDocumentation] = useState('');
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('python');
  const [convertedCode, setConvertedCode] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(LANGUAGE_TEMPLATES[newLang]);
    setReviewResult(null);
    setActiveTab('review');
    setDocumentation('');
    setConvertedCode('');
  };

  const copyToClipboard = (textToCopy = code) => {
    navigator.clipboard.writeText(textToCopy);
    toast.success('Copied to clipboard!');
  };

  const clearEditor = () => {
    setCode('');
    setReviewResult(null);
    setActiveTab('review');
    setDocumentation('');
    setConvertedCode('');
    toast.success('Editor cleared');
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      editorContainerRef.current.requestFullscreen().catch(err => {
        toast.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleReviewCode = async () => {
    if (!code.trim()) {
      toast.error('Editor is empty! Please write or paste some code.');
      return;
    }
    setIsReviewing(true);
    setReviewResult(null);
    setActiveTab('review');

    try {
      const { data } = await api.post('/review', { language, code });
      setReviewResult({ ...data.data, reviewId: data.reviewId });
      toast.success('Code review completed!');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to analyze code.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleGenerateDocs = async () => {
    setIsGeneratingDocs(true);
    try {
      const { data } = await api.post('/advanced/documentation', { language, code, reviewId: reviewResult?.reviewId });
      setDocumentation(data.data.content);
      toast.success('Documentation generated!');
    } catch (error) {
      toast.error('Failed to generate documentation');
    } finally {
      setIsGeneratingDocs(false);
    }
  };

  const handleConvertCode = async () => {
    setIsConverting(true);
    try {
      const { data } = await api.post('/advanced/convert', { sourceLanguage: language, targetLanguage, code, reviewId: reviewResult?.reviewId });
      setConvertedCode(data.data.content);
      toast.success('Code converted!');
    } catch (error) {
      toast.error('Failed to convert code');
    } finally {
      setIsConverting(false);
    }
  };

  const handleExport = async (format) => {
    setIsExporting(true);
    try {
      if (format === 'pdf') {
        const element = document.getElementById('pdf-export-content');
        element.style.display = 'block';
        
        const opt = {
          margin: [15, 15, 15, 15],
          filename: 'AI-Documentation.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        await html2pdf().set(opt).from(element).save();
        element.style.display = 'none';
        toast.success('Documentation PDF downloaded!');
        setIsExporting(false);
        return;
      }

      // Handle TXT / MD via backend
      const payload = {
        format,
        documentation,
        language
      };
      const response = await api.post('/advanced/export', payload, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `documentation.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Documentation downloaded!');
    } catch (error) {
      toast.error('Failed to export documentation');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const renderList = (items, icon, title, emptyMsg, colorClass) => {
    if (!items || items.length === 0) {
      return (
        <div className={`p-4 rounded-xl border flex items-center bg-gray-50 border-gray-100`}>
          <CheckCircle className={`w-5 h-5 mr-3 text-green-500`} />
          <span className="text-gray-600 font-medium">{emptyMsg}</span>
        </div>
      );
    }
    return (
      <div className={`p-5 rounded-xl border ${colorClass.bg} ${colorClass.border}`}>
        <h4 className={`font-semibold flex items-center mb-3 ${colorClass.text}`}>
          {icon} <span className="ml-2">{title}</span>
        </h4>
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start text-sm">
              <span className={`mr-2 mt-1 ${colorClass.bullet}`}>•</span>
              <span className="text-gray-700">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in flex flex-col min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)]">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Code2 className="w-6 h-6 mr-2 text-purple-600" />
            AI Code Review & Tools
          </h1>
          <p className="text-gray-500 mt-1">Review, document, translate, and chat with your code.</p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={handleReviewCode}
            disabled={isReviewing || !code.trim()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isReviewing ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Play className="w-5 h-5 mr-2" />
            )}
            {isReviewing ? 'Analyzing...' : 'Review Code'}
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        
        {/* Editor Section */}
        <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px] lg:min-h-0" ref={editorContainerRef}>
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <select
                value={language}
                onChange={handleLanguageChange}
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2 font-medium"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-1">
              <button onClick={() => copyToClipboard(code)} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors" title="Copy Code">
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={clearEditor} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Clear Editor">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={toggleFullScreen} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors" title="Toggle Fullscreen">
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 relative">
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                formatOnPaste: true,
                formatOnType: true,
                automaticLayout: true,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 }
              }}
            />
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden min-h-[500px] lg:min-h-0">
          
          {/* Tabs */}
          <div className="px-6 pt-4 bg-gray-50 border-b border-gray-200 flex flex-col justify-end">
            <div className="flex gap-6 overflow-x-auto scrollbar-hide">
              <button 
                onClick={() => setActiveTab('review')} 
                className={`flex items-center pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'review' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
              >
                <CheckCircle className="w-4 h-4 mr-2" /> AI Review
              </button>
              <button 
                onClick={() => setActiveTab('docs')} 
                disabled={!reviewResult} 
                className={`flex items-center pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'docs' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed'}`}
              >
                <FileText className="w-4 h-4 mr-2" /> Documentation
              </button>
              <button 
                onClick={() => setActiveTab('convert')} 
                disabled={!reviewResult} 
                className={`flex items-center pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'convert' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed'}`}
              >
                <ArrowRightLeft className="w-4 h-4 mr-2" /> Convert Code
              </button>
              <button 
                onClick={() => setActiveTab('export')} 
                disabled={!reviewResult} 
                className={`flex items-center pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'export' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed'}`}
              >
                <Download className="w-4 h-4 mr-2" /> Export
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto bg-gray-50/30">
            {isReviewing ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-purple-200 rounded-full"></div>
                  <div className="w-16 h-16 border-4 border-purple-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                </div>
                <p className="text-gray-500 font-medium animate-pulse">AI is analyzing your code...</p>
              </div>
            ) : reviewResult ? (
              
              <div className="animate-fade-in">
                {/* 1. REVIEW TAB */}
                {activeTab === 'review' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm text-center flex flex-col justify-center">
                        <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-2">Overall Score</p>
                        <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                          {reviewResult.overallScore}
                        </div>
                      </div>
                      <div className="sm:col-span-2 bg-purple-50 border border-purple-100 p-5 rounded-xl flex flex-col justify-center">
                        <h4 className="font-semibold text-purple-900 mb-2">Summary</h4>
                        <p className="text-purple-800 text-sm leading-relaxed">{reviewResult.summary}</p>
                      </div>
                    </div>

                    <div className="flex space-x-4">
                      <div className="flex-1 bg-white border border-gray-100 p-4 rounded-xl flex items-center shadow-sm">
                        <Activity className="w-8 h-8 text-blue-500 bg-blue-50 p-1.5 rounded-lg mr-3" />
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase">Time Complexity</p>
                          <p className="font-bold text-gray-900">{reviewResult.timeComplexity}</p>
                        </div>
                      </div>
                      <div className="flex-1 bg-white border border-gray-100 p-4 rounded-xl flex items-center shadow-sm">
                        <Cpu className="w-8 h-8 text-green-500 bg-green-50 p-1.5 rounded-lg mr-3" />
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase">Space Complexity</p>
                          <p className="font-bold text-gray-900">{reviewResult.spaceComplexity}</p>
                        </div>
                      </div>
                    </div>

                    {renderList(reviewResult.bugs, <Bug className="w-5 h-5"/>, "Bugs & Errors", "No bugs found! Great job.", { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-800', bullet: 'text-red-500' })}
                    {renderList(reviewResult.securityIssues, <ShieldAlert className="w-5 h-5"/>, "Security Issues", "No security vulnerabilities detected.", { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-800', bullet: 'text-orange-500' })}
                    {renderList(reviewResult.performanceSuggestions, <Zap className="w-5 h-5"/>, "Performance Suggestions", "Code is already highly performant.", { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-800', bullet: 'text-blue-500' })}
                    {renderList(reviewResult.readabilitySuggestions, <BookOpen className="w-5 h-5"/>, "Readability Tips", "Code is perfectly readable.", { bg: 'bg-teal-50', border: 'border-teal-100', text: 'text-teal-800', bullet: 'text-teal-500' })}
                    {renderList(reviewResult.bestPractices, <ThumbsUp className="w-5 h-5"/>, "Best Practices", "All best practices followed.", { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-800', bullet: 'text-indigo-500' })}

                    {reviewResult.optimizedCode && (
                      <div className="mt-8 border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-gray-900">
                        <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                          <span className="text-sm font-semibold text-gray-300 flex items-center">
                            <Code2 className="w-4 h-4 mr-2" /> Optimized Code Suggestion
                          </span>
                          <button onClick={() => copyToClipboard(reviewResult.optimizedCode)} className="text-gray-400 hover:text-white transition-colors" title="Copy Optimized Code">
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="h-64">
                          <Editor height="100%" language={language} value={reviewResult.optimizedCode} theme="vs-dark" options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }} />
                        </div>
                      </div>
                    )}

                    <ChatAssistant reviewId={reviewResult.reviewId} language={language} code={code} reviewResult={reviewResult} />
                  </div>
                )}

                {/* 2. DOCS TAB */}
                {activeTab === 'docs' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-gray-600">Generate rich JSDoc/Markdown documentation for this code.</p>
                      <button 
                        onClick={handleGenerateDocs} 
                        disabled={isGeneratingDocs}
                        className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium hover:bg-purple-200 transition-colors flex items-center disabled:opacity-50"
                      >
                        {isGeneratingDocs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                        Generate Docs
                      </button>
                    </div>
                    {documentation && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-gray-900 mt-4">
                        <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                          <span className="text-sm font-semibold text-gray-300">Generated Documentation</span>
                          <button onClick={() => copyToClipboard(documentation)} className="text-gray-400 hover:text-white transition-colors">
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="h-[400px]">
                          <Editor height="100%" language="markdown" value={documentation} theme="vs-dark" options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', scrollBeyondLastLine: false }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. CONVERT TAB */}
                {activeTab === 'convert' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <span className="text-gray-600 font-medium whitespace-nowrap">Target Language:</span>
                      <select 
                        value={targetLanguage} 
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2 flex-1 font-medium"
                      >
                        {LANGUAGES.filter(l => l.value !== language).map(lang => (
                          <option key={lang.value} value={lang.value}>{lang.label}</option>
                        ))}
                      </select>
                      <button 
                        onClick={handleConvertCode} 
                        disabled={isConverting}
                        className="bg-blue-100 text-blue-700 px-6 py-2 rounded-lg font-medium hover:bg-blue-200 transition-colors flex items-center disabled:opacity-50"
                      >
                        {isConverting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
                        Convert
                      </button>
                    </div>
                    
                    {convertedCode && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-gray-900 mt-4">
                        <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                          <span className="text-sm font-semibold text-gray-300 flex items-center"><Code2 className="w-4 h-4 mr-2" /> Converted ({targetLanguage})</span>
                          <button onClick={() => copyToClipboard(convertedCode)} className="text-gray-400 hover:text-white transition-colors">
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="h-[400px]">
                          <Editor height="100%" language={targetLanguage} value={convertedCode} theme="vs-dark" options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. EXPORT TAB */}
                {activeTab === 'export' && (
                  <div className="space-y-6">
                    <p className="text-gray-600 bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm">
                      Download the AI-generated documentation for your code as a PDF, Markdown, or Plain Text file.
                    </p>
                    
                    {!documentation && (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center text-orange-800 text-sm">
                        <AlertTriangle className="w-5 h-5 mr-3 text-orange-500" />
                        You must generate documentation in the Docs tab before you can export it!
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <button 
                        onClick={() => handleExport('pdf')} 
                        disabled={isExporting || !documentation}
                        className="flex flex-col items-center justify-center bg-white p-6 rounded-xl border border-gray-200 hover:border-red-500 hover:shadow-md transition-all group disabled:opacity-50 disabled:hover:shadow-none disabled:hover:border-gray-200"
                      >
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-3 group-hover:bg-red-500 group-hover:text-white transition-colors">
                          {isExporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                        </div>
                        <span className="font-bold text-gray-900">PDF Document</span>
                      </button>
                      
                      <button 
                        onClick={() => handleExport('md')} 
                        disabled={isExporting || !documentation}
                        className="flex flex-col items-center justify-center bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all group disabled:opacity-50 disabled:hover:shadow-none disabled:hover:border-gray-200"
                      >
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-3 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                          {isExporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileText className="w-6 h-6" />}
                        </div>
                        <span className="font-bold text-gray-900">Markdown (.md)</span>
                      </button>
                      
                      <button 
                        onClick={() => handleExport('txt')} 
                        disabled={isExporting || !documentation}
                        className="flex flex-col items-center justify-center bg-white p-6 rounded-xl border border-gray-200 hover:border-gray-800 hover:shadow-md transition-all group disabled:opacity-50 disabled:hover:shadow-none disabled:hover:border-gray-200"
                      >
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 mb-3 group-hover:bg-gray-800 group-hover:text-white transition-colors">
                          {isExporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileText className="w-6 h-6" />}
                        </div>
                        <span className="font-bold text-gray-900">Plain Text (.txt)</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  <Code2 className="w-8 h-8 text-gray-500" />
                </div>
                <div>
                  <p className="text-gray-900 font-medium">No results yet</p>
                  <p className="text-gray-500 text-sm max-w-[250px] mt-1 mx-auto">Submit your code for review to unlock AI documentation, translation, and export tools.</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Hidden Div for PDF Generation */}
      <div id="pdf-export-content" style={{ display: 'none' }} className="p-8 bg-white text-black font-sans w-[800px]">
        <div className="border-b-2 border-purple-600 pb-4 mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">AI Generated Documentation</h1>
          <p className="text-gray-500 font-medium">Language: <span className="uppercase">{language}</span></p>
          <p className="text-gray-500 font-medium text-sm">Generated on: {new Date().toLocaleString()}</p>
        </div>
        
        <div className="prose prose-purple max-w-none prose-headings:font-bold prose-a:text-purple-600">
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-lg my-4"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className="bg-gray-100 text-purple-600 px-1.5 py-0.5 rounded-md font-mono text-sm" {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {documentation}
          </ReactMarkdown>
        </div>
      </div>

    </div>
  );
};

export default Review;
