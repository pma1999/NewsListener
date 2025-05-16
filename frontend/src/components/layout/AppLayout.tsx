import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-gray-100">
      <Header />
      <main className="flex-grow container mx-auto px-2 py-4 sm:px-4 sm:py-8">
        <Outlet /> {/* Child routes will render here */}
      </main>
      <footer className="bg-gray-800 text-center p-3 sm:p-4 text-xs sm:text-sm text-gray-400 shadow-inner">
        <p>&copy; {new Date().getFullYear()} NewsListener. All rights reserved.</p>
        <p>Crafted with &hearts; for personalized news.</p>
      </footer>
    </div>
  );
};

export default AppLayout; 