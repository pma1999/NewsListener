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
    <div className="container mx-auto p-4 space-y-12">
      <PodcastGeneratorForm onGenerationStart={handlePodcastGenerationStart} />
      <PodcastStatusSection activeDigestIds={activeDigestIds} />
      
      {/* Placeholder for PodcastStatusSection - to be implemented next */}
      {activeDigestIds.length > 0 && (
        <div className="mt-12 p-6 bg-gray-800 rounded-xl shadow-xl">
          <h2 className="text-2xl font-semibold text-center text-purple-400 mb-6">Podcast Statuses</h2>
          <p className="text-center text-gray-400">
            Status cards for (IDs: {activeDigestIds.join(', ')}) will appear here once implemented.
          </p>
          {/* PodcastStatusSection will map over activeDigestIds and render PodcastStatusCard */}
        </div>
      )}
       {activeDigestIds.length === 0 && (
        <div className="mt-12 p-6 bg-gray-800 rounded-xl shadow-xl">
          <h2 className="text-2xl font-semibold text-center text-purple-400 mb-2">Ready to Generate?</h2>
          <p className="text-center text-gray-400">
            Fill out the form above to create your first personalized news podcast. Status will appear here.
          </p>
        </div>
      )}
    </div>
  );
};

export default HomePage; 