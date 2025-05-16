import apiClient from '@/lib/apiClient';
import type { PredefinedCategory } from '../types/api';

export const fetchPredefinedCategories = async (): Promise<PredefinedCategory[]> => {
  try {
    const { data } = await apiClient.get<PredefinedCategory[]>('/predefined-categories');
    return data;
  } catch (error) {
    console.error("Error fetching predefined categories:", error);
    // Depending on how you want to handle errors globally, you might re-throw or return an empty array.
    // For useQuery, throwing the error is standard to let it handle error states.
    throw error; 
  }
}; 