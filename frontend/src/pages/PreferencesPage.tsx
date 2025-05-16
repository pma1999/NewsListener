import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUserPreferences } from '../services/preferenceService';
import PreferencesForm from '../components/preferences/PreferencesForm';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { UserPreference } from '../types/api';

const PreferencesPage: React.FC = () => {
  const {
    data: preferences,
    isLoading,
    isError,
    error,
  } = useQuery<UserPreference, Error>({
    queryKey: ['userPreferences'],
    queryFn: fetchUserPreferences,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 sm:p-10">
        <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-blue-500 mb-4" />
        <p className="text-base sm:text-lg text-gray-300">Loading your preferences...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-6 sm:p-10 bg-red-900/20 border border-red-700 rounded-lg">
        <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mb-4" />
        <h2 className="text-xl sm:text-2xl font-semibold text-red-400 mb-2">Error Loading Preferences</h2>
        <p className="text-sm sm:text-base text-red-300">We couldn't fetch your preferences. Please try again later.</p>
        {error && <p className="text-xs sm:text-sm text-red-400 mt-2">Details: {error.message}</p>}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-3xl">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 py-2">
        Customize Your News Experience
      </h1>
      {preferences && <PreferencesForm initialPreferences={preferences} />}
    </div>
  );
};

export default PreferencesPage; 