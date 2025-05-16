import React from 'react';

interface AudioPlayerProps {
  src: string;
  title?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, title }) => {
  return (
    <div className="my-3 sm:my-4 p-2.5 sm:p-3 bg-gray-700 rounded-lg shadow">
      {title && <h4 className="text-xs sm:text-sm font-semibold text-purple-300 mb-1.5 sm:mb-2 truncate">{title}</h4>}
      <audio controls src={src} className="w-full h-10 sm:h-12">
        Your browser does not support the audio element.
      </audio>
    </div>
  );
};

export default AudioPlayer; 