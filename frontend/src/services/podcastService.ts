import apiClient from '../lib/apiClient';
import type {
  PodcastGenerationRequest,
  PodcastGenerationResponse,
  PodcastEpisodeStatusResponse
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