import React from 'react';

export default function Spinner({ size = 'md', color = 'primary', className = '' }) {
  const sizeStyles = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4',
  };

  const colorStyles = {
    primary: 'border-indigo-600 border-t-transparent',
    white: 'border-white border-t-transparent',
    current: 'border-current border-t-transparent',
    slate: 'border-slate-400 border-t-transparent',
  };

  return (
    <div
      className={`inline-block animate-spin rounded-full ${sizeStyles[size] || sizeStyles.md} ${
        colorStyles[color] || colorStyles.primary
      } ${className}`}
      role="status"
      aria-label="loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
