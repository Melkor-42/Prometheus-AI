import React, { useState, useEffect, useRef } from 'react';
import { Message, UserIdentity } from '../types/chat';
import CopyIcon from '../assets/copy.svg?react';
import CopySuccessIcon from '../assets/copy-success.svg?react';
import ReactMarkdown from 'react-markdown';
import ProfileSettingsModal from '../components/ProfileSettingsModal';
import LoadingState from '../components/LoadingState';
import ChatSidebar from '../components/ChatSidebar';
import MenuIcon from '../assets/hamburger.svg?react';
import ChatMessage from '../components/ChatMessage';
import LoadingDots from '../components/LoadingDots';

interface ChatProps {
  roomId: string | null;
  onLeaveRoom: () => void;
}

const Chat: React.FC<ChatProps> = ({ roomId, onLeaveRoom }) => {
  const [messages, setMessages] = useState<Message[]>([]);
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
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
        // Set isMe flag for existing messages
        const identity = window.ChatAPI.getUserIdentity();
        const processedMessages = chatMessages.map(msg => ({
          ...msg,
          isMe: msg.sender.id === identity.id
        }));
        setMessages(processedMessages);
      } catch (error) {
        console.error('Failed to load messages:', error);
        setMessages([]);
      }
    };

    // Load initial messages
    loadMessages();

    // Setup message listener for this chat
    const removeMessageListener = window.ChatAPI.onNewMessage((message: Message) => {
      if (message.chatId === currentChatId) {
        const identity = window.ChatAPI.getUserIdentity();
        const processedMessage = {
          ...message,
          isMe: message.sender.id === identity.id
        };
        setMessages(prev => [...prev, processedMessage]);
        setIsLoading(false);
      }
    });

    return () => removeMessageListener();
  }, [currentChatId, apiReady]);

  // Setup room
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

    // Setup peer info updater
    const peerInfoInterval = setInterval(() => {
      setPeerCount(window.ChatAPI.getPeerCount());
      setPeers(window.ChatAPI.getPeers());
    }, 1000);

    return () => {
      clearInterval(peerInfoInterval);
    };
  }, [roomId, onLeaveRoom, apiReady]);

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isLoading]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Check if content has multiple lines
      const lineCount = (inputMessage.match(/\n/g) || []).length + 1;
      
      if (lineCount > 1) {
        // Multiple lines - adjust height based on content
        textarea.style.height = '44px'; // Reset height before calculating
        const newHeight = Math.min(textarea.scrollHeight, 120); // Max height of 120px (4 lines)
        textarea.style.height = `${newHeight}px`;
        textarea.style.overflowY = 'auto';
      } else {
        // Single line - keep fixed height
        textarea.style.height = '44px';
        textarea.style.overflowY = 'hidden';
      }
    }
  }, [inputMessage]);

  const handleSelectChat = async (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const handleCreateNewChat = async () => {
    try {
      const newChatId = await window.ChatAPI.createChat();
      setCurrentChatId(newChatId);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !apiReady) return;
    
    try {
      let chatId = currentChatId;
      if (!chatId || chatId === '') {
        chatId = await window.ChatAPI.createChat();
        setCurrentChatId(chatId);
      }

      // Send message - the message will be added to the UI through the message listener
      await window.ChatAPI.sendMessage(inputMessage, chatId);
      setInputMessage('');
      setIsLoading(true);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
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
    <div className="flex flex-1 h-full bg-gray-50 dark:bg-gray-900">
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
      <div className="flex-1 flex flex-col h-full max-w-4xl mx-auto">
        {/* Room header */}
        <div className="p-4 flex justify-between items-center">
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
              <span className="font-semibold">{peerCount}</span> peers
            </div>
            <button
              onClick={handleLeaveRoom}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors duration-200"
            >
              Leave
            </button>
          </div>
        </div>
        
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar scrollbar-hide-inactive">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-center text-gray-500 dark:text-gray-400 italic">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            <>
              {messages.map(msg => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  userIdentity={userIdentity}
                />
              ))}
              {isLoading && (
                <div className="flex flex-col w-full">
                  <div className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">
                    AI Assistant
                  </div>
                  <LoadingDots />
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message input form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex max-w-3xl mx-auto items-center">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className={`flex-grow px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none min-h-[44px] max-h-[120px] ${(inputMessage.match(/\n/g) || []).length > 0 ? 'custom-scrollbar scrollbar-hide-inactive overflow-y-auto' : ''}`}
              style={{ height: '44px', overflowY: (inputMessage.match(/\n/g) || []).length > 0 ? 'auto' : 'hidden' }}
            />
            <button
              type="submit"
              className="px-6 py-3 h-[44px] bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition duration-200"
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