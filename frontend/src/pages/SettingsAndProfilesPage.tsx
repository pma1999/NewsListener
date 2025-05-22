import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUserPreferences } from '../services/preferenceService';
import PreferencesForm from '../components/preferences/PreferencesForm';
import { AlertCircle, Loader2, SlidersHorizontal, UserSquare2, ListChecks } from 'lucide-react';
import type { UserPreference } from '../types/api';

const SettingsAndProfilesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'defaults' | 'customProfiles' | 'systemProfiles'>('defaults');

  const { // For "My Default Settings" tab
    data: preferences,
    isLoading: isLoadingPreferences,
    isError: isErrorPreferences,
    error: preferencesError,
  } = useQuery<UserPreference, Error>({
    queryKey: ['userPreferencesForSettingsPage'],
    queryFn: fetchUserPreferences,
    enabled: activeTab === 'defaults', // Only fetch when this tab is active
  });

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'defaults':
        if (isLoadingPreferences) {
          return (
            <div className="flex flex-col items-center justify-center p-10">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
              <p className="text-lg text-gray-300">Loading your preferences...</p>
            </div>
          );
        }
        if (isErrorPreferences) {
          return (
            <div className="flex flex-col items-center justify-center p-10 bg-red-900/20 border border-red-700 rounded-lg">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <h2 className="text-2xl font-semibold text-red-400 mb-2">Error Loading Preferences</h2>
              <p className="text-base text-red-300">We couldn't fetch your preferences. Please try again later.</p>
              {preferencesError && <p className="text-sm text-red-400 mt-2">Details: {preferencesError.message}</p>}
            </div>
          );
        }
        // For the "My Default Settings" tab, we will only show a simplified version of PreferencesForm
        // focused on default_language and default_audio_style.
        // The full PreferencesForm currently handles all preference fields, so we would need to adapt it
        // or create a new component for just these two settings.
        // For now, reusing PreferencesForm and users will see all fields, but conceptually it's for defaults.
        return preferences ? (
          <div className="mt-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-purple-300 mb-4">My Default Generation Settings</h2>
            <p className="text-sm text-gray-400 mb-4">
              Set your preferred language and audio style that will be pre-selected when you generate new podcasts.
            </p>
            <PreferencesForm initialPreferences={preferences} />
          </div>
        ) : <p className="text-center text-gray-400 py-8">No preferences found. You can set them here.</p>;
      
      case 'customProfiles':
        return (
          <div className="mt-6 p-6 bg-gray-800 rounded-lg shadow-md">
            <h2 className="text-xl sm:text-2xl font-semibold text-purple-300 mb-4">My Custom News Profiles</h2>
            <p className="text-gray-400">Feature coming soon! Here you'll be able to create, edit, and manage your own personalized news profiles.</p>
            {/* Placeholder for CustomProfileEditorForm and list of custom profiles */}
          </div>
        );
      
      case 'systemProfiles':
         return (
          <div className="mt-6 p-6 bg-gray-800 rounded-lg shadow-md">
            <h2 className="text-xl sm:text-2xl font-semibold text-purple-300 mb-4">Explore & Copy System Profiles</h2>
            <p className="text-gray-400">Feature coming soon! Browse system-defined news profiles and copy them to customize.</p>
            {/* Placeholder for listing system PredefinedCategory items with a "Copy & Customize" button */}
          </div>
        );
      default:
        return null;
    }
  };

  const tabButtonClass = (tabName: string) => 
    `flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900 ` +
    (activeTab === tabName 
      ? 'bg-purple-600 text-white shadow-md' 
      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white');

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-5xl">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 py-2">
        Settings & Profiles
      </h1>

      <div className="mb-6 sm:mb-8 bg-gray-800 p-1.5 rounded-lg shadow-md flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-2">
        <button onClick={() => setActiveTab('defaults')} className={tabButtonClass('defaults')}>
          <SlidersHorizontal size={18} className="mr-2" /> My Default Settings
        </button>
        <button onClick={() => setActiveTab('customProfiles')} className={tabButtonClass('customProfiles')}>
          <UserSquare2 size={18} className="mr-2" /> My Custom Profiles
        </button>
        <button onClick={() => setActiveTab('systemProfiles')} className={tabButtonClass('systemProfiles')}>
          <ListChecks size={18} className="mr-2" /> System Profiles
        </button>
      </div>

      {renderActiveTabContent()}
    </div>
  );
};

export default SettingsAndProfilesPage; 