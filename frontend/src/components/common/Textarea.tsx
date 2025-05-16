import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  [key: string]: any;
}

export const Textarea: React.FC<TextareaProps> = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, name, error, className = '', ...props }, ref) => {
    const baseStyles =
      'block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed';
    const themeStyles =
      'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:ring-purple-500 focus:border-purple-500';
    const errorStyles = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-600';

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={name} className="block text-sm font-medium text-purple-300 mb-1">
            {label}
          </label>
        )}
        <textarea
          id={name}
          name={name}
          ref={ref}
          rows={3} // Default row count
          className={`${baseStyles} ${themeStyles} ${errorStyles} ${className}`.trim()}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea'; 