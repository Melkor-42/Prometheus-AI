import React, { useState, useEffect } from 'react';

interface WelcomeProps {
  onJoinRoom: (roomId: string) => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onJoinRoom }) => {
  const [joinRoomId, setJoinRoomId] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiReady, setApiReady] = useState(false);

  // Check if ChatAPI is available
  useEffect(() => {
    if (window.ChatAPI) {
      console.log('ChatAPI is available on mount');
      setApiReady(true);
    } else {
      console.log('ChatAPI not available yet, setting up listener');
      const checkAPI = () => {
        if (window.ChatAPI) {
          console.log('ChatAPI is now available');
          setApiReady(true);
          window.removeEventListener('chatapi-ready', checkAPI);
        }
      };
      
      // Check if API becomes available
      window.addEventListener('chatapi-ready', checkAPI);
      
      // Poll as a fallback
      const intervalId = setInterval(() => {
        if (window.ChatAPI) {
          console.log('ChatAPI detected through polling');
          setApiReady(true);
          clearInterval(intervalId);
          window.removeEventListener('chatapi-ready', checkAPI);
        }
      }, 500);
      
      return () => {
        clearInterval(intervalId);
        window.removeEventListener('chatapi-ready', checkAPI);
      };
    }
  }, []);

  const handleCreateRoom = async () => {
    if (!apiReady) {
      setError('Chat API not yet initialized. Please wait a moment and try again.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Creating room...');
      // Create a new room using the ChatAPI
      const roomId = await window.ChatAPI.createRoom();
      console.log('Room created:', roomId);
      // Navigate to the chat room using the prop function
      onJoinRoom(roomId);
    } catch (err) {
      console.error('Failed to create room:', err);
      setError('Failed to create room. Please try again.');
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiReady) {
      setError('Chat API not yet initialized. Please wait a moment and try again.');
      console.log('Chat API not yet initialized. Please wait a moment and try again.');
      return;
    }
    
    if (!joinRoomId.trim()) {
      setError('Please enter a valid room ID');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Joining room...');
      const success = await window.ChatAPI.joinRoom(joinRoomId);
      if (success) {
        // Navigate to the chat room using the prop function
        onJoinRoom(joinRoomId);
      } else {
        throw new Error('Failed to join room');
      }
    } catch (err) {
      console.error('Failed to join room:', err);
      setError('Failed to join room. Please check the room ID and try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-7rem)] text-center">
      <h1 className="text-4xl font-bold my-4 text-gray-900 dark:text-white">
        Prometheus P2P Chat
      </h1>
      <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
        Secure, decentralized peer-to-peer chat
      </p>
      
      {!apiReady && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4 max-w-sm">
          Initializing P2P functionality... Please wait.
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 max-w-sm">
          {error}
        </div>
      )}
      
      <div className="space-y-4 w-full max-w-sm">
        <button
          onClick={handleCreateRoom}
          disabled={isLoading || !apiReady}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create New Room'}
        </button>
        
        {!showJoinInput ? (
          <button
            onClick={() => setShowJoinInput(true)}
            disabled={!apiReady}
            className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            Join Existing Room
          </button>
        ) : (
          <form onSubmit={handleJoinRoom} className="space-y-3">
            <input
              type="text"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              placeholder="Enter Room ID"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowJoinInput(false)}
                className="flex-1 py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !apiReady}
                className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                {isLoading ? 'Joining...' : 'Join'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Welcome; 