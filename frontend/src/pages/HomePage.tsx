import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import ProfileCard from '../components/profiles/ProfileCard';
import ProfileFilters from '../components/profiles/ProfileFilters';
import GenerateWithProfileModal from '../components/profiles/GenerateWithProfileModal';
import CompactUrlForm from '../components/podcasts/CompactUrlForm';
import PodcastStatusSection from '../components/podcasts/PodcastStatusSection';
import RenamePodcastModal from '../components/podcasts/RenamePodcastModal';
import { fetchPredefinedCategories } from '@/services/categoryService';
import { fetchUserPreferences } from '@/services/preferenceService';
import { generatePodcast, updatePodcastName } from '@/services/podcastService';
import type { 
  PredefinedCategory, 
  UserPreference, 
  PodcastGenerationRequest, 
  PodcastGenerationResponse,
  PodcastEpisodeStatusResponse,
  PodcastEpisodeUpdateNameRequest
} from '@/types/api';
import { Button } from '@/components/common/Button';
import { Loader2, AlertCircle, ChevronDown, ChevronUp, Search, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom'; // For navigation to settings

// Define a new interface for more detailed podcast information
export interface ActivePodcastInfo {
  id: number;
  initialStatus: string;
  initialMessage: string;
  isCached: boolean;
  podcast_episode_id?: number | null;
  user_given_name?: string | null;
}

const HomePage: React.FC = () => {
  const [allProfiles, setAllProfiles] = useState<PredefinedCategory[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<PredefinedCategory[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<PredefinedCategory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showUrlForm, setShowUrlForm] = useState(false);

  const [activePodcasts, setActivePodcasts] = useState<ActivePodcastInfo[]>([]);
  const [newlyGeneratedEpisodeForNaming, setNewlyGeneratedEpisodeForNaming] = useState<ActivePodcastInfo | null>(null);
  const [showNamePromptModal, setShowNamePromptModal] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const { 
    data: predefinedCategoriesData, 
    isLoading: isLoadingCategories, 
    isError: isErrorCategories,
    error: categoriesError 
  } = useQuery<PredefinedCategory[], Error>({
    queryKey: ['predefinedCategories'],
    queryFn: fetchPredefinedCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { 
    data: userPreferencesData, 
    isLoading: isLoadingUserPreferences,
    // We don't need to handle error explicitly here for UI blocking, modal will use defaults
  } = useQuery<UserPreference, Error>({
    queryKey: ['userPreferencesForHomePage'],
    queryFn: fetchUserPreferences,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  useEffect(() => {
    if (predefinedCategoriesData) {
      setAllProfiles(predefinedCategoriesData);
      setFilteredProfiles(predefinedCategoriesData);
    }
  }, [predefinedCategoriesData]);

  const podcastGenerationMutation = useMutation<PodcastGenerationResponse, Error, PodcastGenerationRequest>({
    mutationFn: generatePodcast,
    onSuccess: (data) => {
      setGenerationError(null);
      handlePodcastGenerationStart(data.news_digest_id, data.initial_status, data.message, data.podcast_episode_id);
      if (isModalOpen) setIsModalOpen(false);
      if (showUrlForm) {
        // Potentially reset URL form or give feedback
      }
    },
    onError: (error) => {
      setGenerationError(error.message || 'An unknown error occurred during podcast generation.');
    },
  });

  const handlePodcastGenerationStart = (
    newsDigestId: number, 
    initialStatus: string, 
    message: string, 
    podcastEpisodeId?: number | null 
  ) => {
    const isCached = message.toLowerCase().includes("cache");
    setActivePodcasts(prevPodcasts => {
      const existingPodcastIndex = prevPodcasts.findIndex(p => p.id === newsDigestId);
      if (existingPodcastIndex !== -1) {
        const updatedPodcasts = [...prevPodcasts];
        const existingPodcast = updatedPodcasts.splice(existingPodcastIndex, 1)[0];
        return [
          { ...existingPodcast, initialStatus, initialMessage: message, isCached, podcast_episode_id: podcastEpisodeId || existingPodcast.podcast_episode_id }, 
          ...updatedPodcasts
        ].slice(0, 6);
      } else {
        const newPodcast: ActivePodcastInfo = {
          id: newsDigestId,
          initialStatus,
          initialMessage: message,
          isCached,
          podcast_episode_id: podcastEpisodeId,
        };
        return [newPodcast, ...prevPodcasts].slice(0, 6); 
      }
    });
  };

  const handlePodcastCompleted = useCallback((statusResponse: PodcastEpisodeStatusResponse, wasCachedOnStart: boolean) => {
    setActivePodcasts(prevPodcasts => 
      prevPodcasts.map(p => 
        p.id === statusResponse.news_digest_id 
          ? { ...p, 
              user_given_name: statusResponse.user_given_name, 
              podcast_episode_id: statusResponse.podcast_episode_id 
            }
          : p
      )
    );
    
    if (statusResponse.podcast_episode_id && !statusResponse.user_given_name && !statusResponse.error_message && !wasCachedOnStart) {
        const podcastInfoForModal: ActivePodcastInfo = {
            id: statusResponse.news_digest_id,
            podcast_episode_id: statusResponse.podcast_episode_id,
            initialStatus: statusResponse.status as string, // Cast as NewsDigestStatus is enum
            initialMessage: 'Podcast generated successfully. Please give it a name.',
            isCached: wasCachedOnStart,
            user_given_name: statusResponse.user_given_name 
        };
        setNewlyGeneratedEpisodeForNaming(podcastInfoForModal);
        setShowNamePromptModal(true);
    }
  }, []);

  const handleRenameSave = async (newName: string) => {
    if (!newlyGeneratedEpisodeForNaming || !newlyGeneratedEpisodeForNaming.podcast_episode_id) return;
    try {
      const payload: PodcastEpisodeUpdateNameRequest = { user_given_name: newName };
      await updatePodcastName(newlyGeneratedEpisodeForNaming.podcast_episode_id, payload);
      setActivePodcasts(prevPodcasts =>
        prevPodcasts.map(p =>
          p.podcast_episode_id === newlyGeneratedEpisodeForNaming.podcast_episode_id
            ? { ...p, user_given_name: newName }
            : p
        )
      );
      setShowNamePromptModal(false);
      setNewlyGeneratedEpisodeForNaming(null);
    } catch (err) {
      console.error("Failed to rename podcast from HomePage:", err);
      // Optionally set an error state to display in the rename modal or as a toast
      throw err; 
    }
  };

  const handleProfileCardClick = (profileId: number) => {
    const profile = allProfiles.find(p => p.id === profileId);
    if (profile) {
      setSelectedProfile(profile);
      setIsModalOpen(true);
      setGenerationError(null); // Clear previous errors when opening modal
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProfile(null);
  };

  const handleGenerateFromModal = (payload: PodcastGenerationRequest) => {
    podcastGenerationMutation.mutate(payload);
  };

  const handleGenerateFromUrlForm = (payload: PodcastGenerationRequest) => {
    podcastGenerationMutation.mutate(payload);
  };

  const handleFilterChange = useCallback((updatedFilteredProfiles: PredefinedCategory[]) => {
    setFilteredProfiles(updatedFilteredProfiles);
  }, []);

  // Loading state for initial data (profiles and user preferences for defaults)
  if (isLoadingCategories || (isLoadingUserPreferences && !userPreferencesData)) { // Wait for user prefs only if not already loaded
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-6">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
        <p className="text-lg text-gray-300">Loading news profiles and preferences...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-8 sm:space-y-10">
      <header className="text-center mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500 py-2">
          Craft Your News Podcast
        </h1>
        <p className="text-base sm:text-lg text-gray-400 mt-2 max-w-2xl mx-auto">
          Discover curated news profiles or provide specific URLs to generate your personalized audio digest.
        </p>
      </header>

      {generationError && (
        <div 
          className="bg-red-900/30 border border-red-700 text-red-300 p-3 sm:p-4 rounded-md flex items-start text-sm mb-6 shadow-lg"
          role="alert"
        >
          <AlertCircle size={20} className="mr-2.5 flex-shrink-0 mt-0.5" />
          <span><strong>Generation Failed:</strong> {generationError}</span>
        </div>
      )}

      {/* Profile Filters */} 
      {isErrorCategories && (
        <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 p-4 rounded-md">
          <p>Error loading news profiles: {categoriesError?.message || 'Unknown error'}. Some features might be unavailable.</p>
        </div>
      )}
      {allProfiles.length > 0 && <ProfileFilters allProfiles={allProfiles} onFilterChange={handleFilterChange} />}

      {/* Profile Cards Section */} 
      {!isLoadingCategories && !isErrorCategories && filteredProfiles.length === 0 && allProfiles.length > 0 && (
         <div className="text-center py-10 px-6 bg-gray-800 rounded-lg shadow-md">
            <Search size={48} className="mx-auto text-gray-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Profiles Match Your Filters</h3>
            <p className="text-gray-400">Try adjusting your search term or filter selections.</p>
        </div>
      )}
      {!isLoadingCategories && !isErrorCategories && allProfiles.length === 0 && (
        <div className="text-center py-12 px-6 bg-gray-800 rounded-lg shadow-md">
          <ListChecks size={48} className="mx-auto text-gray-500 mb-4" /> 
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No News Profiles Available</h3>
          <p className="text-gray-400 mb-4">It seems there are no predefined news profiles set up at the moment.</p>
          <p className="text-gray-400">Administrators can add profiles through the system configuration.</p>
          {/* Optionally, link to a help page or admin section if roles allow */}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {filteredProfiles.map(profile => (
          <ProfileCard 
            key={profile.id} 
            profile={profile} 
            onClick={() => handleProfileCardClick(profile.id)} 
          />
        ))}
      </div>

      {/* Generate from URL Section Toggle */} 
      <div className="mt-8 sm:mt-10 pt-6 border-t border-gray-700/60">
        <Button 
          variant="outline"
          onClick={() => setShowUrlForm(prev => !prev)}
          className="w-full sm:w-auto mx-auto flex items-center text-yellow-400 border-yellow-500 hover:bg-yellow-500/10 hover:border-yellow-400 px-6 py-2.5 text-sm"
        >
          {showUrlForm ? <ChevronUp size={20} className="mr-2"/> : <ChevronDown size={20} className="mr-2" />} 
          {showUrlForm ? 'Hide URL Generation Form' : 'Or Generate from Specific Article URLs'}
        </Button>
        {showUrlForm && (
          <CompactUrlForm 
            onGenerate={handleGenerateFromUrlForm} 
            isGenerating={podcastGenerationMutation.isPending}
          />
        )}
      </div>

      <GenerateWithProfileModal 
        isOpen={isModalOpen} 
        onClose={handleModalClose} 
        profile={selectedProfile} 
        userDefaults={{
          default_language: userPreferencesData?.default_language,
          default_audio_style: userPreferencesData?.default_audio_style,
        }}
        onGenerate={handleGenerateFromModal}
        isGenerating={podcastGenerationMutation.isPending}
      />

      <PodcastStatusSection 
        activePodcasts={activePodcasts} 
        onPodcastCompleted={handlePodcastCompleted}
      />

      {newlyGeneratedEpisodeForNaming && newlyGeneratedEpisodeForNaming.podcast_episode_id && (
        <RenamePodcastModal
          isOpen={showNamePromptModal}
          currentName={newlyGeneratedEpisodeForNaming.user_given_name || ''} 
          onClose={() => {
            setShowNamePromptModal(false);
            setNewlyGeneratedEpisodeForNaming(null);
          }}
          onSave={handleRenameSave}
          podcastId={newlyGeneratedEpisodeForNaming.podcast_episode_id} 
        />
      )}

      <div className="text-center mt-10 pt-6 border-t border-gray-700/60">
        <p className="text-gray-400 text-sm mb-2">
            Looking for more control or want to save your own news recipes?
        </p>
        <Link to="/preferences">
            <Button variant="secondary" className="bg-gray-700 hover:bg-gray-600">
                Go to My Settings & Profiles
            </Button>
        </Link>
      </div>

    </div>
  );
};

export default HomePage;