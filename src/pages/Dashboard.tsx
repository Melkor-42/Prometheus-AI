import React, { useState, useEffect } from 'react';
import { UserIdentity, LLMConfig } from '../types/chat';
import CopyIcon from '../assets/copy.svg?react';
import CopySuccessIcon from '../assets/copy-success.svg?react';

interface DashboardProps {
  roomId: string | null;
  onLeaveRoom: () => void;
  onNavigateToChat: (roomId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ roomId, onLeaveRoom, onNavigateToChat }) => {
  // State
  const [peerCount, setPeerCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [roomTopic, setRoomTopic] = useState<string | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [userIdentity, setUserIdentity] = useState<UserIdentity | null>(null);
  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null);
  const [peers, setPeers] = useState<Array<{id: string, displayName: string, joinedAt: number}>>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');

  // Check if ChatAPI is available
  useEffect(() => {
    const checkAPIAvailability = () => {
      if (window.ChatAPI) {
        console.log('ChatAPI is available in Dashboard component');
        setApiReady(true);
        return true;
      }
      return false;
    };

    if (checkAPIAvailability()) {
      // API already available
    } else {
      console.log('ChatAPI not available yet in Dashboard component, setting up listener');
      const handleAPIReady = () => {
        console.log('ChatAPI is now available in Dashboard component');
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
      setDisplayName(identity.displayName);
      
      // Get the LLM config from host status
      if (identity.hostStatus?.llmConfig) {
        setLlmConfig(identity.hostStatus.llmConfig);
      }
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

    // Make sure we're set as host
    const identity = window.ChatAPI.getUserIdentity();
    if (!identity.hostStatus?.isHost) {
      console.warn('Not set as host, redirecting to welcome');
      onLeaveRoom();
      return;
    }

    // Set the room topic
    const currentTopic = window.ChatAPI.getCurrentTopic();
    setRoomTopic(currentTopic);

    // Setup regular updates
    const updateInterval = setInterval(() => {
      // Update peer count
      setPeerCount(window.ChatAPI.getPeerCount());
      
      // Update peer list
      setPeers(window.ChatAPI.getPeers());
      
      // Update message count
      const messages = window.ChatAPI.getMessages();
      setMessageCount(messages.length);
    }, 1000);

    return () => {
      clearInterval(updateInterval);
    };
  }, [roomId, onLeaveRoom, apiReady]);

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomTopic || '');
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleLeaveRoom = async () => {
    if (!apiReady) return;
    
    // Stop being a host
    if (window.ChatAPI.setHostStatus) {
      window.ChatAPI.setHostStatus(false);
    }
    
    await window.ChatAPI.leaveRoom();
    onLeaveRoom();
  };

  const handleGoToChat = () => {
    if (roomTopic) {
      onNavigateToChat(roomTopic);
    }
  };

  const handleSaveProfile = () => {
    if (!displayName.trim()) return;
    
    try {
      window.ChatAPI.setDisplayName(displayName);
      setUserIdentity(window.ChatAPI.getUserIdentity());
      setIsProfileOpen(false);
    } catch (error) {
      console.error('Failed to update display name:', error);
      alert('Failed to update display name: ' + (error as Error).message);
    }
  };

  // Render profile settings modal
  const renderProfileSettings = () => {
    if (!isProfileOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile Settings</h2>
            <button 
              onClick={() => setIsProfileOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          <div className="mb-4">
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter your display name"
            />
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleSaveProfile}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!apiReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-4">
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            Initializing...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please wait while we set up the dashboard
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            LLM Host Dashboard
          </h1>
          <span className="text-sm bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 px-2 py-1 rounded-full">
            {peerCount} {peerCount === 1 ? 'Peer' : 'Peers'} Connected
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors duration-200"
          >
            {userIdentity?.displayName || 'Set Name'}
          </button>
          <button
            onClick={handleLeaveRoom}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
          >
            Leave Room
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-6 bg-white dark:bg-slate-900 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Room Info Card */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Room Information</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Room ID:</span>
                <div className="flex items-center">
                  <span className="text-gray-900 dark:text-white mr-2 truncate max-w-[120px]">
                    {roomTopic || 'Loading...'}
                  </span>
                  <button onClick={handleCopyRoomId} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                    {copySuccess ? <CopySuccessIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Connected Peers:</span>
                <span className="text-gray-900 dark:text-white">{peerCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Messages:</span>
                <span className="text-gray-900 dark:text-white">{messageCount}</span>
              </div>
            </div>
          </div>
          
          {/* LLM Info Card */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">LLM Information</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Provider:</span>
                <span className="text-gray-900 dark:text-white capitalize">{llmConfig?.provider || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Model:</span>
                <span className="text-gray-900 dark:text-white">{llmConfig?.model || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className="text-green-600 dark:text-green-400">Active</span>
              </div>
            </div>
          </div>
          
          {/* User Info Card */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Host Information</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Display Name:</span>
                <span className="text-gray-900 dark:text-white">{userIdentity?.displayName || 'Anonymous'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">User ID:</span>
                <span className="text-gray-900 dark:text-white">{userIdentity?.id ? `${userIdentity.id.substring(0, 8)}...` : 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Host Status:</span>
                <span className="text-green-600 dark:text-green-400">Active</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Connected Peers List */}
        <div className="mt-6 bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Connected Peers</h2>
          {peers.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 italic">No peers connected yet</p>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 px-4 font-semibold text-gray-900 dark:text-gray-100">Peer ID</th>
                    <th className="py-2 px-4 font-semibold text-gray-900 dark:text-gray-100">Display Name</th>
                    <th className="py-2 px-4 font-semibold text-gray-900 dark:text-gray-100">Connected Since</th>
                  </tr>
                </thead>
                <tbody>
                  {peers.map(peer => (
                    <tr key={peer.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{peer.id.substring(0, 8)}...</td>
                      <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{peer.displayName || 'Anonymous'}</td>
                      <td className="py-2 px-4 text-gray-700 dark:text-gray-300">
                        {new Date(peer.joinedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Profile settings modal */}
      {renderProfileSettings()}
    </div>
  );
};

export default Dashboard; 