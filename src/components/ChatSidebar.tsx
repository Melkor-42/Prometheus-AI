import React, { useState, useEffect } from 'react';

interface Chat {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp: number;
}

interface ChatSidebarProps {
  onSelectChat: (chatId: string) => void;
  currentChatId: string | null;
  onCreateNewChat: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ onSelectChat, currentChatId, onCreateNewChat }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch chats from MessageStore
  useEffect(() => {
    const fetchChats = async () => {
      if (!window.ChatAPI) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const allChats = await window.ChatAPI.getChats();
        const chatList: Chat[] = [];
        
        allChats.forEach((messages, id) => {
          const lastMessage = messages.length > 0 ? messages[messages.length - 1].content : undefined;
          const timestamp = messages.length > 0 ? messages[messages.length - 1].timestamp : Date.now();
          
          chatList.push({
            id,
            title: `Chat ${id.substring(0, 8)}`,
            lastMessage,
            timestamp
          });
        });
        
        setChats(chatList);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch chats:', err);
        setError('Failed to load chats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChats();
  }, []);

  const handleDeleteChat = async (chatId: string) => {
    if (!window.ChatAPI) return;
    
    try {
      await window.ChatAPI.deleteChat(chatId);
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      if (currentChatId === chatId) {
        onSelectChat('');
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
      setError('Failed to delete chat');
    }
  };

  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onCreateNewChat}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          New Chat
        </button>
      </div>

      {error && (
        <div className="p-4 text-red-500 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            Loading chats...
          </div>
        ) : chats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No chats available
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {chats.map(chat => (
              <div
                key={chat.id}
                className={`p-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${
                  currentChatId === chat.id ? 'bg-gray-200 dark:bg-gray-700' : ''
                }`}
                onClick={() => onSelectChat(chat.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {chat.title}
                    </h3>
                    {chat.lastMessage && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {chat.lastMessage}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(chat.id);
                    }}
                    className="ml-2 text-gray-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(chat.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar; 