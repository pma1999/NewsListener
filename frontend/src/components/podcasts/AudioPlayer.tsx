import React from 'react';

interface AudioPlayerProps {
  src: string;
  title?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, title }) => {
  return (
    <div className="my-4 p-3 bg-gray-700 rounded-lg shadow">
      {title && <h4 className="text-sm font-semibold text-purple-300 mb-2">{title}</h4>}
      <audio controls src={src} className="w-full">
        Your browser does not support the audio element.
      </audio>
    </div>
  );
};

export default AudioPlayer; 