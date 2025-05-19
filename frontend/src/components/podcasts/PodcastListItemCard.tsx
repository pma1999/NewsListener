import React from 'react';
import type { UserPodcastListItem } from '@/types/api';
import AudioPlayer from './AudioPlayer'; // Assuming AudioPlayer is in the same directory
// import { Button } from '@/components/ui/button'; // Assuming Button component
import { Edit3, CalendarDays, Info, AlertTriangle } from 'lucide-react';
import { config } from '../../config'; // Import config

interface PodcastListItemCardProps {
  podcast: UserPodcastListItem;
  onRenameClick: () => void;
}

// Helper to format date strings
const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      // hour: '2-digit',
      // minute: '2-digit',
    });
  } catch (e) {
    return dateString; // fallback to original string if date is invalid
  }
};

const PodcastListItemCard: React.FC<PodcastListItemCardProps> = ({ podcast, onRenameClick }) => {
  const podcastName = podcast.user_given_name || `Podcast from ${formatDate(podcast.digest_created_at)}`;
  
  // Correctly determine backendRootUrl and full audioUrl
  const backendRootUrl = config.apiBaseUrl.replace('/api/v1', '');
  const audioUrl = podcast.audio_url ? `${backendRootUrl}${podcast.audio_url}` : undefined;

  const isExpired = podcast.episode_expires_at ? new Date(podcast.episode_expires_at) < new Date() : false;

  return (
    <div className={`bg-gray-800 shadow-lg rounded-lg p-4 flex flex-col justify-between transition-all hover:shadow-xl ${isExpired ? 'opacity-60 cursor-not-allowed' : ''}`}>
      <div>
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-purple-300 truncate mr-2" title={podcastName}>
            {podcastName}
          </h3>
          {!isExpired && (
            <button 
              onClick={onRenameClick} 
              title="Rename podcast"
              className="p-1 text-gray-400 hover:text-purple-400 transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <Edit3 size={16} />
            </button>
          )}
        </div>

        {podcast.original_request_summary && (
          <p className="text-xs text-gray-400 mb-2 flex items-start">
            <Info size={14} className="mr-1.5 shrink-0 mt-0.5 text-sky-400" /> 
            <span className="truncate" title={podcast.original_request_summary}>{podcast.original_request_summary}</span>
          </p>
        )}
        
        <div className="text-xs text-gray-500 space-y-1 mb-3">
          <p className="flex items-center">
            <CalendarDays size={14} className="mr-1.5 shrink-0 text-gray-400" /> 
            Generated: {formatDate(podcast.episode_created_at)}
          </p>
          {podcast.episode_expires_at && (
            <p className={`flex items-center ${isExpired ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
              <AlertTriangle size={14} className={`mr-1.5 shrink-0 ${isExpired ? 'text-red-500' : 'text-amber-500'}`} /> 
              Available until: {formatDate(podcast.episode_expires_at)}
              {isExpired && <span className='ml-1'>(Expired)</span>}
            </p>
          )}
        </div>
      </div>

      {audioUrl && !isExpired ? (
        <AudioPlayer src={audioUrl} title="Listen to podcast" />
      ) : (
        <div className="my-3 sm:my-4 p-2.5 sm:p-3 bg-gray-700 rounded-lg shadow text-center text-gray-400 text-sm">
          {isExpired ? "Audio expired or unavailable." : "Audio not available."}
        </div>
      )}
    </div>
  );
};

export default PodcastListItemCard; 