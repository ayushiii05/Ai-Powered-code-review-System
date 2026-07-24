import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Code2, Heart, ArrowUpRight, Activity, Terminal, Clock } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/history/stats');
        setStats(res.data.data);
      } catch (error) {
        console.error("Error fetching stats:", error);
        toast.error("Failed to load dashboard statistics");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const getStatCards = () => {
    if (!stats) return [];
    return [
      { title: 'Total Reviews', value: stats.totalReviews, icon: Code2, trend: 'All Time' },
      { title: 'Avg. AI Score', value: stats.overallAvgScore + '/10', icon: Activity, trend: 'Quality' },
      { title: 'Favorite Reviews', value: stats.favoritesCount, icon: Heart, trend: 'Saved' },
      { title: 'Most Used Lang', value: stats.mostUsedLanguage, icon: Terminal, trend: `${stats.uniqueLanguages} total` },
    ];
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.name}</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <button 
            onClick={() => navigate('/history')}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-gray-50 transition-all flex items-center"
          >
            <Clock className="w-4 h-4 mr-2" />
            View History
          </button>
          <button 
            onClick={() => navigate('/review')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl font-medium shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all flex items-center"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            New Review
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white h-32 rounded-2xl shadow-sm border border-gray-100 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {getStatCards().map((stat, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-purple-50 rounded-xl">
                  <stat.icon className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-purple-600 flex items-center bg-purple-50 px-2 py-1 rounded-full">
                  {stat.trend}
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                <p className="text-gray-500 font-medium">{stat.title}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && stats?.recentReviews?.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Recent Reviews</h3>
            <button onClick={() => navigate('/history')} className="text-sm font-medium text-purple-600 hover:text-purple-700">View All</button>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.recentReviews.map(review => (
              <div key={review._id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    {review.title}
                    {review.favorite && <Heart className="w-4 h-4 fill-red-500 text-red-500" />}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{review.summary || 'No summary available'}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs font-medium text-gray-400">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{review.language}</span>
                    <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <span className={`text-xl font-bold ${Number(review.score) >= 8 ? 'text-green-500' : Number(review.score) >= 5 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {review.score}/10
                    </span>
                  </div>
                  <button 
                    onClick={() => navigate(`/history/${review._id}`)}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <ArrowUpRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center border-dashed border-2">
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Code2 className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No reviews yet</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">Submit your first code snippet to start generating AI code reviews and populating your dashboard.</p>
          <button onClick={() => navigate('/review')} className="text-purple-600 font-medium hover:text-purple-700 transition-colors">Start Review &rarr;</button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
