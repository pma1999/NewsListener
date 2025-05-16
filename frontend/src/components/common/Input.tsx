import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  // Allow any other input props
  [key: string]: any;
}

export const Input: React.FC<InputProps> = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, name, error, className = '', type = 'text', ...props }, ref) => {
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
        <input
          id={name}
          name={name}
          type={type}
          ref={ref}
          className={`${baseStyles} ${themeStyles} ${errorStyles} ${className}`.trim()}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input'; 