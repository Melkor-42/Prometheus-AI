import React, { useState, useEffect, useRef } from 'react';
import { Message, StructuredMessage, UserIdentity } from '../types/chat';
import { v4 as uuidv4 } from 'uuid';
import CopyIcon from '../assets/copy.svg?react';
import CopySuccessIcon from '../assets/copy-success.svg?react';
import ReactMarkdown from 'react-markdown';

interface ChatProps {
  roomId: string | null;
  onLeaveRoom: () => void;
}

const Chat: React.FC<ChatProps> = ({ roomId, onLeaveRoom }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [structuredMessages, setStructuredMessages] = useState<StructuredMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [peerCount, setPeerCount] = useState(0);
  const [roomTopic, setRoomTopic] = useState<string | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [userIdentity, setUserIdentity] = useState<UserIdentity | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [peers, setPeers] = useState<Array<{id: string, displayName: string, joinedAt: number}>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if ChatAPI is available
  useEffect(() => {
    const checkAPIAvailability = () => {
      if (window.ChatAPI) {
        console.log('ChatAPI is available in Chat component');
        setApiReady(true);
        return true;
      }
      return false;
    };

    if (checkAPIAvailability()) {
      // API already available
    } else {
      console.log('ChatAPI not available yet in Chat component, setting up listener');
      const handleAPIReady = () => {
        console.log('ChatAPI is now available in Chat component');
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

    // If roomId is provided, join that room
    const setupRoom = async () => {
      setIsConnecting(true);
      try {
        if (roomId && !window.ChatAPI.getCurrentTopic()) {
          console.log('Joining room with ID:', roomId);
          await window.ChatAPI.joinRoom(roomId);
          setRoomTopic(roomId);
        } else {
          // We're already in a room
          console.log('Already in a room');
          setRoomTopic(window.ChatAPI.getCurrentTopic());
        }
        
        // Load existing messages
        try {
          const existingMessages = window.ChatAPI.getMessages();
          setStructuredMessages(existingMessages);
          
          // Convert to legacy message format for compatibility
          const convertedMessages = existingMessages.map(msg => ({
            id: msg.id,
            sender: msg.sender.displayName || msg.sender.id,
            content: msg.content,
            timestamp: msg.timestamp,
            isMe: msg.sender.id === userIdentity?.id,
            type: msg.type
          }));
          
          setMessages(convertedMessages);
        } catch (error) {
          console.error('Failed to load messages:', error);
        }
        
        setIsConnecting(false);
      } catch (error) {
        console.error('Failed to join room:', error);
        onLeaveRoom();
      }
    };
    
    setupRoom();

    // Setup new message listener
    const removeMessageListener = window.ChatAPI.onNewMessage((message: StructuredMessage) => {
      console.log('Received new structured message:', message);
      
      // Add to structured messages
      setStructuredMessages(prev => [...prev, message]);
      
      // Convert to legacy format for UI
      const newMessage: Message = {
        id: message.id,
        sender: message.sender.displayName || message.sender.id,
        content: message.content,
        timestamp: message.timestamp,
        isMe: message.sender.id === userIdentity?.id,
        type: message.type
      };
      
      setMessages(prev => [...prev, newMessage]);
    });

    // // Backward compatibility - legacy message listener
    // window.ChatAPI.onMessage((sender, content) => {
    //   console.log(`Received legacy message from ${sender}: ${content}`);
    //   const newMessage: Message = {
    //     id: uuidv4(),
    //     sender,
    //     content,
    //     timestamp: Date.now(),
    //     isMe: false,
    //   };
    //   setMessages(prev => [...prev, newMessage]);
    // });

    // Setup peer info updater
    const peerInfoInterval = setInterval(() => {
      setPeerCount(window.ChatAPI.getPeerCount());
      setPeers(window.ChatAPI.getPeers());
    }, 1000);

    return () => {
      clearInterval(peerInfoInterval);
      removeMessageListener();
    };
  }, [roomId, onLeaveRoom, apiReady, userIdentity]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !apiReady) return;
    
    // Send message to peers
    window.ChatAPI.sendMessage(inputMessage);
    
    // Let the message listener handle adding the message to the UI
    setInputMessage('');
  };

  const handleLeaveRoom = async () => {
    if (!apiReady) return;
    
    await window.ChatAPI.leaveRoom();
    onLeaveRoom();
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomTopic || '');
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
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
            Initializing chat...
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
            Connecting to room...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Establishing peer-to-peer connections
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
            Room: {roomTopic ? roomTopic.substring(0, 10) + '...' : 'Loading...'}
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
              </>
            )}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors duration-200"
          >
            {userIdentity?.displayName || 'Set Name'}
          </button>
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
      
      {/* Messages area - make only this part scrollable */}
      <div className="flex-grow overflow-y-auto p-4 bg-white dark:bg-gray-900 space-y-3 custom-scrollbar scrollbar-hide-inactive">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 italic">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map(msg => (
            <div 
              key={msg.id}
              className={`${
                msg.type === 'system'
                  ? 'mx-auto bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-center max-w-[90%] text-sm italic p-3 rounded-lg'
                  : msg.isMe 
                    ? 'ml-auto max-w-[80%] p-3 rounded-lg bg-blue-600 text-white'
                    : 'mr-auto max-w-[80%] p-3'
              }`}
            >
              {msg.type !== 'system' && (
                <div className="font-semibold text-sm mb-1">
                  {msg.isMe ? userIdentity?.displayName || 'You' : msg.sender}
                </div>
              )}
              {msg.isMe ? (
                <div>{msg.content}</div>
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
              {msg.type !== 'system' && (
                <div className="text-xs opacity-70 text-right mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input form */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-700">
        <div className="flex">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition duration-200"
          >
            Send
          </button>
        </div>
      </form>
      
      {/* Profile settings modal */}
      {renderProfileSettings()}
    </div>
  );
};

export default Chat; 