import React, { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { Eye, EyeOff } from 'lucide-react';

interface ApiKeyInputsProps {
  openaiApiKey: string;
  googleApiKey: string;
  onOpenaiApiKeyChange: (value: string) => void;
  onGoogleApiKeyChange: (value: string) => void;
  disabled?: boolean;
}

const ApiKeyInputs: React.FC<ApiKeyInputsProps> = ({
  openaiApiKey,
  googleApiKey,
  onOpenaiApiKeyChange,
  onGoogleApiKeyChange,
  disabled = false
}) => {
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);

  return (
    <>
      <p className="text-xs sm:text-sm text-gray-400 mb-3">
        If you provide your own API keys, they will be used for this generation request only and will not be stored.
        This will override any system-configured keys for this request.
      </p>
      <div className="space-y-4">
        <div>
          <label htmlFor="user_openai_api_key" className="block text-sm font-medium text-purple-300 mb-1">OpenAI API Key (for TTS)</label>
          <div className="relative flex items-center">
            <Input
              id="user_openai_api_key"
              name="user_openai_api_key"
              type={showOpenAiKey ? 'text' : 'password'}
              value={openaiApiKey}
              onChange={(e) => onOpenaiApiKeyChange(e.target.value)}
              placeholder="sk-..."
              className="bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-500 pr-10 w-full"
              disabled={disabled}
            />
            <Button
              type="button"
              variant="icon"
              onClick={() => setShowOpenAiKey(!showOpenAiKey)}
              className="absolute inset-y-0 right-0 px-2 sm:px-3 flex items-center text-gray-400 hover:text-gray-200"
              aria-label={showOpenAiKey ? "Hide OpenAI API Key" : "Show OpenAI API Key"}
              disabled={disabled}
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
              value={googleApiKey}
              onChange={(e) => onGoogleApiKeyChange(e.target.value)}
              placeholder="AIzaSy..."
              className="bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-500 pr-10 w-full"
              disabled={disabled}
            />
            <Button
              type="button"
              variant="icon"
              onClick={() => setShowGoogleKey(!showGoogleKey)}
              className="absolute inset-y-0 right-0 px-2 sm:px-3 flex items-center text-gray-400 hover:text-gray-200"
              aria-label={showGoogleKey ? "Hide Google API Key" : "Show Google API Key"}
              disabled={disabled}
            >
              {showGoogleKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ApiKeyInputs; 