import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4 sm:p-6 md:p-8">
      <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold text-red-500 mb-4 sm:mb-6">404</h1>
      <p className="text-xl sm:text-2xl text-gray-300 mb-6 sm:mb-8">Oops! Page Not Found.</p>
      <p className="text-sm sm:text-base text-gray-400 mb-8 sm:mb-10 max-w-md">
        The page you are looking for might have been removed, had its name changed,
        or is temporarily unavailable.
      </p>
      <Link 
        to="/generate"
        className="px-5 py-2.5 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-semibold rounded-lg shadow-md transition duration-300"
      >
        Go to Homepage
      </Link>
    </div>
  );
};

export default NotFoundPage; 