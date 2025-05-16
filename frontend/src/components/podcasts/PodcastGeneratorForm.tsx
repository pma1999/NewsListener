import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { generatePodcast } from '../../services/podcastService.js';
import type { PodcastGenerationRequest, PodcastGenerationResponse, UserPreference } from '../../types/api';
import { Button } from '../common/Button.js';
import { Input } from '../common/Input.js';
import { Select } from '../common/Select.js';
import { Checkbox } from '../common/Checkbox.js'; // Assuming Checkbox component exists or will be created
import { Loader2, AlertCircle, PlusCircle, XCircle, Wand2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { fetchUserPreferences } from '../../services/preferenceService'; // Added import

// Define language and audio style options (can be moved to a shared config if used elsewhere)
const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
];

const audioStyleOptions = [
  { value: 'standard', label: 'Standard News Anchor' },
  { value: 'engaging_storyteller', label: 'Engaging Storyteller' },
  { value: 'quick_brief', label: 'Quick Brief' },
  // ... add all styles from app/core/prompts.py NEWS_AUDIO_STYLE_CONFIG
  { value: 'investigative_deep_dive', label: 'Investigative Deep Dive' },
  { value: 'calm_neutral_reporter', label: 'Calm Neutral Reporter' },
  { value: 'professional_narrator', label: 'Professional Narrator' },
  { value: 'enthusiastic_reporter', label: 'Enthusiastic Reporter' },
  { value: 'news_anchor', label: 'Classic News Anchor' },
  { value: 'documentary_style', label: 'Documentary Style' },
];

interface PodcastGeneratorFormProps {
  onGenerationStart: (newsDigestId: number, initialStatus: string, message: string) => void;
}

const PodcastGeneratorForm: React.FC<PodcastGeneratorFormProps> = ({ onGenerationStart }) => {
  const [formData, setFormData] = useState<Partial<PodcastGenerationRequest>>({
    use_user_default_preferences: true,
    language: 'en',
    audio_style: 'standard',
    force_regenerate: false,
    specific_article_urls: [],
    request_topics: [],
    request_keywords: [],
    request_rss_urls: [],
    request_exclude_keywords: [],
    request_exclude_source_domains: [],
    user_openai_api_key: '',
    user_google_api_key: '',
  });
  const [notification, setNotification] = useState<{ type: 'error'; message: string } | null>(null);
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);

  const { data: userPreferences, isLoading: isLoadingPreferences } = 
    useQuery<UserPreference, Error>({
      queryKey: ['userPreferencesForGeneratorForm'], // Unique query key
      queryFn: fetchUserPreferences,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      refetchOnWindowFocus: false, // Optional: prevent refetch on window focus if not desired
    });

  useEffect(() => {
    if (formData.use_user_default_preferences) {
      if (userPreferences) {
        setFormData(prev => ({
          ...prev,
          language: userPreferences.default_language || 'en',
          audio_style: userPreferences.default_audio_style || 'standard',
        }));
      } else if (!isLoadingPreferences) {
        // Preferences not available (either not set or error fetching), use app defaults
        setFormData(prev => ({
            ...prev,
            language: 'en', 
            audio_style: 'standard',
        }));
      }
      // While loading preferences, language/audio_style will remain as their initial/previous ad-hoc values
      // or be set to app defaults once loading finishes and no prefs are found.
    } else {
      // When 'use_user_default_preferences' is unchecked, revert to application defaults for ad-hoc selection
      setFormData(prev => ({
        ...prev,
        language: 'en',
        audio_style: 'standard',
      }));
    }
  }, [formData.use_user_default_preferences, userPreferences, isLoadingPreferences]);

  const mutation = useMutation<PodcastGenerationResponse, Error, PodcastGenerationRequest>({
    mutationFn: generatePodcast,
    onSuccess: (data) => {
      onGenerationStart(data.news_digest_id, data.initial_status, data.message);
      setNotification(null); // Clear previous errors
      // Optionally reset parts of the form or give other success feedback
    },
    onError: (error) => {
      setNotification({ type: 'error', message: `Generation failed: ${error.message}` });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked; // For checkbox
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleListChange = (field: keyof PodcastGenerationRequest, index: number, value: string) => {
    const list = (formData[field] as string[] || []).slice();
    list[index] = value;
    setFormData(prev => ({ ...prev, [field]: list.filter(item => item.trim() !== '') }));
  };

  const addListItem = (field: keyof PodcastGenerationRequest) => {
    setFormData(prev => ({ ...prev, [field]: [...(prev[field] as string[] || []), ''] }));
  };

  const removeListItem = (field: keyof PodcastGenerationRequest, index: number) => {
    setFormData(prev => ({ ...prev, [field]: (prev[field] as string[] || []).filter((_, i) => i !== index) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.language || !formData.audio_style) {
      setNotification({ type: 'error', message: 'Language and Audio Style are required.'});
      return;
    }

    // --- NEW PAYLOAD CONSTRUCTION LOGIC ---
    const usePrefs = formData.use_user_default_preferences ?? true;
    // Determine if "Specific Article URLs" mode is active (URLs are provided and non-empty)
    const isUrlModeActive = (formData.specific_article_urls?.filter(u => u.trim() !== '').length ?? 0) > 0;

    // Prepare cleaned versions of form inputs for lists
    // These will be empty arrays if no valid items are provided by the user
    const formTopics = (formData.request_topics || []).filter(t => t.trim() !== '');
    const formKeywords = (formData.request_keywords || []).filter(k => k.trim() !== '');
    const formRssUrls = (formData.request_rss_urls || []).filter(r => r.trim() !== '');
    const formExcludeKeywords = (formData.request_exclude_keywords || []).filter(e => e.trim() !== '');
    const formExcludeSourceDomains = (formData.request_exclude_source_domains || []).filter(d => d.trim() !== '');

    // Initialize payload with common fields
    const finalPayload: PodcastGenerationRequest = {
        language: formData.language!, // Already validated to be present
        audio_style: formData.audio_style!, // Already validated to be present
        force_regenerate: formData.force_regenerate ?? false,
        user_openai_api_key: formData.user_openai_api_key?.trim() ? formData.user_openai_api_key.trim() : null,
        user_google_api_key: formData.user_google_api_key?.trim() ? formData.user_google_api_key.trim() : null,

        // These will be conditionally populated
        specific_article_urls: null,
        use_user_default_preferences: false, // Default to false, will be set based on mode
        request_topics: null,
        request_keywords: null,
        request_rss_urls: null,
        request_exclude_keywords: null,
        request_exclude_source_domains: null,
    };

    if (isUrlModeActive) {
        // Mode 1: Specific Article URLs
        finalPayload.specific_article_urls = (formData.specific_article_urls || []).filter(u => u.trim() !== '');
        // use_user_default_preferences remains false (or explicitly set to false)
        // All other request_* (topics, keywords, etc.) remain null as they are not applicable
        finalPayload.use_user_default_preferences = false; 
    } else if (usePrefs) {
        // Mode 2: Use User Default Preferences (with potential overrides)
        finalPayload.use_user_default_preferences = true;
        
        // Only send override values if they are explicitly provided (i.e., list is not empty)
        // Otherwise, send null to indicate "no override for this field"
        finalPayload.request_topics = formTopics.length > 0 ? formTopics : null;
        finalPayload.request_keywords = formKeywords.length > 0 ? formKeywords : null;
        finalPayload.request_rss_urls = formRssUrls.length > 0 ? formRssUrls : null;
        
        // Exclusions are only relevant as overrides when usePrefs is true
        finalPayload.request_exclude_keywords = formExcludeKeywords.length > 0 ? formExcludeKeywords : null;
        finalPayload.request_exclude_source_domains = formExcludeSourceDomains.length > 0 ? formExcludeSourceDomains : null;
    } else {
        // Mode 3: Ad-hoc Criteria (not using URLs, not using stored preferences)
        finalPayload.use_user_default_preferences = false;
        
        // Send form values as they are. Empty arrays are meaningful for ad-hoc
        // (e.g., "generate ad-hoc podcast with these specific (empty) topics").
        finalPayload.request_topics = formTopics;
        finalPayload.request_keywords = formKeywords;
        finalPayload.request_rss_urls = formRssUrls;
        
        // Per schema: request_exclude_keywords/domains are overrides for user preferences.
        // If not using user preferences (ad-hoc), these should be null as they don't apply.
        finalPayload.request_exclude_keywords = null;
        finalPayload.request_exclude_source_domains = null;
    }
    // --- END OF NEW PAYLOAD CONSTRUCTION LOGIC ---
    
    // console.log("Final payload being sent:", finalPayload); // For debugging
    mutation.mutate(finalPayload);
  };

  const renderListInput = (
    field: keyof PodcastGenerationRequest,
    label: string,
    placeholder: string,
    inputType: 'text' | 'url' = 'text',
    disabledCondition?: boolean
  ) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-purple-300 mb-1.5">{label}</label>
      {(formData[field] as string[] || []).map((item, index) => (
        <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center mb-2">
          <Input
            type={inputType}
            value={item}
            onChange={(e) => handleListChange(field, index, e.target.value)}
            placeholder={placeholder}
            className="flex-grow bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 disabled:opacity-50 mb-1.5 sm:mb-0 sm:mr-2"
            disabled={disabledCondition}
          />
          <Button 
            variant="icon" 
            onClick={() => removeListItem(field, index)} 
            className="ml-auto sm:ml-0 text-red-500 hover:text-red-400 p-2 disabled:opacity-50 self-end sm:self-center flex-shrink-0"
            aria-label={`Remove ${label.slice(0,-1)}`}
            disabled={disabledCondition}
          >
            <XCircle size={20} />
          </Button>
        </div>
      ))}
      <Button 
        variant="outline" 
        onClick={() => addListItem(field)} 
        className="mt-1 text-sm text-purple-400 border-purple-400 hover:bg-purple-500/20 disabled:opacity-50 w-full sm:w-auto"
        disabled={disabledCondition}
      >
        <PlusCircle size={18} className="mr-2" /> Add {label.slice(0,-1)}
      </Button>
    </div>
  );

  const isUrlMode = (formData.specific_article_urls?.length ?? 0) > 0;
  const isPreferenceOverrideMode = formData.use_user_default_preferences && !isUrlMode;

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-4 sm:p-6 md:p-8 rounded-xl shadow-2xl space-y-6 max-w-2xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold text-center text-purple-400 mb-4 sm:mb-6">Create New Podcast</h2>
      
      {notification && (
        <div className="p-3 rounded-md flex items-start sm:items-center text-sm bg-red-700/30 text-red-300 border border-red-600">
          <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-0.5 sm:mt-0" /> 
          <span>{notification.message}</span>
        </div>
      )}

      {/* Source Selection Logic */}
      <div className="space-y-3 p-3 sm:p-4 border border-gray-700 rounded-lg">
        <h3 className="text-base sm:text-lg font-semibold text-purple-300 mb-2">Content Source:</h3>
        <Checkbox
          name="specific_article_urls_toggle" // Temporary name for UI logic
          label="From Specific Article URLs"
          checked={isUrlMode}
          onChange={() => {
            setFormData(prev => ({ 
              ...prev, 
              use_user_default_preferences: false, // Specific URLs override preferences
              specific_article_urls: isUrlMode ? [] : [''], // Toggle: clear or add one input
            }));
          }}
        />
        {isUrlMode && renderListInput('specific_article_urls', 'Article URLs', 'https://example.com/article', 'url')}
        
        <Checkbox
          name="use_user_default_preferences"
          label="Use My Stored Preferences (can be overridden below)"
          checked={formData.use_user_default_preferences ?? true}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setFormData(prev => ({
              ...prev,
              use_user_default_preferences: e.target.checked,
              specific_article_urls: e.target.checked ? [] : prev.specific_article_urls // Clear URLs if switching to prefs
            }));
          }}
          disabled={isUrlMode} // Disable if URL mode is active
          className={isUrlMode ? 'opacity-50 cursor-not-allowed' : ''}
        />
      </div>

      {/* Ad-hoc / Override Fields - visibility depends on source selection */}
      {(!isUrlMode) && (
        <div className={`p-3 sm:p-4 border border-gray-700 rounded-lg space-y-4 ${isPreferenceOverrideMode ? 'opacity-70' : ''}`}>
          <h3 className="text-base sm:text-lg font-semibold text-purple-300">
            {isPreferenceOverrideMode ? 'Override Preferences For This Podcast:' : 'Ad-hoc Criteria For This Podcast:'}
          </h3>
          {renderListInput('request_topics', 'Topics', 'e.g., AI, Space Exploration', 'text', isUrlMode)}
          {renderListInput('request_keywords', 'Keywords', 'e.g., Gemini Pro, SpaceX Starship', 'text', isUrlMode)}
          {renderListInput('request_rss_urls', 'RSS Feed URLs', 'https://feed.example.com', 'url', isUrlMode)}
          
          {isPreferenceOverrideMode && (
            <>
              {renderListInput('request_exclude_keywords', 'Exclude Keywords (Override)', 'e.g., rumors, gossip', 'text', isUrlMode)}
              {renderListInput('request_exclude_source_domains', 'Exclude Domains (Override)', 'e.g., clickbait.com', 'text', isUrlMode)}
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-4 border-t border-gray-700">
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-purple-300 mb-1">Language</label>
          <Select id="language" name="language" value={formData.language} onChange={handleInputChange} options={languageOptions} className="bg-gray-700 border-gray-600" />
        </div>
        <div>
          <label htmlFor="audio_style" className="block text-sm font-medium text-purple-300 mb-1">Audio Style</label>
          <Select id="audio_style" name="audio_style" value={formData.audio_style} onChange={handleInputChange} options={audioStyleOptions} className="bg-gray-700 border-gray-600" />
        </div>
      </div>

      {/* API Key Inputs */}
      <div className="p-3 sm:p-4 border border-gray-700 rounded-lg space-y-4">
        <h3 className="text-base sm:text-lg font-semibold text-purple-300 flex items-center">
          <KeyRound size={20} className="mr-2 text-yellow-400" /> Optional API Keys
        </h3>
        <p className="text-xs sm:text-sm text-gray-400 mb-3">
          If you provide your own API keys, they will be used for this generation request only and will not be stored.
          This will override any system-configured keys for this request.
        </p>
        <div>
          <label htmlFor="user_openai_api_key" className="block text-sm font-medium text-purple-300 mb-1">OpenAI API Key (for TTS)</label>
          <div className="relative flex items-center">
            <Input
              id="user_openai_api_key"
              name="user_openai_api_key"
              type={showOpenAiKey ? 'text' : 'password'}
              value={formData.user_openai_api_key || ''}
              onChange={handleInputChange}
              placeholder="sk-..."
              className="bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-500 pr-10 w-full"
            />
            <Button
              type="button"
              variant="icon"
              onClick={() => setShowOpenAiKey(!showOpenAiKey)}
              className="absolute inset-y-0 right-0 px-2 sm:px-3 flex items-center text-gray-400 hover:text-gray-200"
              aria-label={showOpenAiKey ? "Hide OpenAI API Key" : "Show OpenAI API Key"}
            >
              {showOpenAiKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </Button>
          </div>
        </div>
        <div>
          <label htmlFor="user_google_api_key" className="block text-sm font-medium text-purple-300 mb-1">Google API Key (for Gemini)</label>
           <div className="relative flex items-center">
            <Input
              id="user_google_api_key"
              name="user_google_api_key"
              type={showGoogleKey ? 'text' : 'password'}
              value={formData.user_google_api_key || ''}
              onChange={handleInputChange}
              placeholder="AIzaSy..."
              className="bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-500 pr-10 w-full"
            />
            <Button
              type="button"
              variant="icon"
              onClick={() => setShowGoogleKey(!showGoogleKey)}
              className="absolute inset-y-0 right-0 px-2 sm:px-3 flex items-center text-gray-400 hover:text-gray-200"
              aria-label={showGoogleKey ? "Hide Google API Key" : "Show Google API Key"}
            >
              {showGoogleKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </Button>
          </div>
        </div>
      </div>

      <Checkbox
        name="force_regenerate"
        label="Force Regenerate (ignore any cached version)"
        checked={formData.force_regenerate ?? false}
        onChange={handleInputChange}
        className="text-sm"
      />

      <Button 
        type="submit" 
        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 sm:py-3 mt-2 text-sm sm:text-base"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? <Loader2 size={20} className="animate-spin mr-2" /> : <Wand2 size={20} className="mr-2" />} 
        Generate Podcast
      </Button>
    </form>
  );
};

export default PodcastGeneratorForm; 