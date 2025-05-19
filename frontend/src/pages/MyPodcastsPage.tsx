import React, { useState, useEffect, useCallback } from 'react';
import { listUserPodcasts, updatePodcastName } from '@/services/podcastService';
import type { UserPodcastListItem, PodcastEpisodeDetail, PodcastEpisodeUpdateNameRequest } from '@/types/api';
import PodcastListItemCard from '@/components/podcasts/PodcastListItemCard';
import RenamePodcastModal from '@/components/podcasts/RenamePodcastModal';
import { Loader2, AlertTriangle } from 'lucide-react';

const MyPodcastsPage: React.FC = () => {
  const [podcasts, setPodcasts] = useState<UserPodcastListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const itemsPerPage = 10;

  const [isRenameModalOpen, setIsRenameModalOpen] = useState<boolean>(false);
  const [podcastToRename, setPodcastToRename] = useState<UserPodcastListItem | null>(null);

  const fetchPodcasts = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listUserPodcasts(page, itemsPerPage);
      setPodcasts(response.podcasts);
      setTotalItems(response.total);
      setTotalPages(Math.ceil(response.total / itemsPerPage));
      setCurrentPage(response.page);
    } catch (err) {
      console.error("Failed to fetch podcasts:", err);
      setError("Failed to load your podcasts. Please try again later.");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPodcasts(currentPage);
  }, [fetchPodcasts, currentPage]);

  const handleRenameClick = (podcast: UserPodcastListItem) => {
    setPodcastToRename(podcast);
    setIsRenameModalOpen(true);
  };

  const handleRenameModalClose = () => {
    setIsRenameModalOpen(false);
    setPodcastToRename(null);
  };

  const handleRenameSave = async (newName: string) => {
    if (!podcastToRename) return;
    let saveError = null;
    try {
      const payload: PodcastEpisodeUpdateNameRequest = { user_given_name: newName };
      const updatedEpisode: PodcastEpisodeDetail = await updatePodcastName(podcastToRename.podcast_episode_id, payload);
      
      setPodcasts(prevPodcasts => 
        prevPodcasts.map(p => 
          p.podcast_episode_id === updatedEpisode.id 
            ? { ...p, user_given_name: updatedEpisode.user_given_name } 
            : p
        )
      );
      handleRenameModalClose();
    } catch (err: any) {
      console.error("Failed to rename podcast:", err);
      saveError = err.message || "Failed to rename podcast. Please try again.";
      setError(saveError);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (isLoading && podcasts.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="ml-4 text-lg text-gray-300">Loading your podcasts...</p>
      </div>
    );
  }

  if (error && !isRenameModalOpen) {
    return (
      <div role="alert" className="my-4 p-4 bg-red-900 border border-red-700 text-red-300 rounded-md">
        <div className="flex items-center mb-1">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <h5 className="font-semibold">Error</h5>
        </div>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (podcasts.length === 0 && !isLoading) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold mb-3 text-white">No Podcasts Yet</h2>
        <p className="text-gray-400">You haven't generated any podcasts, or they might have expired.</p>
        <p className="text-gray-400">Go to the "Generate" page to create your first one!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-white">My Podcasts</h1>
      
      {isLoading && (
        <div className="fixed top-16 right-4 bg-blue-600 text-white p-3 rounded-md shadow-lg flex items-center z-50">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      )}

      {error && isRenameModalOpen && (
           <div role="alert" className="my-4 p-3 bg-red-900 border border-red-700 text-red-300 rounded-md text-xs">
             <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1.5 shrink-0" />
                <span className="font-medium">Rename Error:</span>
             </div>
             <p className="ml-1">{error}</p>
           </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {podcasts.map(podcast => (
          <PodcastListItemCard 
            key={podcast.podcast_episode_id} 
            podcast={podcast} 
            onRenameClick={() => handleRenameClick(podcast)} 
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 mt-8 py-4">
          <button 
            onClick={handlePreviousPage} 
            disabled={currentPage === 1 || isLoading}
            className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-gray-300">
            Page {currentPage} of {totalPages} (Total: {totalItems} podcasts)
          </span>
          <button 
            onClick={handleNextPage} 
            disabled={currentPage === totalPages || isLoading}
            className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {podcastToRename && (
        <RenamePodcastModal
          isOpen={isRenameModalOpen}
          currentName={podcastToRename.user_given_name || ''}
          onClose={handleRenameModalClose}
          onSave={handleRenameSave}
          podcastId={podcastToRename.podcast_episode_id}
        />
      )}
    </div>
  );
};

export default MyPodcastsPage; 