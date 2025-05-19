import apiClient from '@/lib/apiClient';
import type {
  PodcastGenerationRequest,
  PodcastGenerationResponse,
  PodcastEpisodeStatusResponse,
  UserPodcastsListResponse,
  PodcastEpisodeUpdateNameRequest,
  PodcastEpisodeDetail
} from '../types/api';

export const generatePodcast = async (
  payload: PodcastGenerationRequest
): Promise<PodcastGenerationResponse> => {
  try {
    const { data } = await apiClient.post<PodcastGenerationResponse>(
      '/podcasts/generate-podcast',
      payload
    );
    return data;
  } catch (error) {
    console.error("Error generating podcast:", error);
    throw error;
  }
};

export const getPodcastStatus = async (
  newsDigestId: number
): Promise<PodcastEpisodeStatusResponse> => {
  try {
    const { data } = await apiClient.get<PodcastEpisodeStatusResponse>(
      `/podcasts/podcast-status/${newsDigestId}`
    );
    return data;
  } catch (error) {
    console.error(`Error fetching status for digest ${newsDigestId}:`, error);
    throw error;
  }
};

export const listUserPodcasts = async (
  page = 1,
  size = 10
): Promise<UserPodcastsListResponse> => {
  try {
    const { data } = await apiClient.get<UserPodcastsListResponse>(
      '/podcasts/my-podcasts',
      {
        params: { page, size },
      }
    );
    return data;
  } catch (error) {
    console.error("Error fetching user podcasts:", error);
    throw error;
  }
};

export const updatePodcastName = async (
  podcastEpisodeId: number,
  payload: PodcastEpisodeUpdateNameRequest
): Promise<PodcastEpisodeDetail> => {
  try {
    const { data } = await apiClient.put<PodcastEpisodeDetail>(
      `/podcasts/episodes/${podcastEpisodeId}/name`,
      payload
    );
    return data;
  } catch (error) {
    console.error(`Error updating name for podcast episode ${podcastEpisodeId}:`, error);
    throw error;
  }
}; 