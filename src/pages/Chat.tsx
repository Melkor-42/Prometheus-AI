import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types/chat';
import { v4 as uuidv4 } from 'uuid';

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

    // Setup message listener
    window.ChatAPI.onMessage((sender, content) => {
      console.log(`Received message from ${sender}: ${content}`);
      const newMessage: Message = {
        id: uuidv4(),
        sender,
        content,
        timestamp: Date.now(),
        isMe: false,
      };
      setMessages(prev => [...prev, newMessage]);
    });

    // Setup peer count updater
    const peerCountInterval = setInterval(() => {
      setPeerCount(window.ChatAPI.getPeerCount());
    }, 1000);

    return () => {
      clearInterval(peerCountInterval);
    };
  }, [roomId, onLeaveRoom, apiReady]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !apiReady) return;
    
    // Send message to peers
    window.ChatAPI.sendMessage(inputMessage);
    
    // Add message to local state
    const newMessage: Message = {
      id: uuidv4(),
      sender: 'You',
      content: inputMessage,
      timestamp: Date.now(),
      isMe: true,
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
  };

  const handleLeaveRoom = async () => {
    if (!apiReady) return;
    
    await window.ChatAPI.leaveRoom();
    onLeaveRoom();
  };

  if (!apiReady) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-7rem)]">
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
      <div className="flex items-center justify-center h-[calc(100vh-7rem)]">
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
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Room header with peer count */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-t-lg flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Room: {roomTopic ? roomTopic.substring(0, 10) + '...' : 'Loading...'}
          </h2>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(roomTopic || '');
              alert('Room ID copied to clipboard!');
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Copy Room ID
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
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-900 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 italic">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map(msg => (
            <div 
              key={msg.id}
              className={`p-3 rounded-lg max-w-[80%] ${
                msg.isMe 
                  ? 'ml-auto bg-blue-600 text-white' 
                  : 'mr-auto bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              <div className="font-semibold text-sm">
                {msg.isMe ? 'You' : msg.sender}
              </div>
              <div>{msg.content}</div>
              <div className="text-xs opacity-70 text-right mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input form */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 bg-gray-100 dark:bg-gray-800 rounded-b-lg"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!apiReady}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat; 