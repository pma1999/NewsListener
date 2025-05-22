import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { generatePodcast } from '../../services/podcastService.js';
import { fetchPredefinedCategories } from '../../services/categoryService';
import type { PodcastGenerationRequest, PodcastGenerationResponse, UserPreference, PredefinedCategory } from '../../types/api';
import { Button } from '../common/Button.js';
import { Input } from '../common/Input.js';
import { Select } from '../common/Select.js';
import { Checkbox } from '../common/Checkbox.js';
import Tooltip from '../common/Tooltip';
import { 
  Loader2, AlertCircle, PlusCircle, XCircle, Wand2, KeyRound, Eye, EyeOff, Newspaper, Info,
  Link as LinkIcon, ListChecks, UserCog, FilePlus2, ChevronDown, ChevronUp // Added new icons
} from 'lucide-react';
import { fetchUserPreferences } from '../../services/preferenceService';
import { languageOptions, audioStyleOptions } from '../../config/options'; // Import from shared location

// Define language and audio style options (can be moved to a shared config if used elsewhere)
// const languageOptions = [
//   { value: 'en', label: 'English' },
//   { value: 'es', label: 'Español' },
//   { value: 'fr', label: 'Français' },
// ];

// const audioStyleOptions = [
//   { value: 'standard', label: 'Standard News Anchor' },
//   { value: 'engaging_storyteller', label: 'Engaging Storyteller' },
//   { value: 'quick_brief', label: 'Quick Brief' },
//   { value: 'investigative_deep_dive', label: 'Investigative Deep Dive' },
//   { value: 'calm_neutral_reporter', label: 'Calm Neutral Reporter' },
//   { value: 'professional_narrator', label: 'Professional Narrator' },
//   { value: 'enthusiastic_reporter', label: 'Enthusiastic Reporter' },
//   { value: 'news_anchor', label: 'Classic News Anchor' },
//   { value: 'documentary_style', label: 'Documentary Style' },
// ];

// --- Sub-components ---

interface GenerationModeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const GenerationModeCard: React.FC<GenerationModeCardProps> = ({ icon, title, description, isActive, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`
      p-4 sm:p-5 text-left rounded-lg border-2 transition-all duration-200 ease-in-out
      flex flex-col items-start space-y-2 h-full
      ${isActive ? 'border-purple-500 bg-purple-500/10 shadow-lg ring-2 ring-purple-500' : 'border-gray-600 hover:border-purple-400 bg-gray-700/50 hover:bg-gray-700'}
      ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-700 hover:border-gray-600' : 'cursor-pointer'}
    `}
  >
    <div className={`p-2 rounded-full ${isActive ? 'bg-purple-500 text-white' : 'bg-gray-600 text-purple-400'}`}>
      {icon}
    </div>
    <h3 className={`text-base sm:text-lg font-semibold ${isActive ? 'text-purple-300' : 'text-gray-200'}`}>{title}</h3>
    <p className="text-xs sm:text-sm text-gray-400 flex-grow">{description}</p>
    {isActive && <div className="w-full h-1 bg-purple-500 rounded-full mt-auto"></div>}
  </button>
);

interface FormSectionProps {
  title: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tooltip?: string;
  stepNumber?: number;
}

const FormSection: React.FC<FormSectionProps> = ({ title, children, className = '', tooltip, stepNumber }) => (
  <div className={`p-4 sm:p-5 border border-gray-700 rounded-lg bg-gray-800/30 shadow-md ${className}`}>
    <h3 className="text-lg sm:text-xl font-semibold text-purple-300 mb-3 sm:mb-4 flex items-center">
      {stepNumber && <span className="bg-purple-500 text-white rounded-full w-6 h-6 text-sm flex items-center justify-center mr-2.5 sm:mr-3">{stepNumber}</span>}
      {title}
      {tooltip && (
        <Tooltip text={tooltip} placement="right" className="ml-1.5 sm:ml-2">
          <Info size={18} className="text-gray-400 hover:text-gray-200 cursor-help flex-shrink-0" />
        </Tooltip>
      )}
    </h3>
    <div className="space-y-4">{children}</div>
  </div>
);

interface CollapsibleAdvancedSettingsProps {
  children: React.ReactNode;
  initiallyOpen?: boolean;
}

const CollapsibleAdvancedSettings: React.FC<CollapsibleAdvancedSettingsProps> = ({ children, initiallyOpen = false }) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  return (
    <div className="border border-gray-700 rounded-lg bg-gray-800/30 shadow-md">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 sm:p-4 text-left focus:outline-none"
      >
        <h3 className="text-base sm:text-lg font-semibold text-purple-300 flex items-center">
          <KeyRound size={20} className="mr-2 text-yellow-400" />
          Advanced Settings (Optional)
        </h3>
        {isOpen ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
      </button>
      {isOpen && <div className="p-3 sm:p-4 border-t border-gray-700 space-y-4">{children}</div>}
    </div>
  );
};

// --- Main Component ---

type GenerationMode = 'urls' | 'profile' | 'preferences' | 'adhoc';

interface PodcastGeneratorFormProps {
  onGenerationStart: (newsDigestId: number, initialStatus: string, message: string) => void;
}

const PodcastGeneratorForm: React.FC<PodcastGeneratorFormProps> = ({ onGenerationStart }) => {
  const [currentMode, setCurrentMode] = useState<GenerationMode | null>(null);
  const [formData, setFormData] = useState<Partial<PodcastGenerationRequest>>({
    language: 'en',
    audio_style: 'standard',
    force_regenerate: false,
    use_user_default_preferences: false,
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
  const [defaultsAppliedForMode, setDefaultsAppliedForMode] = useState<GenerationMode | null>(null);

  const { data: userPreferences, isLoading: isLoadingUserPreferences } = 
    useQuery<UserPreference, Error>({
      queryKey: ['userPreferencesForGeneratorForm'],
      queryFn: fetchUserPreferences,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      enabled: currentMode === 'preferences', // Only fetch if this mode could be active
    });

  const { data: predefinedCategories, isLoading: isLoadingCategories } = 
    useQuery<PredefinedCategory[], Error>({
      queryKey: ['predefinedCategories'],
      queryFn: fetchPredefinedCategories,
      staleTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      enabled: currentMode === 'profile', // Only fetch if this mode could be active
    });

  const resetFormForMode = useCallback((newMode: GenerationMode | null) => {
    setFormData({
      // Global defaults
      language: 'en',
      audio_style: 'standard',
      force_regenerate: false,
      user_openai_api_key: '',
      user_google_api_key: '',
      // Mode-specific resets
      use_user_default_preferences: newMode === 'preferences',
      specific_article_urls: newMode === 'urls' ? [''] : [],
      predefined_category_id: undefined,
      request_topics: [],
      request_keywords: [],
      request_rss_urls: [],
      request_exclude_keywords: [],
      request_exclude_source_domains: [],
    });
    setSelectedCategoryId('');
    setDefaultsAppliedForMode(null);
    setNotification(null);
  }, []);

  const handleModeChange = useCallback((newMode: GenerationMode) => {
    setCurrentMode(newMode);
    resetFormForMode(newMode);
  }, [resetFormForMode]);
  
  // Effect for 'profile' mode: Apply category defaults when selected
  useEffect(() => {
    if (currentMode === 'profile' && selectedCategoryId && predefinedCategories && defaultsAppliedForMode !== 'profile') {
      const selectedCat = predefinedCategories.find(cat => cat.id === selectedCategoryId);
      if (selectedCat) {
        setFormData(prev => ({
          ...prev,
          language: selectedCat.language || prev.language || 'en',
          audio_style: selectedCat.audio_style || prev.audio_style || 'standard',
          request_topics: selectedCat.topics || [],
          request_keywords: selectedCat.keywords || [],
          request_rss_urls: selectedCat.rss_urls || [],
          request_exclude_keywords: selectedCat.exclude_keywords || [],
          request_exclude_source_domains: selectedCat.exclude_source_domains || [],
          predefined_category_id: selectedCat.id,
        }));
        setDefaultsAppliedForMode('profile');
      }
    }
  }, [currentMode, selectedCategoryId, predefinedCategories, defaultsAppliedForMode]);

  // Effect for 'preferences' mode: Apply user preference defaults
  useEffect(() => {
    if (currentMode === 'preferences' && userPreferences && !isLoadingUserPreferences && defaultsAppliedForMode !== 'preferences') {
      setFormData(prev => ({
        ...prev,
        language: userPreferences.default_language || prev.language || 'en',
        audio_style: userPreferences.default_audio_style || prev.audio_style || 'standard',
        request_topics: userPreferences.preferred_topics || [],
        request_keywords: userPreferences.custom_keywords || [],
        request_rss_urls: userPreferences.include_source_rss_urls || [],
        request_exclude_keywords: userPreferences.exclude_keywords || [],
        request_exclude_source_domains: userPreferences.exclude_source_domains || [],
        use_user_default_preferences: true,
      }));
      setDefaultsAppliedForMode('preferences');
    } else if (currentMode === 'preferences' && !userPreferences && !isLoadingUserPreferences && defaultsAppliedForMode !== 'preferences') {
      // No preferences found, ensure form is clean for ad-hoc like behavior within preference mode if desired
      // or just use global defaults which resetFormForMode already did.
      setFormData(prev => ({ ...prev, use_user_default_preferences: true })); // Ensure this flag is set
      setDefaultsAppliedForMode('preferences'); // Mark as "applied" to prevent re-runs
    }
  }, [currentMode, userPreferences, isLoadingUserPreferences, defaultsAppliedForMode]);


  const mutation = useMutation<PodcastGenerationResponse, Error, PodcastGenerationRequest>({
    mutationFn: generatePodcast,
    onSuccess: (data) => {
      onGenerationStart(data.news_digest_id, data.initial_status, data.message);
      setNotification(null);
      // Potentially reset form or parts of it after successful submission
      // For now, keep it as is, user can select a new mode or regenerate.
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
     // If user changes language/audio style in profile/pref mode, it's an override.
    if ((currentMode === 'profile' || currentMode === 'preferences') && (name === 'language' || name === 'audio_style')) {
        // This indicates user is actively changing, defaults are considered applied.
    }
  };
  
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryIdStr = e.target.value;
    const newSelectedCategoryId = categoryIdStr ? parseInt(categoryIdStr) : '';
    setSelectedCategoryId(newSelectedCategoryId);
    setDefaultsAppliedForMode(null); // Allow effect to re-apply defaults for the new category
    if (!newSelectedCategoryId) { // If "-- Select --" is chosen
        resetFormForMode('profile'); // Reset to base profile mode state
        setFormData(prev => ({...prev, predefined_category_id: undefined}));
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
    if (!currentMode) {
      setNotification({ type: 'error', message: 'Please select a generation mode first.'});
      return;
    }
    if (!formData.language || !formData.audio_style) {
      setNotification({ type: 'error', message: 'Language and Audio Style are required.'});
      return;
    }
    
    if (currentMode === 'urls' && (formData.specific_article_urls || []).filter(u => u.trim() !== '').length === 0) {
        setNotification({ type: 'error', message: 'Please provide at least one article URL.'});
        return;
    }
    if (currentMode === 'profile' && !selectedCategoryId) {
        setNotification({ type: 'error', message: 'Please select a News Profile.'});
        return;
    }

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
        
        request_topics: formTopics.length > 0 ? formTopics : null,
        request_keywords: formKeywords.length > 0 ? formKeywords : null,
        request_rss_urls: formRssUrls.length > 0 ? formRssUrls : null,
        request_exclude_keywords: formExcludeKeywords.length > 0 ? formExcludeKeywords : null,
        request_exclude_source_domains: formExcludeSourceDomains.length > 0 ? formExcludeSourceDomains : null,
    };

    if (currentMode === 'urls') {
        finalPayload.specific_article_urls = (formData.specific_article_urls || []).filter(u => u.trim() !== '');
        // For URL mode, typically other criteria are nullified as they don't apply
        finalPayload.request_topics = null;
        finalPayload.request_keywords = null;
        finalPayload.request_rss_urls = null;
        finalPayload.request_exclude_keywords = null;
        finalPayload.request_exclude_source_domains = null;
    } else if (currentMode === 'profile') {
        finalPayload.predefined_category_id = selectedCategoryId ? Number(selectedCategoryId) : null;
        // Criteria fields are used as overrides or direct values
    } else if (currentMode === 'preferences') {
        finalPayload.use_user_default_preferences = true;
        // Criteria fields are used as overrides
    } else if (currentMode === 'adhoc') {
        // Criteria fields are used as primary inputs
    }
    
    mutation.mutate(finalPayload);
  };

  const renderListInput = (
    fieldKey: keyof PodcastGenerationRequest,
    label: string,
    placeholder: string,
    inputType: 'text' | 'url' = 'text',
    disabledConditionOverride?: boolean // This prop remains for explicit disabling by caller
  ) => {
    // Determine if the field should be disabled based on the current mode
    let isModeDisabled = false;
    const isUrlListField = fieldKey === 'specific_article_urls';
    const isCriteriaField = [
      'request_topics', 'request_keywords', 'request_rss_urls', 
      'request_exclude_keywords', 'request_exclude_source_domains'
    ].includes(fieldKey as string);

    if (currentMode === 'urls') {
      if (isCriteriaField) isModeDisabled = true; // Disable criteria fields in URL mode
    }
    if (isUrlListField && currentMode !== 'urls') {
      isModeDisabled = true; // Disable URL list if not in URL mode
    }
    
    const isEffectivelyDisabled = disabledConditionOverride || isModeDisabled;

    return (
    <div className={`mb-4 ${isEffectivelyDisabled ? 'opacity-60' : ''}`}>
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

  const getDynamicCriteriaTitle = (): React.ReactNode => {
    const baseTitle = "Podcast Criteria";
    let prefix = "";
    if (currentMode === 'profile') prefix = "Override Profile's ";
    if (currentMode === 'preferences') prefix = "Override Preference ";
    if (currentMode === 'adhoc') prefix = "Define Ad-hoc ";
    return (
        <>
            <Newspaper size={20} className="mr-2 flex-shrink-0" />
            <span>{prefix}{baseTitle}</span>
        </>
    );
  };

  const getDynamicCriteriaTooltip = () => {
    if (currentMode === 'urls') {
        return "Criteria fields are not applicable when generating from specific article URLs.";
    }
    if (currentMode === 'profile') {
        return "These fields act as overrides to the selected News Profile. Leave a field blank to use the profile's default for that field. Fill it to provide a specific value for this podcast generation only.";
    }
    if (currentMode === 'preferences') {
        return "These fields act as overrides to your stored User Preferences. Leave a field blank to use your stored preference for that field. Fill it to provide a specific value for this podcast generation only.";
    }
    return "Define all criteria for this ad-hoc podcast. These settings will be used only for this generation.";
  };

  const modeCards: { mode: GenerationMode; icon: React.ReactNode; title: string; description: string; disabled?: boolean }[] = [
    { 
      mode: 'urls', 
      icon: <LinkIcon size={24} />, 
      title: 'From Specific URLs', 
      description: 'Provide one or more article URLs to generate a podcast directly from them.' 
    },
    { 
      mode: 'profile', 
      icon: <ListChecks size={24} />, 
      title: 'Using a News Profile', 
      description: 'Select a predefined News Profile with curated topics, sources, and settings.',
      disabled: isLoadingCategories
    },
    { 
      mode: 'preferences', 
      icon: <UserCog size={24} />, 
      title: 'Based on My Preferences', 
      description: 'Use your saved default news preferences, language, and audio style.',
      disabled: isLoadingUserPreferences
    },
    { 
      mode: 'adhoc', 
      icon: <FilePlus2 size={24} />, 
      title: 'Start Fresh (Ad-hoc)', 
      description: 'Manually define all criteria for a one-time custom podcast generation.' 
    },
  ];
  
  const mainSubmitButtonDisabled = !currentMode || mutation.isPending || (currentMode === 'profile' && isLoadingCategories) || (currentMode === 'preferences' && isLoadingUserPreferences);

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-4 sm:p-6 md:p-8 rounded-xl shadow-2xl space-y-6 max-w-3xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-center text-purple-400 mb-6 sm:mb-8">
        Craft Your News Podcast
      </h2>
      
      {notification && (
        <div className={`p-3 rounded-md flex items-start sm:items-center text-sm border ${notification.type === 'error' ? 'bg-red-700/30 text-red-300 border-red-600' : 'bg-blue-700/30 text-blue-300 border-blue-600'}`}>
          <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-0.5 sm:mt-0" /> 
          <span>{notification.message}</span>
        </div>
      )}

      {/* Step 1: Mode Selection */}
      <FormSection title="Choose Generation Mode" className="bg-gray-850/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {modeCards.map(card => (
            <GenerationModeCard
              key={card.mode}
              icon={card.icon}
              title={card.title}
              description={card.description}
              isActive={currentMode === card.mode}
              onClick={() => handleModeChange(card.mode)}
              disabled={card.disabled}
            />
          ))}
        </div>
      </FormSection>

      {/* Conditional Sections based on Mode */}
      {currentMode && (
        <>
          {/* Section for URL Inputs or Profile Selection */}
          {currentMode === 'urls' && (
            <FormSection title="Article URLs" stepNumber={1} tooltip="Enter direct URLs to news articles.">
              {renderListInput('specific_article_urls', 'Article URLs', 'https://example.com/article', 'url')}
            </FormSection>
          )}

          {currentMode === 'profile' && (
            <FormSection title="Select News Profile" stepNumber={1} tooltip="Choose a pre-configured profile as a starting point.">
              <Select
                id="predefined_category_id"
                name="predefined_category_id" // Ensure name matches state for handleInputChange if used, but here it's custom
                value={selectedCategoryId}
                onChange={handleCategoryChange}
                options={[
                  { value: '', label: isLoadingCategories ? 'Loading profiles...' : '-- Select a Profile --' },
                  ...(predefinedCategories || []).map(cat => ({ value: cat.id.toString(), label: cat.name })),
                ]}
                className="bg-gray-700 border-gray-600 w-full"
                disabled={isLoadingCategories}
              />
              {selectedCategoryId && predefinedCategories?.find(pc => pc.id.toString() === selectedCategoryId.toString())?.description && (
                 <p className="text-xs sm:text-sm text-gray-400 mt-1.5 pl-1 italic">{predefinedCategories.find(pc => pc.id.toString() === selectedCategoryId.toString())?.description}</p>
              )}
            </FormSection>
          )}
          
          {currentMode === 'preferences' && (
             <FormSection title="Using Your Preferences" stepNumber={1} tooltip="Your saved preferences for content, language, and audio will be applied. You can override them in the sections below.">
                {isLoadingUserPreferences && <div className="flex items-center text-gray-400"><Loader2 size={18} className="animate-spin mr-2" />Loading your preferences...</div>}
                {!isLoadingUserPreferences && !userPreferences && <div className="text-orange-400">Could not load user preferences. Using global defaults.</div>}
                {!isLoadingUserPreferences && userPreferences && <div className="text-green-400">Your preferences are loaded and applied.</div>}
             </FormSection>
          )}

          {currentMode === 'adhoc' && (
            <FormSection title="Podcast Details" stepNumber={1} tooltip="Specify all details for this one-time podcast.">
              <p className="text-sm text-gray-400">You are in ad-hoc mode. Please define all criteria for your podcast below.</p>
            </FormSection>
          )}


          {/* Criteria Section (Common for profile, preferences, adhoc) */}
          {currentMode !== 'urls' && (
            <FormSection title={getDynamicCriteriaTitle()} stepNumber={2} tooltip={getDynamicCriteriaTooltip()}>
              {renderListInput('request_topics', 'Topics', 'e.g., AI, Space Exploration')}
              {renderListInput('request_keywords', 'Keywords', 'e.g., Gemini Pro, SpaceX Starship')}
              {renderListInput('request_rss_urls', 'RSS Feed URLs', 'https://feed.example.com', 'url')}
              
              {/* Exclusions are relevant for profile, preferences, and potentially adhoc */}
              <h4 className="text-sm font-medium text-purple-300 mt-3 mb-1.5 pt-3 border-t border-gray-700/50">Exclusions (Optional):</h4>
              {renderListInput('request_exclude_keywords', 'Exclude Keywords', 'e.g., rumors, gossip')}
              {renderListInput('request_exclude_source_domains', 'Exclude Source Domains', 'e.g., clickbait.com', 'url')}
            </FormSection>
          )}

          {/* Output Settings Section (Common for all modes) */}
          <FormSection title="Output Settings" stepNumber={currentMode === 'urls' ? 2 : 3}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-purple-300 mb-1">Language</label>
                <Select id="language" name="language" value={formData.language} onChange={handleInputChange} options={languageOptions} className="bg-gray-700 border-gray-600" />
              </div>
              <div>
                <label htmlFor="audio_style" className="block text-sm font-medium text-purple-300 mb-1">Audio Style</label>
                <Select id="audio_style" name="audio_style" value={formData.audio_style} onChange={handleInputChange} options={audioStyleOptions} className="bg-gray-700 border-gray-600" />
              </div>
            </div>
          </FormSection>

          {/* Advanced Settings (Collapsible, Common for all modes) */}
          <CollapsibleAdvancedSettings>
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
              <label htmlFor="user_google_api_key" className="block text-sm font-medium text-purple-300 mb-1">Google API Key (for News/Content if applicable)</label>
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
            <Checkbox
              name="force_regenerate"
              label="Force Regenerate (ignore any cached version)"
              checked={formData.force_regenerate ?? false}
              onChange={handleInputChange}
              className="text-sm mt-3"
            />
          </CollapsibleAdvancedSettings>
        </>
      )}

      {/* Submit Button - visible once a mode is chosen */}
      {currentMode && (
        <Button 
          type="submit" 
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 sm:py-3 mt-4 sm:mt-6 text-base sm:text-lg"
          disabled={mainSubmitButtonDisabled}
        >
          {mutation.isPending ? <Loader2 size={20} className="animate-spin mr-2" /> : <Wand2 size={20} className="mr-2" />} 
          Generate Podcast
        </Button>
      )}
    </form>
  );
};

export default PodcastGeneratorForm; 