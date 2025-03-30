import React from 'react';

const Welcome: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-7rem)] text-center">
      <h1 className="text-4xl font-bold my-4 text-gray-900 dark:text-white">
        Prometheus AI
      </h1>
      <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
        Welcome to the future of P2P chat
      </p>
      <div className="space-y-4 w-full max-w-xs">
        <button
          onClick={() => {/* TODO: Implement create room */}}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
        >
          Create Room
        </button>
        <button
          onClick={() => {/* TODO: Implement join room */}}
          className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200"
        >
          Join Room
        </button>
      </div>
    </div>
  );
};

export default Welcome; 