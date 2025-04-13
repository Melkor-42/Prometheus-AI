import React, { useState, useEffect, useRef } from 'react';
import { Message, UserIdentity } from '../types/chat';
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar scrollbar-hide-inactive">
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
                    ? 'mx-auto text-gray-600 dark:text-gray-400 text-center max-w-[90%] text-sm italic'
                    : msg.isMe 
                      ? 'flex flex-col items-end'
                      : 'flex flex-col items-start'
                }`}
              >
                <div className={`flex items-start gap-3 max-w-3xl ${
                  msg.isMe ? 'flex-row-reverse' : 'flex-row'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.isMe 
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                    {msg.isMe ? 'U' : 'AI'}
                  </div>
                  <div className={`flex-1 ${
                    msg.isMe 
                      ? 'bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4'
                      : 'bg-white dark:bg-gray-800 rounded-lg p-4'
                  }`}>
                    {msg.type !== 'system' && (
                      <div className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">
                        {msg.isMe ? userIdentity?.displayName || 'You' : msg.sender.displayName}
                      </div>
                    )}
                    {msg.isMe ? (
                      <div className="text-gray-800 dark:text-gray-200">{msg.content}</div>
                    ) : (
                      <div className="prose dark:prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-4 text-gray-800 dark:text-gray-200">{children}</p>,
                            h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">{children}</h3>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-4 text-gray-800 dark:text-gray-200">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-4 text-gray-800 dark:text-gray-200">{children}</ol>,
                            li: ({ children }) => <li className="mb-1 text-gray-800 dark:text-gray-200">{children}</li>,
                            code: ({ children }) => (
                              <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
                                {children}
                              </code>
                            ),
                            pre: ({ children }) => (
                              <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto mb-4 text-gray-800 dark:text-gray-200">
                                {children}
                              </pre>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic mb-4 text-gray-700 dark:text-gray-300">
                                {children}
                              </blockquote>
                            ),
                            a: ({ href, children }) => (
                              <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline">
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
                {msg.type !== 'system' && (
                  <div className="text-xs opacity-50 mt-1 text-gray-500 dark:text-gray-400">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message input form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex max-w-3xl mx-auto">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-grow px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition duration-200"
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