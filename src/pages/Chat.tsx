import React, { useState, useEffect, useRef } from 'react';
import { Message, StructuredMessage, UserIdentity } from '../types/chat';
import { v4 as uuidv4 } from 'uuid';
import CopyIcon from '../assets/copy.svg?react';
import CopySuccessIcon from '../assets/copy-success.svg?react';
import ReactMarkdown from 'react-markdown';
import ProfileSettingsModal from '../components/ProfileSettingsModal';
import LoadingState from '../components/LoadingState';
import ChatSidebar from '../components/ChatSidebar';
import MenuIcon from '../assets/hamburger.svg?react';

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
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  // Load messages when currentChatId changes
  useEffect(() => {
    if (!apiReady || !currentChatId) return;

    const loadMessages = async () => {
      try {
        const chatMessages = await window.ChatAPI.getChat(currentChatId);
        setMessages(chatMessages);
      } catch (error) {
        console.error('Failed to load messages:', error);
        setMessages([]);
      }
    };

    loadMessages();
  }, [currentChatId, apiReady]);

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
    });

    // Setup peer info updater
    const peerInfoInterval = setInterval(() => {
      setPeerCount(window.ChatAPI.getPeerCount());
      setPeers(window.ChatAPI.getPeers());
    }, 1000);

    return () => {
      clearInterval(peerInfoInterval);
      removeMessageListener();
    };
  }, [roomId, onLeaveRoom, apiReady]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectChat = async (chatId: string) => {
    setCurrentChatId(chatId);
    setRoomTopic(chatId);
  };

  const handleCreateNewChat = async () => {
    try {
      const newChatId = await window.ChatAPI.createChat();
      setCurrentChatId(newChatId);
      setRoomTopic(newChatId);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !apiReady) return;
    
    try {
      if (!currentChatId) {
        // Create a new chat if none exists
        const newChatId = await window.ChatAPI.createChat();
        setCurrentChatId(newChatId);
        setRoomTopic(newChatId);
      }

      // Send message to peers
      window.ChatAPI.sendMessage(inputMessage);
      
      // Let the message listener handle adding the message to the UI
      setInputMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
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

  if (!apiReady) {
    return (
      <LoadingState
        title="Initializing chat..."
        subtitle="Please wait while we set up the P2P connection"
      />
    );
  }

  if (isConnecting) {
    return (
      <LoadingState
        title="Connecting to room..."
        subtitle="Establishing peer-to-peer connections"
      />
    );
  }

  return (
    <div className="flex flex-1 h-full bg-gray-100 dark:bg-gray-900">
      {/* Sidebar with toggle */}
      <div className={`relative transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-80' : 'w-0'}`}>
        <div className={`absolute top-0 left-0 h-full ${isSidebarOpen ? 'w-80' : 'w-0'} overflow-hidden transition-all duration-300 ease-in-out`}>
          <ChatSidebar
            onSelectChat={handleSelectChat}
            currentChatId={currentChatId}
            onCreateNewChat={handleCreateNewChat}
          />
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Room header */}
        <div className="p-4 bg-white dark:bg-gray-800 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              <MenuIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </button>
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
        
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar scrollbar-hide-inactive">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-center text-gray-500 dark:text-gray-400 italic">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            messages.map(msg => (
              <div 
                key={msg.id}
                className={`${
                  msg.type === 'system'
                    ? 'mx-auto bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-center max-w-[90%] text-sm italic p-3 rounded-lg'
                    : msg.isMe 
                      ? 'ml-auto max-w-[80%] p-3 rounded-lg bg-blue-600 text-white'
                      : 'mr-auto max-w-[80%] p-3 rounded-lg bg-gray-200 dark:bg-gray-800'
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
        <form onSubmit={handleSendMessage} className="p-4">
          <div className="flex max-w-4xl mx-auto">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition duration-200"
            >
              Send
            </button>
          </div>
        </form>
      </div>
      
      {/* Profile settings modal */}
      <ProfileSettingsModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        displayName={displayName}
        onDisplayNameChange={setDisplayName}
        onSave={handleSaveProfile}
      />
    </div>
  );
};

export default Chat; 