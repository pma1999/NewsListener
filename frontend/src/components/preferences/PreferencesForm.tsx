import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUserPreferences } from '../../services/preferenceService.js';
import type { UserPreference, UserPreferenceUpdate } from '../../types/api';
import { Button } from '../common/Button.js';
import { Input } from '../common/Input.js';
import { Select } from '../common/Select.js';
import { Check, AlertCircle, Save, PlusCircle, XCircle, Loader2 } from 'lucide-react';

interface PreferencesFormProps {
  initialPreferences: UserPreference;
}

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  // Add more supported languages from backend if necessary
];

const audioStyleOptions = [
  { value: 'standard', label: 'Standard News Anchor' },
  { value: 'engaging_storyteller', label: 'Engaging Storyteller' },
  { value: 'quick_brief', label: 'Quick Brief' },
  { value: 'investigative_deep_dive', label: 'Investigative Deep Dive' },
  { value: 'calm_neutral_reporter', label: 'Calm Neutral Reporter' },
  { value: 'professional_narrator', label: 'Professional Narrator' },
  { value: 'enthusiastic_reporter', label: 'Enthusiastic Reporter' },
  { value: 'news_anchor', label: 'Classic News Anchor' },
  { value: 'documentary_style', label: 'Documentary Style' },
  // Add more supported styles from backend
];

const PreferencesForm: React.FC<PreferencesFormProps> = ({ initialPreferences }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<UserPreferenceUpdate>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    // Initialize form data from initialPreferences, handling nulls for arrays
    setFormData({
      preferred_topics: initialPreferences.preferred_topics || [],
      custom_keywords: initialPreferences.custom_keywords || [],
      include_source_rss_urls: initialPreferences.include_source_rss_urls || [],
      exclude_keywords: initialPreferences.exclude_keywords || [],
      exclude_source_domains: initialPreferences.exclude_source_domains || [],
      default_language: initialPreferences.default_language || 'en',
      default_audio_style: initialPreferences.default_audio_style || 'standard',
    });
  }, [initialPreferences]);

  const mutation = useMutation<UserPreference, Error, UserPreferenceUpdate>({
    mutationFn: updateUserPreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(['userPreferences'], data); // Update cache
      setNotification({ type: 'success', message: 'Preferences saved successfully!' });
      setTimeout(() => setNotification(null), 3000);
    },
    onError: (error) => {
      setNotification({ type: 'error', message: `Failed to save: ${error.message}` });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Generic handler for list inputs (topics, keywords, RSS URLs, etc.)
  const handleListChange = (field: keyof UserPreferenceUpdate, index: number, value: string) => {
    const list = (formData[field] as string[] || []).slice();
    list[index] = value;
    setFormData(prev => ({ ...prev, [field]: list.filter(item => item.trim() !== '') })); // Remove empty strings on change
  };

  const addListItem = (field: keyof UserPreferenceUpdate) => {
    const list = [...(formData[field] as string[] || []), '']; // Add new empty string to render an input
    setFormData(prev => ({ ...prev, [field]: list }));
  };

  const removeListItem = (field: keyof UserPreferenceUpdate, index: number) => {
    const list = (formData[field] as string[] || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, [field]: list }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out any empty strings from arrays before submitting
    const cleanedFormData: UserPreferenceUpdate = {
        ...formData,
        preferred_topics: (formData.preferred_topics || []).filter(t => t.trim() !== ''),
        custom_keywords: (formData.custom_keywords || []).filter(k => k.trim() !== ''),
        include_source_rss_urls: (formData.include_source_rss_urls || []).filter(r => r.trim() !== ''),
        exclude_keywords: (formData.exclude_keywords || []).filter(e => e.trim() !== ''),
        exclude_source_domains: (formData.exclude_source_domains || []).filter(d => d.trim() !== ''),
    };
    mutation.mutate(cleanedFormData);
  };

  // Helper to render list inputs
  const renderListInput = (
    field: keyof UserPreferenceUpdate,
    label: string,
    placeholder: string,
    inputType: 'text' | 'url' = 'text'
  ) => (
    <div className="mb-5 sm:mb-6">
      <label className="block text-sm font-medium text-purple-300 mb-1.5">{label}</label>
      {(formData[field] as string[] || []).map((item, index) => (
        <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center mb-2">
          <Input
            type={inputType}
            name={`${field}-${index}`}
            value={item}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleListChange(field, index, e.target.value)}
            placeholder={placeholder}
            className="flex-grow bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 mb-1.5 sm:mb-0 sm:mr-2"
          />
          <Button 
            variant="icon" 
            onClick={() => removeListItem(field, index)} 
            className="ml-auto sm:ml-0 text-red-500 hover:text-red-400 p-2 self-end sm:self-center flex-shrink-0"
            aria-label={`Remove ${label.slice(0,-1)}`}
          >
            <XCircle size={20} />
          </Button>
        </div>
      ))}
      <Button 
        variant="outline" 
        onClick={() => addListItem(field)} 
        className="mt-1 text-sm text-purple-400 border-purple-400 hover:bg-purple-500/20 w-full sm:w-auto"
      >
        <PlusCircle size={18} className="mr-2" /> Add {label.slice(0,-1)}
      </Button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-4 sm:p-6 md:p-8 rounded-xl shadow-2xl space-y-5 sm:space-y-6">
      {notification && (
        <div 
          className={`p-3 sm:p-4 rounded-md flex items-start sm:items-center text-sm 
            ${notification.type === 'success' ? 'bg-green-700/30 text-green-300 border border-green-600' : 'bg-red-700/30 text-red-300 border border-red-600'}
          `}
        >
          {notification.type === 'success' ? <Check size={20} className="mr-2 flex-shrink-0 mt-0.5 sm:mt-0" /> : <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-0.5 sm:mt-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <label htmlFor="default_language" className="block text-sm font-medium text-purple-300 mb-1">Default Language</label>
          <Select
            id="default_language"
            name="default_language"
            value={formData.default_language || 'en'}
            onChange={handleInputChange}
            options={languageOptions}
            className="bg-gray-700 border-gray-600 text-gray-200"
          />
        </div>
        <div>
          <label htmlFor="default_audio_style" className="block text-sm font-medium text-purple-300 mb-1">Default Audio Style</label>
          <Select
            id="default_audio_style"
            name="default_audio_style"
            value={formData.default_audio_style || 'standard'}
            onChange={handleInputChange}
            options={audioStyleOptions}
            className="bg-gray-700 border-gray-600 text-gray-200"
          />
        </div>
      </div>

      {renderListInput('preferred_topics', 'Preferred Topics', 'e.g., Technology')}
      {renderListInput('custom_keywords', 'Custom Keywords/Phrases', 'e.g., AI in healthcare')}
      {renderListInput('include_source_rss_urls', 'Include RSS Feed URLs', 'https://example.com/feed.xml', 'url')}
      {renderListInput('exclude_keywords', 'Exclude Keywords/Phrases', 'e.g., celebrity gossip')}
      {renderListInput('exclude_source_domains', 'Exclude Source Domains', 'e.g., tabloid.com')}

      <div className="pt-3 sm:pt-4 border-t border-gray-700">
        <Button 
          type="submit" 
          className="w-full flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white py-2.5 sm:py-3 text-sm sm:text-base"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <><Loader2 size={20} className="animate-spin mr-2" /> Saving...</>
          ) : (
            <><Save size={20} className="mr-2" /> Save Preferences</>
          )}
        </Button>
      </div>
    </form>
  );
};

export default PreferencesForm;
