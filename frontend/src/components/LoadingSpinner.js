import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'primary', 
  text = '', 
  className = '',
  fullScreen = false 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    primary: 'border-primary-600',
    secondary: 'border-secondary-600',
    white: 'border-white',
    red: 'border-red-600',
    green: 'border-green-600',
    blue: 'border-blue-600'
  };

  const spinnerClass = `${sizeClasses[size]} border-2 ${colorClasses[color]} border-t-transparent rounded-full animate-spin`;

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={spinnerClass}></div>
      {text && (
        <p className="mt-3 text-sm text-secondary-600 dark:text-secondary-400 text-center">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-secondary-900 bg-opacity-80 dark:bg-opacity-80 flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;