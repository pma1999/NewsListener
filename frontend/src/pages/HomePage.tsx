import React, { useState } from 'react';
import PodcastGeneratorForm from '../components/podcasts/PodcastGeneratorForm';
import PodcastStatusSection from '../components/podcasts/PodcastStatusSection'; // Import the actual component

const HomePage: React.FC = () => {
  // Basic state to track IDs of podcasts being generated or recently completed.
  // This would be more robust in a real app (e.g., Zustand store, or more complex local state)
  const [activeDigestIds, setActiveDigestIds] = useState<number[]>([]);

  const handlePodcastGenerationStart = (newsDigestId: number) => {
    setActiveDigestIds(prevIds => {
      if (!prevIds.includes(newsDigestId)) {
        // Add to the beginning of the list to show newest first
        return [newsDigestId, ...prevIds].slice(0, 6); // Keep max 6 active cards for UI neatness
      }
      return prevIds;
    });
    // In a more complex app, you might want to limit the number of tracked IDs
    // or remove very old ones.
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-8 sm:space-y-12">
      <PodcastGeneratorForm onGenerationStart={handlePodcastGenerationStart} />
      <PodcastStatusSection activeDigestIds={activeDigestIds} />
    </div>
  );
};

export default HomePage; 