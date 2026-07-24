import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import { 
  ArrowLeft, Bug, ShieldAlert, Zap, BookOpen, CheckCircle, 
  Clock, Server, Download, Heart 
} from 'lucide-react';
import ChatAssistant from '../components/ChatAssistant';

const ReviewDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const res = await api.get(`/history/${id}`);
        setReview(res.data.data);
      } catch (error) {
        toast.error('Failed to load review details');
        navigate('/history');
      } finally {
        setLoading(false);
      }
    };
    fetchReview();
  }, [id, navigate]);

  const toggleFavorite = async () => {
    try {
      await api.patch(`/history/${id}`, { favorite: !review.favorite });
      setReview({ ...review, favorite: !review.favorite });
      toast.success(review.favorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      toast.error('Failed to update favorite status');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500 font-medium">Loading review details...</p>
        </div>
      </div>
    );
  }

  if (!review) return null;

  const result = review.aiResponse;

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/history')}
            className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to History
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{review.title}</h1>
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider">
              {review.language}
            </span>
          </div>
          <p className="text-gray-500 mt-2 text-sm">
            Reviewed on {new Date(review.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={toggleFavorite}
            className={`px-4 py-2 rounded-xl font-medium transition-all shadow-sm flex items-center ${
              review.favorite ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Heart className={`w-4 h-4 mr-2 ${review.favorite ? 'fill-red-500' : ''}`} />
            {review.favorite ? 'Favorited' : 'Favorite'}
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Original Code */}
        <div className="bg-[#1e1e1e] rounded-2xl overflow-hidden flex flex-col shadow-lg border border-gray-800">
          <div className="bg-gray-900 px-4 py-3 border-b border-gray-800 flex justify-between items-center">
            <span className="text-gray-400 text-sm font-medium flex items-center">
              Original Code
            </span>
            <button 
              onClick={() => copyToClipboard(review.code)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="h-[400px]">
            <Editor
              height="100%"
              language={review.language}
              theme="vs-dark"
              value={review.code}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                padding: { top: 16 }
              }}
            />
          </div>
        </div>

        {/* Optimized Code */}
        <div className="bg-[#1e1e1e] rounded-2xl overflow-hidden flex flex-col shadow-lg shadow-purple-500/10 border border-purple-500/20">
          <div className="bg-gray-900 px-4 py-3 border-b border-gray-800 flex justify-between items-center">
            <span className="text-purple-400 text-sm font-medium flex items-center">
              <Zap className="w-4 h-4 mr-2" /> Optimized Code
            </span>
            <button 
              onClick={() => copyToClipboard(result.optimizedCode)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="h-[400px]">
            <Editor
              height="100%"
              language={review.language}
              theme="vs-dark"
              value={result.optimizedCode || '// No optimized code provided.'}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                padding: { top: 16 }
              }}
            />
          </div>
        </div>
      </div>

      {/* Analysis Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between col-span-1 md:col-span-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Executive Summary</h3>
            <p className="text-gray-600 mt-2 leading-relaxed">{result.summary}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
          <p className="text-gray-500 font-medium mb-2">Overall Score</p>
          <div className={`text-5xl font-black ${
            Number(result.overallScore) >= 8 ? 'text-green-500' : 
            Number(result.overallScore) >= 5 ? 'text-yellow-500' : 'text-red-500'
          }`}>
            {result.overallScore}<span className="text-2xl text-gray-300">/10</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnalysisCard 
          title="Bugs & Issues" 
          items={result.bugs} 
          icon={Bug} 
          color="text-red-500" 
          bgColor="bg-red-50" 
        />
        <AnalysisCard 
          title="Security Vulnerabilities" 
          items={result.securityIssues} 
          icon={ShieldAlert} 
          color="text-orange-500" 
          bgColor="bg-orange-50" 
        />
        <AnalysisCard 
          title="Performance Optimizations" 
          items={result.performanceSuggestions} 
          icon={Zap} 
          color="text-yellow-500" 
          bgColor="bg-yellow-50" 
        />
        <AnalysisCard 
          title="Readability & Style" 
          items={result.readabilitySuggestions} 
          icon={BookOpen} 
          color="text-blue-500" 
          bgColor="bg-blue-50" 
        />
        <AnalysisCard 
          title="Best Practices" 
          items={result.bestPractices} 
          icon={CheckCircle} 
          color="text-green-500" 
          bgColor="bg-green-50" 
        />
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-lg bg-indigo-50`}>
              <Server className={`w-5 h-5 text-indigo-500`} />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Complexity</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center text-gray-700 font-medium">
                <Clock className="w-4 h-4 mr-2 text-gray-400" /> Time Complexity
              </div>
              <span className="font-mono font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-md">
                {result.timeComplexity || 'O(?)'}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center text-gray-700 font-medium">
                <Server className="w-4 h-4 mr-2 text-gray-400" /> Space Complexity
              </div>
              <span className="font-mono font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-md">
                {result.spaceComplexity || 'O(?)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat Assistant Section */}
      <ChatAssistant 
        reviewId={review._id} 
        language={review.language} 
        code={review.code} 
        reviewResult={result} 
      />

    </div>
  );
};

const AnalysisCard = ({ title, items, icon: Icon, color, bgColor }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start">
            <div className={`mt-1 mr-3 w-1.5 h-1.5 rounded-full ${bgColor.replace('50', '400')} flex-shrink-0`}></div>
            <p className="text-gray-600 leading-relaxed">{item}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ReviewDetails;
