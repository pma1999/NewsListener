import React, { useState, useEffect } from 'react';
import type { PredefinedCategory, PodcastGenerationRequest, UserPreference } from '@/types/api';
import { Button } from '@/components/common/Button';
import { Select } from '@/components/common/Select';
import { Input } from '@/components/common/Input';
import { Checkbox } from '@/components/common/Checkbox';
import { languageOptions, audioStyleOptions } from '@/config/options';
import { X, Loader2, AlertTriangle, KeyRound } from 'lucide-react';
import CollapsibleSection from '@/components/common/CollapsibleSection';
import ApiKeyInputs from '@/components/common/ApiKeyInputs';

interface GenerateWithProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PredefinedCategory | null;
  userDefaults?: Partial<Pick<UserPreference, 'default_language' | 'default_audio_style'>>;
  onGenerate: (payload: PodcastGenerationRequest) => void;
  isGenerating: boolean;
}

const GenerateWithProfileModal: React.FC<GenerateWithProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  userDefaults,
  onGenerate,
  isGenerating,
}) => {
  const [language, setLanguage] = useState<string>('en');
  const [audioStyle, setAudioStyle] = useState<string>('standard');
  const [additionalKeywords, setAdditionalKeywords] = useState<string>('');
  const [forceRegenerate, setForceRegenerate] = useState<boolean>(false);
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [googleApiKey, setGoogleApiKey] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && profile) {
      setLanguage(userDefaults?.default_language || 'en');
      setAudioStyle(userDefaults?.default_audio_style || 'standard');
      setAdditionalKeywords('');
      setForceRegenerate(false);
      setOpenaiApiKey('');
      setGoogleApiKey('');
      setError(null);
    }
  }, [isOpen, profile, userDefaults]);

  if (!isOpen || !profile) return null;

  const handleGenerate = () => {
    setError(null);
    const keywordsArray = additionalKeywords.split(',').map(kw => kw.trim()).filter(kw => kw !== '');
    
    // Combine profile keywords with additional keywords, ensuring no duplicates and handling nulls
    const baseKeywords = profile.keywords || [];
    const combinedKeywords = Array.from(new Set([...baseKeywords, ...keywordsArray]));

    const payload: PodcastGenerationRequest = {
      predefined_category_id: profile.id,
      language: language,
      audio_style: audioStyle,
      request_keywords: combinedKeywords.length > 0 ? combinedKeywords : null,
      // Pass through other profile attributes directly as defaults for the request
      request_topics: profile.topics || null,
      request_rss_urls: profile.rss_urls || null, 
      request_exclude_keywords: profile.exclude_keywords || null,
      request_exclude_source_domains: profile.exclude_source_domains || null,
      force_regenerate: forceRegenerate,
      use_user_default_preferences: false, // Explicitly false when using a profile with modal overrides
      specific_article_urls: null, // Not applicable in this modal
      
      // Add API keys
      user_openai_api_key: openaiApiKey.trim() || null,
      user_google_api_key: googleApiKey.trim() || null,
    };
    onGenerate(payload);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out" onClick={onClose}>
      <div className="bg-gray-800 p-5 sm:p-6 rounded-xl shadow-2xl w-full max-w-lg transform transition-all duration-300 ease-in-out scale-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-700">
          <h2 className="text-xl sm:text-2xl font-semibold text-purple-300">Generate with: {profile.name}</h2>
          <button 
            onClick={onClose} 
            disabled={isGenerating}
            className="p-1.5 text-gray-400 hover:text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Close modal"
          >
            <X size={22} />
          </button>
        </div>

        {error && (
          <div role="alert" className="bg-red-900/80 border border-red-700 text-red-300 p-3 rounded-md mb-4 text-sm flex items-start">
            <AlertTriangle size={18} className="mr-2 shrink-0 mt-0.5 text-red-400"/>
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 sm:space-y-5 max-h-[70vh] overflow-y-auto pr-2">
          <p className="text-sm text-gray-400 italic">
            {profile.description || "Customize your podcast generation settings below."}
          </p>

          <div>
            <Select
              label="Language"
              name="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              options={languageOptions}
              className="w-full bg-gray-700 border-gray-600"
              disabled={isGenerating}
            />
          </div>

          <div>
            <Select
              label="Audio Style"
              name="audioStyle"
              value={audioStyle}
              onChange={(e) => setAudioStyle(e.target.value)}
              options={audioStyleOptions}
              className="w-full bg-gray-700 border-gray-600"
              disabled={isGenerating}
            />
          </div>

          <div>
            <Input
              label="Refine with Keywords (optional)"
              name="additionalKeywords"
              type="text"
              placeholder="e.g., AI ethics, renewable energy (comma-separated)"
              value={additionalKeywords}
              onChange={(e) => setAdditionalKeywords(e.target.value)}
              className="w-full bg-gray-700 border-gray-600"
              disabled={isGenerating}
            />
            <p className="text-xs text-gray-500 mt-1">Add keywords to narrow down or focus the content from this profile. Separated by commas.</p>
          </div>

          <div className="pt-2">
            <Checkbox
              name="forceRegenerate"
              label="Force Regenerate (ignore any cached version)"
              checked={forceRegenerate}
              onChange={(e) => setForceRegenerate(e.target.checked)}
              disabled={isGenerating}
              className="text-sm"
            />
          </div>
          
          {/* Advanced Settings Section */}
          <CollapsibleSection
            title="Advanced Settings (Optional)"
            icon={<KeyRound size={20} />}
            className="mt-4"
          >
            <ApiKeyInputs 
              openaiApiKey={openaiApiKey}
              googleApiKey={googleApiKey}
              onOpenaiApiKeyChange={setOpenaiApiKey}
              onGoogleApiKeyChange={setGoogleApiKey}
              disabled={isGenerating}
            />
          </CollapsibleSection>
        </div>

        <div className="mt-6 pt-5 border-t border-gray-700 flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-2 sm:space-y-0">
          <Button 
            type="button"
            variant="secondary"
            onClick={onClose} 
            disabled={isGenerating}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center"
          >
            {isGenerating ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...</>
            ) : (
              'Generate Podcast'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GenerateWithProfileModal; 