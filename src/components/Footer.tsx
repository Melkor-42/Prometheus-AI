import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-center">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          © {new Date().getFullYear()} Prometheus AI Chat. Magrathea all rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer; 