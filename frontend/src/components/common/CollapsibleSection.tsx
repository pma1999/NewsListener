import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string | React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  initiallyOpen?: boolean;
  className?: string;
  titleClassName?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  children,
  initiallyOpen = false,
  className = '',
  titleClassName = ''
}) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  return (
    <div className={`border border-gray-700 rounded-lg bg-gray-800/30 shadow-md ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-3 sm:p-4 text-left focus:outline-none ${titleClassName}`}
        aria-expanded={isOpen}
      >
        <h3 className="text-base sm:text-lg font-semibold text-purple-300 flex items-center">
          {icon && <span className="mr-2 text-yellow-400 flex-shrink-0">{icon}</span>}
          {title}
        </h3>
        {isOpen ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
      </button>
      {isOpen && <div className="p-3 sm:p-4 border-t border-gray-700 space-y-4">{children}</div>}
    </div>
  );
};

export default CollapsibleSection; 