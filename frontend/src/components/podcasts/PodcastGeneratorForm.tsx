import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { generatePodcast } from '../../services/podcastService.js';
import type { PodcastGenerationRequest, PodcastGenerationResponse } from '../../types/api';
import { Button } from '../common/Button.js';
import { Input } from '../common/Input.js';
import { Select } from '../common/Select.js';
import { Checkbox } from '../common/Checkbox.js'; // Assuming Checkbox component exists or will be created
import { Loader2, AlertCircle, PlusCircle, XCircle, Wand2, KeyRound, Eye, EyeOff } from 'lucide-react';

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
  onGenerationStart: (newsDigestId: number) => void;
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

  const mutation = useMutation<PodcastGenerationResponse, Error, PodcastGenerationRequest>({
    mutationFn: generatePodcast,
    onSuccess: (data) => {
      onGenerationStart(data.news_digest_id);
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

    const payload: PodcastGenerationRequest = {
      use_user_default_preferences: formData.use_user_default_preferences ?? true,
      language: formData.language,
      audio_style: formData.audio_style,
      force_regenerate: formData.force_regenerate ?? false,
      user_openai_api_key: formData.user_openai_api_key?.trim() ? formData.user_openai_api_key.trim() : null,
      user_google_api_key: formData.user_google_api_key?.trim() ? formData.user_google_api_key.trim() : null,
      specific_article_urls: (formData.specific_article_urls || []).filter(u => u.trim() !== ''),
      request_topics: formData.use_user_default_preferences ? (formData.request_topics || []).filter(t => t.trim() !== '') : (formData.request_topics || []).filter(t => t.trim() !== ''),
      request_keywords: formData.use_user_default_preferences ? (formData.request_keywords || []).filter(k => k.trim() !== '') : (formData.request_keywords || []).filter(k => k.trim() !== ''),
      request_rss_urls: formData.use_user_default_preferences ? (formData.request_rss_urls || []).filter(r => r.trim() !== '') : (formData.request_rss_urls || []).filter(r => r.trim() !== ''),
      request_exclude_keywords: formData.use_user_default_preferences ? (formData.request_exclude_keywords || []).filter(e => e.trim() !== '') : undefined,
      request_exclude_source_domains: formData.use_user_default_preferences ? (formData.request_exclude_source_domains || []).filter(d => d.trim() !== '') : undefined,
    };
    
    // If not using default preferences, ensure ad-hoc fields are primary
    if (!payload.use_user_default_preferences) {
        payload.request_topics = (formData.request_topics || []).filter(t => t.trim() !== '');
        payload.request_keywords = (formData.request_keywords || []).filter(k => k.trim() !== '');
        payload.request_rss_urls = (formData.request_rss_urls || []).filter(r => r.trim() !== '');
        // Exclusions are not typically set for pure ad-hoc if not overriding, so they might remain undefined
        // or you might decide to include them if the UI allows for ad-hoc exclusions.
    }

    // Clear specific_article_urls if use_user_default_preferences or ad-hoc mode is active
    if (formData.use_user_default_preferences || (!formData.use_user_default_preferences && (!formData.specific_article_urls || formData.specific_article_urls.length === 0))) {
      if ((formData.specific_article_urls?.length ?? 0) > 0) { /* only clear if urls are not the primary source */ }
      else { payload.specific_article_urls = null; }
    } else {
        // If specific_article_urls is the primary source, nullify preference-based fields for clarity in the backend
        payload.request_topics = null;
        payload.request_keywords = null;
        payload.request_rss_urls = null;
        payload.request_exclude_keywords = null;
        payload.request_exclude_source_domains = null;
    }


    mutation.mutate(payload);
  };

  const renderListInput = (
    field: keyof PodcastGenerationRequest,
    label: string,
    placeholder: string,
    inputType: 'text' | 'url' = 'text',
    disabledCondition?: boolean
  ) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-purple-300 mb-1">{label}</label>
      {(formData[field] as string[] || []).map((item, index) => (
        <div key={index} className="flex items-center mb-2">
          <Input
            type={inputType}
            value={item}
            onChange={(e) => handleListChange(field, index, e.target.value)}
            placeholder={placeholder}
            className="flex-grow bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 disabled:opacity-50"
            disabled={disabledCondition}
          />
          <Button 
            variant="icon" 
            onClick={() => removeListItem(field, index)} 
            className="ml-2 text-red-500 hover:text-red-400 p-2 disabled:opacity-50"
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
        className="mt-1 text-purple-400 border-purple-400 hover:bg-purple-500/20 disabled:opacity-50"
        disabled={disabledCondition}
      >
        <PlusCircle size={18} className="mr-2" /> Add {label.slice(0,-1)}
      </Button>
    </div>
  );

  const isUrlMode = (formData.specific_article_urls?.length ?? 0) > 0;
  const isPreferenceOverrideMode = formData.use_user_default_preferences && !isUrlMode;

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl space-y-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-center text-purple-400 mb-6">Create New Podcast</h2>
      
      {notification && (
        <div className="p-3 rounded-md flex items-center text-sm bg-red-700/30 text-red-300 border border-red-600">
          <AlertCircle size={20} className="mr-2 flex-shrink-0" /> {notification.message}
        </div>
      )}

      {/* Source Selection Logic */}
      <div className="space-y-3 p-4 border border-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-purple-300 mb-2">Content Source:</h3>
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
        <div className={`p-4 border border-gray-700 rounded-lg space-y-4 ${isPreferenceOverrideMode ? 'opacity-70' : ''}`}>
          <h3 className="text-lg font-semibold text-purple-300">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-700">
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
      <div className="p-4 border border-gray-700 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold text-purple-300 flex items-center">
          <KeyRound size={20} className="mr-2 text-yellow-400" /> Optional API Keys
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          If you provide your own API keys, they will be used for this generation request only and will not be stored.
          This will override any system-configured keys for this request.
        </p>
        <div>
          <label htmlFor="user_openai_api_key" className="block text-sm font-medium text-purple-300 mb-1">OpenAI API Key (for TTS)</label>
          <div className="relative">
            <Input
              id="user_openai_api_key"
              name="user_openai_api_key"
              type={showOpenAiKey ? 'text' : 'password'}
              value={formData.user_openai_api_key || ''}
              onChange={handleInputChange}
              placeholder="sk-..."
              className="bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-500 pr-10"
            />
            <Button
              type="button"
              variant="icon"
              onClick={() => setShowOpenAiKey(!showOpenAiKey)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-200"
              aria-label={showOpenAiKey ? "Hide OpenAI API Key" : "Show OpenAI API Key"}
            >
              {showOpenAiKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </Button>
          </div>
        </div>
        <div>
          <label htmlFor="user_google_api_key" className="block text-sm font-medium text-purple-300 mb-1">Google API Key (for Gemini)</label>
           <div className="relative">
            <Input
              id="user_google_api_key"
              name="user_google_api_key"
              type={showGoogleKey ? 'text' : 'password'}
              value={formData.user_google_api_key || ''}
              onChange={handleInputChange}
              placeholder="AIzaSy..."
              className="bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-500 pr-10"
            />
            <Button
              type="button"
              variant="icon"
              onClick={() => setShowGoogleKey(!showGoogleKey)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-200"
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
      />

      <Button 
        type="submit" 
        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 mt-2"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? <Loader2 size={20} className="animate-spin mr-2" /> : <Wand2 size={20} className="mr-2" />} 
        Generate Podcast
      </Button>
    </form>
  );
};

export default PodcastGeneratorForm; 