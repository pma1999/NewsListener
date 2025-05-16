import React from 'react';
import PodcastStatusCard from './PodcastStatusCard';

interface PodcastStatusSectionProps {
  activeDigestIds: number[];
}

const PodcastStatusSection: React.FC<PodcastStatusSectionProps> = ({ activeDigestIds }) => {
  if (activeDigestIds.length === 0) {
    return (
      <div className="mt-8 sm:mt-10 p-4 sm:p-6 bg-gray-800 rounded-xl shadow-xl">
        <h2 className="text-xl sm:text-2xl font-semibold text-center text-purple-400 mb-2 sm:mb-3">Ready to Generate?</h2>
        <p className="text-center text-sm sm:text-base text-gray-400">
          Fill out the form above to create your first personalized news podcast. Status updates will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 sm:mt-10 space-y-6">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-purple-400 mb-4 sm:mb-6">
        Active Podcast Generations
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {activeDigestIds.map(id => (
          <PodcastStatusCard key={id} newsDigestId={id} />
        ))}
      </div>
    </div>
  );
};

export default PodcastStatusSection; 