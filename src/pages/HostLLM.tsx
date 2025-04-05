import React, { useState, useEffect } from 'react';
import { UserIdentity } from '../types/chat';
import CopyIcon from '../assets/copy.svg?react';
import CopySuccessIcon from '../assets/copy-success.svg?react';

interface HostLLMProps {
  roomId: string | null;
  onLeaveRoom: () => void;
  onContinueToChat: (roomId: string) => void;
}

const HostLLM: React.FC<HostLLMProps> = ({ roomId, onLeaveRoom, onContinueToChat }) => {
  // State
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [peerCount, setPeerCount] = useState(0);
  const [roomTopic, setRoomTopic] = useState<string | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [userIdentity, setUserIdentity] = useState<UserIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<Array<{id: string, name: string}>>([]);
  const [selectedProvider, setSelectedProvider] = useState('veniceai');

  // Check if ChatAPI is available
  useEffect(() => {
    const checkAPIAvailability = () => {
      if (window.ChatAPI) {
        console.log('ChatAPI is available in HostLLM component');
        setApiReady(true);
        return true;
      }
      return false;
    };

    if (checkAPIAvailability()) {
      // API already available
    } else {
      console.log('ChatAPI not available yet in HostLLM component, setting up listener');
      const handleAPIReady = () => {
        console.log('ChatAPI is now available in HostLLM component');
        setApiReady(true);
      };
      
      window.addEventListener('chatapi-ready', handleAPIReady);
      
      // Poll as a fallback
      const intervalId = setInterval(() => {
        if (checkAPIAvailability()) {
          clearInterval(intervalId);
          window.removeEventListener('chatapi-ready', handleAPIReady);
        }
      }, 500);
      
      return () => {
        clearInterval(intervalId);
        window.removeEventListener('chatapi-ready', handleAPIReady);
      };
    }
  }, []);

  // Load user identity when API is ready
  useEffect(() => {
    if (!apiReady) return;

    try {
      const identity = window.ChatAPI.getUserIdentity();
      setUserIdentity(identity);
    } catch (error) {
      console.error('Failed to load user identity:', error);
    }
  }, [apiReady]);

  // Setup room when API is ready
  useEffect(() => {
    if (!apiReady) return;

    // Check if we're in a room, if not, navigate to home
    if (!roomId && !window.ChatAPI.getCurrentTopic()) {
      onLeaveRoom();
      return;
    }

    // Set the room topic
    const currentTopic = window.ChatAPI.getCurrentTopic();
    setRoomTopic(currentTopic);

    // Setup peer info updater
    const peerInfoInterval = setInterval(() => {
      setPeerCount(window.ChatAPI.getPeerCount());
    }, 1000);

    return () => {
      clearInterval(peerInfoInterval);
    };
  }, [roomId, onLeaveRoom, apiReady]);

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomTopic || '');
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleLeaveRoom = async () => {
    if (!apiReady) return;
    
    await window.ChatAPI.leaveRoom();
    onLeaveRoom();
  };

  const handleStartHosting = async () => {
    if (!apiReady || !roomTopic) return;

    setIsConnecting(true);
    setError(null);
    
    try {
      // Validate the form
      if (!model) {
        throw new Error('Please select a model');
      }
      
      if (selectedProvider === 'veniceai' && !apiKey) {
        throw new Error('API key is required for Venice AI');
      }

      // Create the LLM provider configuration
      const llmConfig = {
        provider: selectedProvider,
        model: model,
        apiKey: apiKey
      };

      // Add the LLM config and host status to the user's identity
      // This would be a custom extension to the ChatAPI that needs to be implemented
      // For now, it's a placeholder for the future implementation
      console.log('Setting up LLM hosting with config:', llmConfig);

      // Create LLM provider using llmService
      // This would be exposed via window.llmService in the future
      // For now, it's a placeholder
      console.log('Creating LLM provider');

      // Navigate to the chat page
      onContinueToChat(roomTopic);
    } catch (error) {
      console.error('Failed to start hosting:', error);
      setError((error as Error).message);
      setIsConnecting(false);
    }
  };

  if (!apiReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-4">
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            Initializing...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please wait while we set up the P2P connection
          </p>
        </div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-4">
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            Setting up LLM host...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Configuring your LLM provider
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Room header with peer count */}
      <div className="p-4 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Host LLM in Room: {roomTopic ? roomTopic.substring(0, 10) + '...' : 'Loading...'}
          </h2>
          <button 
            onClick={handleCopyRoomId}
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200"
          >
            {copySuccess ? (
              <>
                <CopySuccessIcon className="w-4 h-4 text-green-500" />
                <span className="text-green-500">Copied!</span>
              </>
            ) : (
              <>
                <CopyIcon className="w-4 h-4" />
                <span>Copy Room ID</span>
              </>
            )}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold">{peerCount}</span> peers connected
          </div>
          <button
            onClick={handleLeaveRoom}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors duration-200"
          >
            Leave Room
          </button>
        </div>
      </div>
      
      {/* Main form area */}
      <div className="flex-grow p-6 bg-white dark:bg-gray-900">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Configure LLM Host</h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">
              {error}
            </div>
          )}
          
          <form className="space-y-6">
            {/* Provider selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="veniceai">Venice AI</option>
                <option value="mock">Mock Provider (for testing)</option>
              </select>
            </div>
            
            {/* Model selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a model</option>
                {selectedProvider === 'veniceai' && (
                  <>
                    <option value="venice-1">Venice 1</option>
                    <option value="venice-2">Venice 2</option>
                    <option value="venice-3">Venice 3</option>
                  </>
                )}
                {selectedProvider === 'mock' && (
                  <>
                    <option value="mock-small">Mock Small</option>
                    <option value="mock-medium">Mock Medium</option>
                    <option value="mock-large">Mock Large</option>
                  </>
                )}
              </select>
            </div>
            
            {/* API Key (only for Venice AI) */}
            {selectedProvider === 'veniceai' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your Venice AI API key"
                />
              </div>
            )}
            
            {/* Submit button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={handleStartHosting}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors duration-200 flex items-center justify-center"
              >
                Start Hosting
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HostLLM; 