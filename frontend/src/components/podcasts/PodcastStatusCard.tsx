import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPodcastStatus } from '../../services/podcastService';
import type { PodcastEpisodeStatusResponse } from '../../types/api';
import { NewsDigestStatus } from '../../types/api'; // Enum for status comparison
import AudioPlayer from './AudioPlayer';
import { Loader2, AlertTriangle, CheckCircle2, FileText, XCircle, Hourglass } from 'lucide-react';
import { config } from '../../config'; // Import config

interface PodcastStatusCardProps {
  newsDigestId: number;
}

const POLLING_INTERVAL_MS = 5000; // 5 seconds

const PodcastStatusCard: React.FC<PodcastStatusCardProps> = ({ newsDigestId }) => {
  const {
    data: statusData,
    isLoading,
    isError,
    error,
  } = useQuery<PodcastEpisodeStatusResponse, Error>({
    queryKey: ['podcastStatus', newsDigestId],
    queryFn: () => getPodcastStatus(newsDigestId),
    refetchInterval: (query) => {
      const data = query.state.data as PodcastEpisodeStatusResponse | undefined;
      // Stop polling if completed or failed
      if (data?.status === NewsDigestStatus.COMPLETED || data?.status === NewsDigestStatus.FAILED) {
        return false;
      }
      return POLLING_INTERVAL_MS;
    },
    refetchOnWindowFocus: true, // May want to refetch if window regains focus
  });

  const renderStatusContent = () => {
    if (isLoading && !statusData) { // Initial load
      return (
        <div className="flex items-center justify-center text-gray-400 p-4">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm sm:text-base">Loading status... (ID: {newsDigestId})</span>
        </div>
      );
    }

    if (isError && !statusData) { // Hard error on first fetch
      return (
        <div className="p-3 sm:p-4 bg-red-900/30 border border-red-700 rounded-md text-red-300">
          <div className="flex items-center mb-1">
            <AlertTriangle size={18} className="mr-2 flex-shrink-0" />
            <span className="font-semibold text-sm sm:text-base">Error fetching status for ID: {newsDigestId}</span>
          </div>
          <p className="text-xs sm:text-sm ml-7">Details: {error?.message || 'Unknown error'}</p>
        </div>
      );
    }

    if (!statusData) { // Should not happen if isLoading/isError are handled, but as a fallback
      return <p className="text-orange-400 text-sm sm:text-base p-4">Status not available for ID: {newsDigestId}.</p>;
    }

    const { status, audio_url, script_preview, error_message, updated_at } = statusData;
    const lastUpdated = new Date(updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Construct full audio URL
    // The API returns a relative path like /static/audio/file.mp3
    // We need the full path like http://localhost:8000/static/audio/file.mp3
    const backendRootUrl = config.apiBaseUrl.replace('/api/v1', '');
    const fullAudioUrl = audio_url ? `${backendRootUrl}${audio_url}` : undefined;

    let statusIcon, statusColor, statusText;
    switch (status) {
      case NewsDigestStatus.PENDING_SCRIPT:
        statusIcon = <Hourglass size={18} className="animate-pulse flex-shrink-0" />;
        statusColor = 'text-yellow-400';
        statusText = 'Generating Script...';
        break;
      case NewsDigestStatus.PENDING_AUDIO:
      case NewsDigestStatus.PROCESSING_AUDIO:
        statusIcon = <Loader2 size={18} className="animate-spin flex-shrink-0" />;
        statusColor = 'text-blue-400';
        statusText = status === NewsDigestStatus.PENDING_AUDIO ? 'Script Ready, Awaiting Audio...' : 'Processing Audio...';
        break;
      case NewsDigestStatus.COMPLETED:
        statusIcon = <CheckCircle2 size={18} className="flex-shrink-0" />;
        statusColor = 'text-green-400';
        statusText = 'Podcast Ready!';
        break;
      case NewsDigestStatus.FAILED:
        statusIcon = <XCircle size={18} className="flex-shrink-0" />;
        statusColor = 'text-red-400';
        statusText = 'Generation Failed';
        break;
      default:
        statusIcon = <AlertTriangle size={18} className="flex-shrink-0" />;
        statusColor = 'text-gray-400';
        statusText = 'Unknown Status';
    }

    return (
      <div className={`p-3 sm:p-4 border rounded-lg shadow-md ${status === NewsDigestStatus.COMPLETED ? 'border-green-600 bg-green-900/20' : status === NewsDigestStatus.FAILED ? 'border-red-600 bg-red-900/20' : 'border-gray-700 bg-gray-800/50'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 sm:mb-3">
          <h3 className={`text-base sm:text-lg font-semibold ${statusColor} flex items-center mb-1 sm:mb-0`}>
            {statusIcon} <span className="ml-2 leading-tight">{statusText}</span>
          </h3>
          <span className="text-xs text-gray-500 self-end sm:self-center">ID: {newsDigestId}</span>
        </div>
        
        {script_preview && (
          <div className="mb-2 p-2 bg-gray-700/50 rounded-md">
            <p className="text-xs sm:text-sm text-gray-400 font-medium mb-1 flex items-center"><FileText size={14} className="mr-1.5 flex-shrink-0" /> Script Preview:</p>
            <p className="text-xs sm:text-sm text-gray-300 italic truncate">{script_preview}</p>
          </div>
        )}

        {fullAudioUrl && status === NewsDigestStatus.COMPLETED && (
          <AudioPlayer src={fullAudioUrl} title={`Podcast ID ${newsDigestId}`} />
        )}

        {error_message && status === NewsDigestStatus.FAILED && (
          <div className="mt-2 p-2 bg-red-800/40 rounded-md">
            <p className="text-xs sm:text-sm text-red-300 font-semibold">Error Details:</p>
            <p className="text-xs sm:text-sm text-red-300 break-words">{error_message}</p>
          </div>
        )}
        <p className="text-xs text-gray-500 text-right mt-2">Last updated: {lastUpdated}</p>
      </div>
    );
  };

  return renderStatusContent();
};

export default PodcastStatusCard; 