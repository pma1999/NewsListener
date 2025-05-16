import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  // Allow any other checkbox props
  [key: string]: any;
}

export const Checkbox: React.FC<CheckboxProps> = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, name, className = '', checked, onChange, disabled, ...props }, ref) => {
    const baseStyles =
      'h-4 w-4 rounded focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';
    const themeStyles =
      'text-purple-600 bg-gray-700 border-gray-600 focus:ring-purple-500 focus:ring-offset-gray-800';

    return (
      <label htmlFor={name} className={`flex items-center space-x-2 cursor-pointer ${disabled ? 'cursor-not-allowed' : ''} ${className}`.trim()}>
        <input
          id={name}
          name={name}
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={`${baseStyles} ${themeStyles}`.trim()}
          {...props}
        />
        <span className={`text-sm ${disabled ? 'text-gray-500' : 'text-gray-300'}`}>{label}</span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox'; 