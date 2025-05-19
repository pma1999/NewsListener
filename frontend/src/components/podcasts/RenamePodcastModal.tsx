import React, { useState, useEffect } from 'react';
// import { Button } from '@/components/ui/button'; 
// import { Input } from '@/components/ui/input'; 
import { Loader2, X, AlertTriangle } from 'lucide-react'; // Added AlertTriangle

interface RenamePodcastModalProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onSave: (newName: string) => Promise<void>; 
  podcastId: number; // For context, not directly used in this simple version
}

const RenamePodcastModal: React.FC<RenamePodcastModalProps> = ({ 
  isOpen, 
  currentName, 
  onClose, 
  onSave,
  // podcastId 
}) => {
  const [newName, setNewName] = useState<string>(currentName);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewName(currentName);
      setError(null); 
    }
  }, [isOpen, currentName]);

  const handleSave = async () => {
    if (!newName.trim()) {
      setError('Podcast name cannot be empty.');
      return;
    }
    if (newName.trim().length > 255) {
      setError('Podcast name cannot exceed 255 characters.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSave(newName.trim());
      onClose(); // Close modal on successful save
    } catch (err: any) {
      console.error("Error saving podcast name in modal:", err);
      setError(err.message || "Failed to save new name. Please try again.");
    }
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out" onClick={onClose}>
      <div className="bg-gray-800 p-5 sm:p-6 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ease-in-out scale-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Rename Podcast</h2>
          <button 
            onClick={onClose} 
            className="p-1 text-gray-400 hover:text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div role="alert" className="bg-red-900 border border-red-700 text-red-300 p-3 rounded-md mb-4 text-sm flex items-start">
            <AlertTriangle size={18} className="mr-2 shrink-0 text-red-400"/>
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="podcastNameInput" className="block text-sm font-medium text-gray-300 mb-1.5">
              Podcast Name
            </label>
            <input 
              type="text"
              id="podcastNameInput"
              value={newName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
              placeholder="Enter new podcast name"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors disabled:opacity-70"
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-2 sm:space-y-0">
          <button 
            type="button"
            onClick={onClose} 
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleSave} 
            disabled={isSaving || !newName.trim()}
            className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:bg-purple-800 transition-colors flex items-center justify-center"
          >
            {isSaving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              'Save Name'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenamePodcastModal; 