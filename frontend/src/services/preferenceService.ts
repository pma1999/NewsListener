import apiClient from '../lib/apiClient.js';
import type { UserPreference, UserPreferenceUpdate } from '../types/api';

export const fetchUserPreferences = async (): Promise<UserPreference> => {
  try {
    const { data } = await apiClient.get<UserPreference>('/user/preferences/me');
    return data;
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    // Consider throwing a more specific error or returning a default/error state
    throw error;
  }
};

export const updateUserPreferences = async (
  payload: UserPreferenceUpdate
): Promise<UserPreference> => {
  try {
    const { data } = await apiClient.put<UserPreference>('/user/preferences/me', payload);
    return data;
  } catch (error) {
    console.error("Error updating user preferences:", error);
    throw error;
  }
}; 