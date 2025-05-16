import React, { useState } from 'react';
import PodcastGeneratorForm from '../components/podcasts/PodcastGeneratorForm';
import PodcastStatusSection from '../components/podcasts/PodcastStatusSection'; // Import the actual component

// Define a new interface for more detailed podcast information
export interface ActivePodcastInfo {
  id: number;
  initialStatus: string;
  initialMessage: string;
  isCached: boolean;
}

const HomePage: React.FC = () => {
  // Update state to hold an array of ActivePodcastInfo objects
  const [activePodcasts, setActivePodcasts] = useState<ActivePodcastInfo[]>([]);

  const handlePodcastGenerationStart = (
    newsDigestId: number,
    initialStatus: string,
    message: string
  ) => {
    const isCached = message.toLowerCase().includes("cache"); // Check if the message indicates a cached response
    
    setActivePodcasts(prevPodcasts => {
      // Check if this ID already exists to prevent duplicates,
      // though backend cache hit should return existing ID, this is more for UI consistency
      const existingPodcastIndex = prevPodcasts.findIndex(p => p.id === newsDigestId);

      if (existingPodcastIndex !== -1) {
        // If it exists, maybe update its status/message if needed, or just ensure it's at the top
        const updatedPodcasts = [...prevPodcasts];
        const existingPodcast = updatedPodcasts.splice(existingPodcastIndex, 1)[0];
        // Update with potentially new cache status/message if backend somehow re-evaluates
        existingPodcast.isCached = isCached; 
        existingPodcast.initialMessage = message;
        existingPodcast.initialStatus = initialStatus;
        return [existingPodcast, ...updatedPodcasts].slice(0, 6);
      } else {
        // Add new podcast to the beginning of the list
        const newPodcast: ActivePodcastInfo = {
          id: newsDigestId,
          initialStatus,
          initialMessage: message,
          isCached,
        };
        return [newPodcast, ...prevPodcasts].slice(0, 6); // Keep max 6 active cards
      }
    });
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-8 sm:space-y-12">
      <PodcastGeneratorForm onGenerationStart={handlePodcastGenerationStart} />
      {/* Pass the full activePodcasts array to PodcastStatusSection */}
      <PodcastStatusSection activePodcasts={activePodcasts} />
    </div>
  );
};

export default HomePage; 