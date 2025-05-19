import React, { useState, useCallback } from 'react';
import PodcastGeneratorForm from '../components/podcasts/PodcastGeneratorForm';
import PodcastStatusSection from '../components/podcasts/PodcastStatusSection';
import RenamePodcastModal from '../components/podcasts/RenamePodcastModal';
import { updatePodcastName } from '@/services/podcastService';
import type { PodcastEpisodeStatusResponse, PodcastEpisodeUpdateNameRequest } from '@/types/api';

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
  const [activePodcasts, setActivePodcasts] = useState<ActivePodcastInfo[]>([]);
  const [newlyGeneratedEpisodeForNaming, setNewlyGeneratedEpisodeForNaming] = useState<ActivePodcastInfo | null>(null);
  const [showNamePromptModal, setShowNamePromptModal] = useState<boolean>(false);

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
        existingPodcast.isCached = isCached; 
        existingPodcast.initialMessage = message;
        existingPodcast.initialStatus = initialStatus;
        if (podcastEpisodeId) existingPodcast.podcast_episode_id = podcastEpisodeId; 
        return [existingPodcast, ...updatedPodcasts].slice(0, 6);
      } else {
        const newPodcast: ActivePodcastInfo = {
          id: newsDigestId,
          initialStatus: initialStatus,
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
        // const podcastForModalDetails = activePodcasts.find(p => p.id === statusResponse.news_digest_id); // Removed to break dependency on activePodcasts

        const podcastInfoForModal: ActivePodcastInfo = {
            id: statusResponse.news_digest_id,
            podcast_episode_id: statusResponse.podcast_episode_id,
            initialStatus: statusResponse.status,
            initialMessage: 'Podcast generated successfully. Please give it a name.', // Using a generic message
            isCached: wasCachedOnStart,
            user_given_name: statusResponse.user_given_name 
        };
        setNewlyGeneratedEpisodeForNaming(podcastInfoForModal);
        setShowNamePromptModal(true);
    }
  }, [setActivePodcasts, setNewlyGeneratedEpisodeForNaming, setShowNamePromptModal]); // activePodcasts removed from dependencies

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
      throw err;
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-8 sm:space-y-12">
      <PodcastGeneratorForm onGenerationStart={handlePodcastGenerationStart} />
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
    </div>
  );
};

export default HomePage;