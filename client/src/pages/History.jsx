import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, Filter, Trash2, Heart, Eye, ArrowLeft, ArrowRight, FolderTree, FileCode2 } from 'lucide-react';

const History = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [sort, setSort] = useState('newest'); // newest, oldest, highest, lowest
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Delete Modal
  const [deleteId, setDeleteId] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let url = `/history?page=${page}&limit=8`;
      
      if (search) url += `&search=${search}`;
      if (language) url += `&language=${language}`;
      if (sort) url += `&sort=${sort}`;
      if (showOnlyFavorites) url += `&favorite=true`;

      const res = await api.get(url);
      
      setReviews(res.data.data);
      setTotalPages(res.data.pages);
    } catch (error) {
      toast.error('Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search slightly
    const timeout = setTimeout(() => {
      fetchHistory();
    }, 300);
    return () => clearTimeout(timeout);
  }, [page, search, language, sort, showOnlyFavorites]);

  const toggleFavorite = async (id, currentStatus) => {
    try {
      await api.patch(`/history/${id}`, { favorite: !currentStatus });
      // Update local state instantly
      setReviews(reviews.map(r => r._id === id ? { ...r, favorite: !currentStatus } : r));
      toast.success(currentStatus ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      toast.error('Failed to update favorite status');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/history/${deleteId}`);
      setReviews(reviews.filter(r => r._id !== deleteId));
      toast.success('Review deleted');
      setDeleteId(null);
      
      // If we deleted the last item on the page, go back a page
      if (reviews.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchHistory(); // refresh counts
      }
    } catch (error) {
      toast.error('Failed to delete review');
      setDeleteId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-12">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review History</h1>
          <p className="text-gray-500 mt-1">Manage and analyze your previous code reviews.</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by title or language..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <button 
            onClick={() => { setShowOnlyFavorites(!showOnlyFavorites); setPage(1); }}
            className={`px-4 py-2 rounded-xl border flex items-center whitespace-nowrap transition-all ${
              showOnlyFavorites ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Heart className={`w-4 h-4 mr-2 ${showOnlyFavorites ? 'fill-red-500' : ''}`} />
            Favorites
          </button>

          <select 
            value={language} 
            onChange={(e) => { setLanguage(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white text-gray-700"
          >
            <option value="">All Languages</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="typescript">TypeScript</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>

          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-2">
            <Filter className="w-4 h-4 text-gray-400 ml-2" />
            <select 
              value={sort} 
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="py-2 pl-2 pr-4 bg-transparent outline-none text-gray-700"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Score</option>
              <option value="lowest">Lowest Score</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
                <th className="p-4 font-medium">Title</th>
                <th className="p-4 font-medium">Language</th>
                <th className="p-4 font-medium text-center">Score</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4"><div className="h-4 bg-gray-200 rounded w-48"></div></td>
                    <td className="p-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="p-4"><div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div></td>
                    <td className="p-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="p-4"><div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div></td>
                  </tr>
                ))
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    No reviews found matching your criteria.
                  </td>
                </tr>
              ) : (
                reviews.map(review => (
                  <tr key={review._id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-start">
                        <div className="mt-1 mr-3">
                          {review.type === 'project' ? (
                            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><FolderTree className="w-4 h-4 text-purple-600 dark:text-purple-400" /></div>
                          ) : (
                            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><FileCode2 className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{review.title}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${review.type === 'project' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {review.type === 'project' ? 'Project' : 'File'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-1 mt-1 max-w-xs">{review.summary}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                        {review.language}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`font-bold ${Number(review.score) >= 8 ? 'text-green-500' : Number(review.score) >= 5 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {review.score}/10
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => toggleFavorite(review._id, review.favorite)}
                          className={`p-2 rounded-lg transition-colors ${review.favorite ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                          title="Favorite"
                        >
                          <Heart className={`w-4 h-4 ${review.favorite ? 'fill-red-500' : ''}`} />
                        </button>
                        <button 
                          onClick={() => navigate(review.type === 'project' ? `/workspace/${review._id}` : `/history/${review._id}`)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteId(review._id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Review</h3>
            <p className="text-gray-500 mb-6">Are you sure you want to delete this code review? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
