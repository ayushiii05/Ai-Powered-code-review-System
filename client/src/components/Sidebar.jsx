import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, LogOut, Code2, PlaySquare, History as HistoryIcon, FolderTree, X } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';

const Sidebar = ({ isCollapsed, isMobileOpen, closeMobile }) => {
  const { logout } = useContext(AuthContext);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Single File Review', path: '/review', icon: PlaySquare },
    { name: 'Project Workspace', path: '/workspace', icon: FolderTree },
    { name: 'GitHub Import', path: '/github', icon: FaGithub },
    { name: 'History', path: '/history', icon: HistoryIcon },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside 
      className={`fixed top-0 left-0 h-screen bg-gray-900 border-r border-gray-800 text-gray-300 transition-all duration-300 z-40 flex flex-col ${
        isCollapsed ? 'lg:w-20' : 'lg:w-64'
      } ${
        isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="flex items-center justify-between lg:justify-center h-16 border-b border-gray-800 px-4 lg:px-0">
        <div className="flex items-center justify-center">
          <Code2 className="w-8 h-8 text-purple-500" />
          {(!isCollapsed || isMobileOpen) && <span className="ml-3 font-bold text-lg text-white tracking-wide">AI Review</span>}
        </div>
        
        {/* Mobile Close Button */}
        <button 
          className="lg:hidden text-gray-400 hover:text-white"
          onClick={closeMobile}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) closeMobile();
              }}
              className={({ isActive }) =>
                `flex items-center px-3 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-400 font-medium' 
                    : 'hover:bg-gray-800 hover:text-white'
                }`
              }
              title={isCollapsed && !isMobileOpen ? item.name : ''}
            >
              <Icon className={`w-5 h-5 ${isCollapsed && !isMobileOpen ? 'mx-auto' : 'mr-3'}`} />
              {(!isCollapsed || isMobileOpen) && <span>{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={logout}
          className={`flex items-center w-full px-3 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group ${
            isCollapsed && !isMobileOpen ? 'justify-center' : ''
          }`}
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
          {(!isCollapsed || isMobileOpen) && <span className="ml-3">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
