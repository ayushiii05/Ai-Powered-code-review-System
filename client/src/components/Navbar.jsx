import { useContext, useState, useEffect, useRef } from 'react';
import { Menu, Bell, Sun, Moon, Check, Trash2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const Navbar = ({ toggleSidebar }) => {
  const { user } = useContext(AuthContext);
  const { isDarkMode, toggleTheme } = useTheme();
  
  const [notifications, setNotifications] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.data);
    } catch (error) {
      console.error('Failed to fetch notifications');
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Optional: Polling every 30s
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      toast.error('Failed to update notification');
    }
  };

  const handleClearAll = async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
      setIsDropdownOpen(false);
      toast.success('All notifications cleared');
    } catch (error) {
      toast.error('Failed to clear notifications');
    }
  };

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 transition-colors">
      <div className="flex items-center">
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex items-center space-x-2 sm:space-x-4 relative">
        <button 
          onClick={toggleTheme}
          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          title="Toggle Theme"
        >
          {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
        
        <div ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative focus:outline-none"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
            )}
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in z-50">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Notifications</h3>
                {notifications.length > 0 && (
                  <button onClick={handleClearAll} className="text-xs text-red-500 hover:text-red-700 flex items-center">
                    <Trash2 className="w-3 h-3 mr-1" /> Clear All
                  </button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    No new notifications
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map(notification => (
                      <div 
                        key={notification._id} 
                        className={`p-4 transition-colors ${notification.isRead ? 'bg-white opacity-60' : 'bg-purple-50/30'}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`text-sm font-bold ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <button 
                              onClick={() => handleMarkAsRead(notification._id)}
                              className="text-purple-600 hover:text-purple-800"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{notification.message}</p>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                          {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center pl-2 sm:pl-4 border-l border-gray-200 cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md shadow-purple-500/20">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3 hidden sm:block">
            <p className="text-sm font-semibold text-gray-700">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.role === 'admin' ? 'Administrator' : 'Developer'}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
