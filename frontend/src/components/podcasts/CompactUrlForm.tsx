import React, { useState } from 'react';
import type { PodcastGenerationRequest } from '@/types/api';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Checkbox } from '@/components/common/Checkbox';
import { languageOptions, audioStyleOptions } from '@/config/options';
import { Loader2, AlertCircle, PlusCircle, XCircle, LinkIcon, KeyRound } from 'lucide-react';
import CollapsibleSection from '@/components/common/CollapsibleSection';
import ApiKeyInputs from '@/components/common/ApiKeyInputs';

interface CompactUrlFormProps {
  onGenerate: (payload: PodcastGenerationRequest) => void;
  isGenerating: boolean;
}

const CompactUrlForm: React.FC<CompactUrlFormProps> = ({ onGenerate, isGenerating }) => {
  const [specificArticleUrls, setSpecificArticleUrls] = useState<string[]>(['']);
  const [language, setLanguage] = useState<string>('en');
  const [audioStyle, setAudioStyle] = useState<string>('standard');
  const [forceRegenerate, setForceRegenerate] = useState<boolean>(false);
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [googleApiKey, setGoogleApiKey] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...specificArticleUrls];
    newUrls[index] = value;
    setSpecificArticleUrls(newUrls);
  };

  const addUrlInput = () => {
    setSpecificArticleUrls([...specificArticleUrls, '']);
  };

  const removeUrlInput = (index: number) => {
    const newUrls = specificArticleUrls.filter((_, i) => i !== index);
    // Ensure at least one input field remains if it's the last one being removed and it's empty
    if (newUrls.length === 0 && specificArticleUrls[index] === '') {
      setSpecificArticleUrls(['']);
    } else {
      setSpecificArticleUrls(newUrls.length > 0 ? newUrls : ['']);
    }
  };

  const handleSubmit = () => {
    setError(null);
    const cleanedUrls = specificArticleUrls.map(url => url.trim()).filter(url => url !== '');
    if (cleanedUrls.length === 0) {
      setError('Please provide at least one article URL.');
      return;
    }

    const payload: PodcastGenerationRequest = {
      specific_article_urls: cleanedUrls,
      language,
      audio_style: audioStyle,
      force_regenerate: forceRegenerate,
      use_user_default_preferences: false, // Not using stored preferences for direct URL input
      // Other fields are not applicable or should be null for URL-based generation
      predefined_category_id: null,
      request_topics: null,
      request_keywords: null,
      request_rss_urls: null,
      request_exclude_keywords: null,
      request_exclude_source_domains: null,
      // Include API keys
      user_openai_api_key: openaiApiKey.trim() || null,
      user_google_api_key: googleApiKey.trim() || null,
    };
    onGenerate(payload);
  };

  return (
    <div className="p-4 sm:p-5 mt-6 border border-gray-700 rounded-lg bg-gray-800/60 shadow-lg">
      <h3 className="text-lg sm:text-xl font-semibold text-purple-300 mb-3 sm:mb-4 flex items-center">
        <LinkIcon size={20} className="mr-2 text-yellow-400" />
        Generate from Specific Article URLs
      </h3>
      
      {error && (
        <div role="alert" className="bg-red-900/80 border border-red-700 text-red-300 p-3 rounded-md mb-4 text-sm flex items-start">
          <AlertCircle size={18} className="mr-2 shrink-0 mt-0.5 text-red-400"/>
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-purple-300 mb-1.5">Article URLs</label>
          {specificArticleUrls.map((url, index) => (
            <div key={index} className="flex items-center mb-2">
              <Input
                type="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => handleUrlChange(index, e.target.value)}
                className="flex-grow bg-gray-700 border-gray-600 mr-2"
                disabled={isGenerating}
              />
              <Button 
                variant="icon" 
                onClick={() => removeUrlInput(index)} 
                className="text-red-500 hover:text-red-400 p-2 disabled:opacity-50"
                aria-label="Remove URL"
                disabled={isGenerating || (specificArticleUrls.length === 1 && url === '')}
              >
                <XCircle size={20} />
              </Button>
            </div>
          ))}
          <Button 
            variant="outline" 
            onClick={addUrlInput} 
            className="mt-1 text-sm text-purple-400 border-purple-400 hover:bg-purple-500/20 disabled:opacity-50"
            disabled={isGenerating}
          >
            <PlusCircle size={18} className="mr-2" /> Add Another URL
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              label="Language"
              name="language_url_form"
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
              name="audioStyle_url_form"
              value={audioStyle}
              onChange={(e) => setAudioStyle(e.target.value)}
              options={audioStyleOptions}
              className="w-full bg-gray-700 border-gray-600"
              disabled={isGenerating}
            />
          </div>
        </div>
        <div>
            <Checkbox
              name="forceRegenerate_url_form"
              label="Force Regenerate (ignore cache)"
              checked={forceRegenerate}
              onChange={(e) => setForceRegenerate(e.target.checked)}
              disabled={isGenerating}
              className="text-sm mt-1"
            />
        </div>

        {/* Advanced Settings Section */}
        <CollapsibleSection
          title="Advanced Settings (Optional)"
          icon={<KeyRound size={20} />}
        >
          <ApiKeyInputs 
            openaiApiKey={openaiApiKey}
            googleApiKey={googleApiKey}
            onOpenaiApiKeyChange={setOpenaiApiKey}
            onGoogleApiKeyChange={setGoogleApiKey}
            disabled={isGenerating}
          />
        </CollapsibleSection>

        <Button 
          type="button"
          onClick={handleSubmit}
          disabled={isGenerating || specificArticleUrls.every(url => url.trim() === '')}
          className="w-full mt-3 bg-yellow-600 hover:bg-yellow-700 text-white flex items-center justify-center py-2.5"
        >
          {isGenerating ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...</>
          ) : (
            'Generate from URLs'
          )}
        </Button>
      </div>
    </div>
  );
};

export default CompactUrlForm; 