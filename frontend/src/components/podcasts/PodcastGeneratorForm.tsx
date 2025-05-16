import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { generatePodcast } from '../../services/podcastService.js';
import { fetchPredefinedCategories } from '../../services/categoryService';
import type { PodcastGenerationRequest, PodcastGenerationResponse, UserPreference, PredefinedCategory } from '../../types/api';
import { Button } from '../common/Button.js';
import { Input } from '../common/Input.js';
import { Select } from '../common/Select.js';
import { Checkbox } from '../common/Checkbox.js';
import Tooltip from '../common/Tooltip';
import { Loader2, AlertCircle, PlusCircle, XCircle, Wand2, KeyRound, Eye, EyeOff, Newspaper, Info } from 'lucide-react';
import { fetchUserPreferences } from '../../services/preferenceService';

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
    predefined_category_id: undefined,
  });
  const [notification, setNotification] = useState<{ type: 'error'; message: string } | null>(null);
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | ''>('');

  const { data: userPreferences, isLoading: isLoadingUserPreferences } = 
    useQuery<UserPreference, Error>({
      queryKey: ['userPreferencesForGeneratorForm'],
      queryFn: fetchUserPreferences,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    });

  const { data: predefinedCategories, isLoading: isLoadingCategories } = 
    useQuery<PredefinedCategory[], Error>({
      queryKey: ['predefinedCategories'],
      queryFn: fetchPredefinedCategories,
      staleTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
    });

  useEffect(() => {
    if (formData.use_user_default_preferences) {
      setSelectedCategoryId('');
      if (userPreferences) {
        setFormData(prev => ({
          ...prev,
          language: userPreferences.default_language || 'en',
          audio_style: userPreferences.default_audio_style || 'standard',
        }));
      } else if (!isLoadingUserPreferences) {
        setFormData(prev => ({
            ...prev,
            language: 'en', 
            audio_style: 'standard',
        }));
      }
    } else {
    }
  }, [formData.use_user_default_preferences, userPreferences, isLoadingUserPreferences]);

  const mutation = useMutation<PodcastGenerationResponse, Error, PodcastGenerationRequest>({
    mutationFn: generatePodcast,
    onSuccess: (data) => {
      onGenerationStart(data.news_digest_id, data.initial_status, data.message);
      setNotification(null);
    },
    onError: (error) => {
      setNotification({ type: 'error', message: `Generation failed: ${error.message}` });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryIdStr = e.target.value;
    const newSelectedCategoryId = categoryIdStr ? parseInt(categoryIdStr) : '';
    setSelectedCategoryId(newSelectedCategoryId);

    if (newSelectedCategoryId && predefinedCategories) {
      const selectedCat = predefinedCategories.find(cat => cat.id === newSelectedCategoryId);
      if (selectedCat) {
        setFormData(prev => ({
          ...prev,
          request_topics: selectedCat.topics || [],
          request_keywords: selectedCat.keywords || [],
          request_rss_urls: selectedCat.rss_urls || [],
          request_exclude_keywords: selectedCat.exclude_keywords || [],
          request_exclude_source_domains: selectedCat.exclude_source_domains || [],
          language: selectedCat.language || prev.language || 'en',
          audio_style: selectedCat.audio_style || prev.audio_style || 'standard',
          use_user_default_preferences: false,
          specific_article_urls: [],
          predefined_category_id: selectedCat.id,
        }));
      }
    } else {
      setFormData(prev => ({
          ...prev,
          predefined_category_id: undefined,
      }));
    }
  };

  const handleListChange = (fieldKey: keyof PodcastGenerationRequest, index: number, value: string) => {
    const list = (formData[fieldKey] as string[] || []).slice();
    list[index] = value;
    setFormData(prev => ({ ...prev, [fieldKey]: list.filter(item => item.trim() !== '') }));
  };

  const addListItem = (fieldKey: keyof PodcastGenerationRequest) => {
    setFormData(prev => ({ ...prev, [fieldKey]: [...(prev[fieldKey] as string[] || []), ''] }));
  };

  const removeListItem = (fieldKey: keyof PodcastGenerationRequest, index: number) => {
    setFormData(prev => ({ ...prev, [fieldKey]: (prev[fieldKey] as string[] || []).filter((_, i) => i !== index) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.language || !formData.audio_style) {
      setNotification({ type: 'error', message: 'Language and Audio Style are required.'});
      return;
    }

    const currentIsUrlMode = (formData.specific_article_urls?.filter(u => u.trim() !== '').length ?? 0) > 0;
    const currentSelectedCatId = selectedCategoryId;
    const currentUseUserPrefs = formData.use_user_default_preferences ?? false;

    const formTopics = (formData.request_topics || []).filter(t => t.trim() !== '');
    const formKeywords = (formData.request_keywords || []).filter(k => k.trim() !== '');
    const formRssUrls = (formData.request_rss_urls || []).filter(r => r.trim() !== '');
    const formExcludeKeywords = (formData.request_exclude_keywords || []).filter(e => e.trim() !== '');
    const formExcludeSourceDomains = (formData.request_exclude_source_domains || []).filter(d => d.trim() !== '');

    const finalPayload: PodcastGenerationRequest = {
        language: formData.language!,
        audio_style: formData.audio_style!,
        force_regenerate: formData.force_regenerate ?? false,
        user_openai_api_key: formData.user_openai_api_key?.trim() ? formData.user_openai_api_key.trim() : null,
        user_google_api_key: formData.user_google_api_key?.trim() ? formData.user_google_api_key.trim() : null,

        specific_article_urls: null,
        predefined_category_id: null,
        use_user_default_preferences: false, 
        request_topics: null,
        request_keywords: null,
        request_rss_urls: null,
        request_exclude_keywords: null,
        request_exclude_source_domains: null,
    };

    if (currentIsUrlMode) {
        finalPayload.specific_article_urls = (formData.specific_article_urls || []).filter(u => u.trim() !== '');
    } else if (currentSelectedCatId) {
        finalPayload.predefined_category_id = currentSelectedCatId;
        finalPayload.request_topics = formTopics.length > 0 ? formTopics : null;
        finalPayload.request_keywords = formKeywords.length > 0 ? formKeywords : null;
        finalPayload.request_rss_urls = formRssUrls.length > 0 ? formRssUrls : null;
        finalPayload.request_exclude_keywords = formExcludeKeywords.length > 0 ? formExcludeKeywords : null;
        finalPayload.request_exclude_source_domains = formExcludeSourceDomains.length > 0 ? formExcludeSourceDomains : null;
    } else if (currentUseUserPrefs) {
        finalPayload.use_user_default_preferences = true;
        finalPayload.request_topics = formTopics.length > 0 ? formTopics : null;
        finalPayload.request_keywords = formKeywords.length > 0 ? formKeywords : null;
        finalPayload.request_rss_urls = formRssUrls.length > 0 ? formRssUrls : null;
        finalPayload.request_exclude_keywords = formExcludeKeywords.length > 0 ? formExcludeKeywords : null;
        finalPayload.request_exclude_source_domains = formExcludeSourceDomains.length > 0 ? formExcludeSourceDomains : null;
    } else {
        finalPayload.request_topics = formTopics.length > 0 ? formTopics : null;
        finalPayload.request_keywords = formKeywords.length > 0 ? formKeywords : null;
        finalPayload.request_rss_urls = formRssUrls.length > 0 ? formRssUrls : null;
        finalPayload.request_exclude_keywords = formExcludeKeywords.length > 0 ? formExcludeKeywords : null;
        finalPayload.request_exclude_source_domains = formExcludeSourceDomains.length > 0 ? formExcludeSourceDomains : null;
    }
    
    mutation.mutate(finalPayload);
  };

  const renderListInput = (
    fieldKey: keyof PodcastGenerationRequest,
    label: string,
    placeholder: string,
    inputType: 'text' | 'url' = 'text',
    disabledConditionOverride?: boolean
  ) => {
    const isEffectivelyDisabled = 
        disabledConditionOverride || 
        (fieldKey === 'specific_article_urls' ? false : currentIsUrlMode);

    return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-purple-300 mb-1.5">{label}</label>
      {(formData[fieldKey] as string[] || []).map((item, index) => (
        <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center mb-2">
          <Input
            type={inputType}
            value={item}
            onChange={(e) => handleListChange(fieldKey, index, e.target.value)}
            placeholder={placeholder}
            className="flex-grow bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 disabled:opacity-50 mb-1.5 sm:mb-0 sm:mr-2"
            disabled={isEffectivelyDisabled}
          />
          <Button 
            variant="icon" 
            onClick={() => removeListItem(fieldKey, index)} 
            className="ml-auto sm:ml-0 text-red-500 hover:text-red-400 p-2.5 disabled:opacity-50 self-end sm:self-center flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label={`Remove ${label.slice(0,-1)}`}
            disabled={isEffectivelyDisabled}
          >
            <XCircle size={20} />
          </Button>
        </div>
      ))}
      <Button 
        variant="outline" 
        onClick={() => addListItem(fieldKey)} 
        className="mt-1 text-sm text-purple-400 border-purple-400 hover:bg-purple-500/20 disabled:opacity-50 w-full sm:w-auto"
        disabled={isEffectivelyDisabled}
      >
        <PlusCircle size={18} className="mr-2" /> Add {label.slice(0,-1)}
      </Button>
    </div>
  )};

  const currentIsUrlMode = (formData.specific_article_urls?.filter(u => u.trim() !== '').length ?? 0) > 0;
  const isCategoryMode = !!selectedCategoryId && !currentIsUrlMode;
  const isPreferenceMode = formData.use_user_default_preferences && !currentIsUrlMode && !isCategoryMode;

  const getCriteriaSectionTitle = () => {
    if (isCategoryMode) return 'Override Selected News Profile Criteria:';
    if (isPreferenceMode) return 'Override My Stored Preferences:';
    return 'Ad-hoc Criteria For This Podcast:';
  };

  const getCriteriaTooltipText = () => {
    if (currentIsUrlMode) {
        return "When using specific article URLs, the criteria section below is disabled and not applicable.";
    }
    if (isCategoryMode) {
        return "These fields act as overrides to the selected News Profile. Leave a field blank to use the profile's default for that field. Fill it to provide a specific value for this podcast generation only.";
    }
    if (isPreferenceMode) {
        return "These fields act as overrides to your stored User Preferences. Leave a field blank to use your stored preference for that field. Fill it to provide a specific value for this podcast generation only.";
    }
    return "Define all criteria for this ad-hoc podcast. These settings will be used only for this generation. Exclusion fields are not typically used in pure ad-hoc mode unless your backend specifically supports them without base preferences.";
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-4 sm:p-6 md:p-8 rounded-xl shadow-2xl space-y-6 max-w-2xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold text-center text-purple-400 mb-4 sm:mb-6">Create New Podcast</h2>
      
      {notification && (
        <div className="p-3 rounded-md flex items-start sm:items-center text-sm bg-red-700/30 text-red-300 border border-red-600">
          <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-0.5 sm:mt-0" /> 
          <span>{notification.message}</span>
        </div>
      )}

      <div className="space-y-4 p-3 sm:p-4 border border-gray-700 rounded-lg">
        <h3 className="text-base sm:text-lg font-semibold text-purple-300 mb-2">Content Source:</h3>
        
        <Checkbox
          name="specific_article_urls_toggle" 
          label="From Specific Article URLs"
          checked={currentIsUrlMode}
          onChange={() => {
            const newIsUrlMode = !currentIsUrlMode;
            if (newIsUrlMode) {
                setSelectedCategoryId(''); 
            }
            setFormData(prev => ({ 
              ...prev, 
              use_user_default_preferences: newIsUrlMode ? false : prev.use_user_default_preferences,
              specific_article_urls: newIsUrlMode ? [''] : [],
              predefined_category_id: newIsUrlMode ? undefined : prev.predefined_category_id,
            }));
          }}
        />
        {currentIsUrlMode && renderListInput('specific_article_urls', 'Article URLs', 'https://example.com/article', 'url', false)}

        <div className={`mt-3 ${currentIsUrlMode ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <label htmlFor="predefined_category" className="block text-sm font-medium text-purple-300 mb-1">
            Or Start with a News Profile
          </label>
          <Select
            id="predefined_category"
            name="predefined_category_select"
            value={selectedCategoryId}
            onChange={handleCategoryChange}
            options={[
              { value: '', label: isLoadingCategories ? 'Loading profiles...' : '-- Select a Profile (Optional) --' },
              ...(predefinedCategories || []).map(cat => ({ value: cat.id.toString(), label: cat.name })),
            ]}
            className="bg-gray-700 border-gray-600 w-full"
            disabled={currentIsUrlMode || isLoadingCategories}
          />
          {selectedCategoryId && predefinedCategories?.find(pc => pc.id.toString() === selectedCategoryId.toString())?.description && (
             <p className="text-xs text-gray-400 mt-1 pl-1">{predefinedCategories.find(pc => pc.id.toString() === selectedCategoryId.toString())?.description}</p>
          )}
        </div>

        <Checkbox
          name="use_user_default_preferences"
          label="Or Use My Stored Preferences (can be overridden below)"
          checked={formData.use_user_default_preferences ?? false}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const isChecking = e.target.checked;
            if (isChecking) {
                setSelectedCategoryId('');
            }
            setFormData(prev => ({
              ...prev,
              use_user_default_preferences: isChecking,
              specific_article_urls: isChecking ? [] : prev.specific_article_urls, 
              predefined_category_id: isChecking ? undefined : prev.predefined_category_id,
            }));
          }}
          disabled={currentIsUrlMode || isCategoryMode} 
          className={(currentIsUrlMode || isCategoryMode) ? 'opacity-50 cursor-not-allowed' : ''}
        />
      </div>

      {(!currentIsUrlMode) && (
        <div className={`p-3 sm:p-4 border border-gray-700 rounded-lg space-y-4 ${(isPreferenceMode || isCategoryMode) ? 'opacity-80' : ''}`}>
          <h3 className="text-base sm:text-lg font-semibold text-purple-300 flex items-center mb-3">
            <Newspaper size={20} className="mr-2 flex-shrink-0" /> 
            <span className="mr-1.5">{getCriteriaSectionTitle()}</span>
            <Tooltip text={getCriteriaTooltipText()} placement="right" className="max-w-xs">
              <Info size={18} className="text-gray-400 hover:text-gray-200 cursor-help flex-shrink-0" />
            </Tooltip>
          </h3>
          {renderListInput('request_topics', 'Topics', 'e.g., AI, Space Exploration', 'text')}
          {renderListInput('request_keywords', 'Keywords', 'e.g., Gemini Pro, SpaceX Starship', 'text')}
          {renderListInput('request_rss_urls', 'RSS Feed URLs', 'https://feed.example.com', 'url')}
          
          {(isPreferenceMode || isCategoryMode) && (
            <>
              {renderListInput('request_exclude_keywords', 'Exclude Keywords', 'e.g., rumors, gossip', 'text')}
              {renderListInput('request_exclude_source_domains', 'Exclude Domains', 'e.g., clickbait.com', 'text')}
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
        disabled={mutation.isPending || isLoadingCategories || isLoadingUserPreferences}
      >
        {mutation.isPending ? <Loader2 size={20} className="animate-spin mr-2" /> : <Wand2 size={20} className="mr-2" />} 
        Generate Podcast
      </Button>
    </form>
  );
};

export default PodcastGeneratorForm; 