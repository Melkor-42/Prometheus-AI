import React from 'react';

interface LoadingStateProps {
  title: string;
  subtitle: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ title, subtitle }) => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center p-4">
        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
          {title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default LoadingState; 