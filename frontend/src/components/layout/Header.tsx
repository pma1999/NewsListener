import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Mic, Settings, Radio, LogIn, LogOut, UserCircle } from 'lucide-react'; // Icons
import { useAuthStore } from '../../store/authStore'; // Added useAuthStore

const Header: React.FC = () => {
  const navLinkClass = (isActive: boolean) =>
    `flex items-center px-4 py-2 transition-colors duration-200 ease-in-out rounded-md 
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
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
        <NavLink to="/generate" className="flex items-center text-2xl font-bold hover:text-blue-400 transition-colors">
          <Radio className="w-8 h-8 mr-2 text-blue-500" />
          NewsListener
        </NavLink>
        <div className="flex items-center space-x-4"> {/* Increased space-x for new element */}
          <NavLink 
            to="/generate" 
            className={({ isActive }) => navLinkClass(isActive)}
          >
            <Mic className="w-5 h-5 mr-2" /> Generate Podcast
          </NavLink>
          <NavLink 
            to="/preferences" 
            className={({ isActive }) => navLinkClass(isActive)}
          >
            <Settings className="w-5 h-5 mr-2" /> Preferences
          </NavLink>
          
          {/* Auth Status Indicator */}
          <div className="flex items-center">
            {isAuthenticated ? (
              <>
                {user?.email && (
                  <span className="text-sm text-gray-400 mr-3 hidden sm:inline">
                    <UserCircle className="w-5 h-5 inline mr-1" /> 
                    {user.email}
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 text-sm bg-transparent text-gray-300 hover:bg-red-700 hover:text-white rounded-md transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 ease-in-out"
              >
                <LogIn className="w-5 h-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Login</span>
                 <span className="sm:hidden">Login</span> {/* Show Login text on small screens too */}
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header; 