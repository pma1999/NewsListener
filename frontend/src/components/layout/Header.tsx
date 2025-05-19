import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Mic, Settings, Radio, LogIn, LogOut, UserCircle, ListMusic } from 'lucide-react'; // Icons
import { useAuthStore } from '../../store/authStore'; // Added useAuthStore

const Header: React.FC = () => {
  const navLinkClass = (isActive: boolean) =>
    `flex items-center px-2 py-2 sm:px-3 sm:py-2 transition-colors duration-200 ease-in-out rounded-md text-xs sm:text-sm
        ${
          isActive
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`;

  const { isAuthenticated, user, logout } = useAuthStore(); // Get auth state and logout function

  const handleLogout = () => {
    logout();
    // Optionally navigate to home or login page after logout
    // navigate('/login'); // you'll need to import useNavigate from react-router-dom if you use this
  };

  return (
    <header className="bg-gray-800 text-white shadow-lg">
      <nav className="container mx-auto px-2 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
        <NavLink to="/generate" className="flex items-center text-lg sm:text-xl font-bold hover:text-blue-400 transition-colors shrink-0">
          <Radio className="w-6 h-6 sm:w-7 sm:h-7 mr-1.5 sm:mr-2 text-blue-500" />
          <span className="hidden xs:inline">NewsListener</span>
          <span className="xs:hidden">NL</span>
        </NavLink>
        <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2">
          <NavLink 
            to="/generate" 
            className={({ isActive }) => navLinkClass(isActive)}
            title="Generate Podcast"
          >
            <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> 
            <span className="hidden sm:inline ml-1.5 sm:ml-2">Generate</span>
          </NavLink>
          <NavLink 
            to="/preferences" 
            className={({ isActive }) => navLinkClass(isActive)}
            title="Preferences"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline ml-1.5 sm:ml-2">Preferences</span>
          </NavLink>
          <NavLink 
            to="/my-podcasts" 
            className={({ isActive }) => navLinkClass(isActive)}
            title="My Podcasts"
          >
            <ListMusic className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline ml-1.5 sm:ml-2">My Podcasts</span>
          </NavLink>
          
          {/* Auth Status Indicator */}
          <div className="flex items-center">
            {isAuthenticated ? (
              <>
                {user?.email && (
                  <span className="text-xs text-gray-400 mr-1.5 sm:mr-2 hidden md:flex items-center" title={user.email}>
                    <UserCircle className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1 shrink-0" /> 
                    <span className="truncate hidden lg:inline">{user.email}</span>
                    <span className="truncate hidden md:inline lg:hidden">{(user.email.length > 10 ? user.email.substring(0, user.email.indexOf('@') > 0 && user.email.indexOf('@') < 10 ? user.email.indexOf('@') : 8) + '...' : user.email)}</span>
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs sm:text-sm bg-transparent text-gray-300 hover:bg-red-700 hover:text-white rounded-md transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span className="hidden sm:inline ml-1 sm:ml-1.5">Logout</span>
                   <span className="sm:hidden ml-1">Out</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 ease-in-out"
                title="Login"
              >
                <LogIn className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="hidden sm:inline ml-1 sm:ml-1.5">Login</span>
                <span className="sm:hidden ml-1">Login</span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header; 