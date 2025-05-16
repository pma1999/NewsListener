import React from 'react';
import { NavLink } from 'react-router-dom';
import { Mic, Settings, Radio } from 'lucide-react'; // Icons

const Header: React.FC = () => {
  const navLinkClass = (isActive: boolean) =>
    `flex items-center px-4 py-2 transition-colors duration-200 ease-in-out rounded-md 
        ${
          isActive
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`;

  return (
    <header className="bg-gray-800 text-white shadow-lg">
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
        <NavLink to="/generate" className="flex items-center text-2xl font-bold hover:text-blue-400 transition-colors">
          <Radio className="w-8 h-8 mr-2 text-blue-500" />
          NewsListener
        </NavLink>
        <div className="flex items-center space-x-2">
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
        </div>
      </nav>
    </header>
  );
};

export default Header; 