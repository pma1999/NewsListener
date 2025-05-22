import React from 'react';
import type { PredefinedCategory } from '@/types/api';
import { Globe, Building, Cpu, Lightbulb, BarChart, Palette, Mic, Tag, MapPin, Film, Newspaper } from 'lucide-react'; // Added Newspaper icon
import { Button } from '@/components/common/Button';

interface ProfileCardProps {
  profile: PredefinedCategory;
  onClick: (profileId: number) => void;
}

// Helper to select an icon based on theme or icon_identifier
const getProfileIcon = (profile: PredefinedCategory): React.ReactNode => {
  if (profile.icon_identifier) {
    // This mapping would be more extensive in a real app
    switch (profile.icon_identifier.toLowerCase()) {
      case 'world': case 'global': return <Globe size={28} className="text-blue-400" />;
      case 'business': case 'finance': return <Building size={28} className="text-green-400" />;
      case 'tech': case 'technology': return <Cpu size={28} className="text-purple-400" />;
      case 'science': case 'research': return <Lightbulb size={28} className="text-yellow-400" />;
      case 'sports': return <BarChart size={28} className="text-orange-400" />;
      case 'arts': case 'culture': return <Palette size={28} className="text-pink-400" />;
      case 'film': return <Film size={28} className="text-red-400" />;
      case 'newspaper': case 'news': return <Newspaper size={28} className="text-teal-400" />; // Added Newspaper case
      default: return <Mic size={28} className="text-gray-400" />;
    }
  }
  // Fallback based on theme if no specific icon_identifier
  if (profile.theme) {
     switch (profile.theme.toLowerCase()) {
      case 'world news': case 'global affairs': return <Globe size={28} className="text-blue-400" />;
      case 'business & finance': return <Building size={28} className="text-green-400" />;
      case 'technology': return <Cpu size={28} className="text-purple-400" />;
      // Add more theme mappings
      default: break;
    }
  }
  return <Mic size={28} className="text-gray-400" />;
};

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onClick }) => {
  return (
    <div 
      className="bg-gray-800 rounded-xl shadow-xl overflow-hidden transition-all duration-300 ease-in-out hover:shadow-2xl hover:scale-[1.02] flex flex-col h-full border border-gray-700 hover:border-purple-500/70 cursor-pointer"
      onClick={() => onClick(profile.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(profile.id)}
    >
      <div className="p-5 sm:p-6 flex-grow">
        <div className="flex items-start space-x-4 mb-3">
          <div className="flex-shrink-0 p-2 bg-gray-700 rounded-lg">
            {getProfileIcon(profile)}
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-purple-300 hover:text-purple-200 leading-tight">{profile.name}</h3>
            {(profile.region || profile.theme) && (
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    {profile.region && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600">
                            <MapPin size={12} className="mr-1" /> {profile.region}
                        </span>
                    )}
                    {profile.theme && (
                         <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 border border-gray-600">
                           <Tag size={12} className="mr-1" /> {profile.theme}
                        </span>
                    )}
                </div>
            )}
          </div>
        </div>

        {profile.description && (
          <p className="text-sm text-gray-400 leading-relaxed line-clamp-3 mb-3">
            {profile.description}
          </p>
        )}

        {(profile.topics && profile.topics.length > 0) && (
          <div className="mb-2">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Key Topics:</h4>
            <div className="flex flex-wrap gap-1.5">
              {profile.topics.slice(0, 3).map(topic => (
                <span key={topic} className="px-2 py-0.5 text-xs bg-gray-700 text-purple-300 rounded-full border border-gray-600">
                  {topic}
                </span>
              ))}
              {profile.topics.length > 3 && <span className="text-xs text-gray-500 self-end">+ more</span>}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-800/50 border-t border-gray-700/70 mt-auto">
        <Button 
            variant="primary"
            className="w-full bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 text-sm py-2"
            onClick={(e) => { e.stopPropagation(); onClick(profile.id); }} // Prevent card click from firing twice
        >
          Generate with this Profile
        </Button>
      </div>
    </div>
  );
};

export default ProfileCard; 