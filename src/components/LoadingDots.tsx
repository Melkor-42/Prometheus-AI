import React from 'react';
import './LoadingDots.css';

const LoadingDots: React.FC = () => {
  return (
    <div className="flex items-center space-x-2 py-2">
      <div className="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
};

export default LoadingDots; 