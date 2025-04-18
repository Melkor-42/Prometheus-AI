import React, { useState, useEffect } from 'react';

interface Chat {
  id: string;
  title: string;
  firstMessage?: string;
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

  // Fetch chats and setup listener for updates
  useEffect(() => {
    if (!window.ChatAPI) {
      setIsLoading(false);
      return;
    }

    // Helper function to convert message map to chat list
    const processChatsMap = (allChats: any) => {
      const chatList: Chat[] = [];
      
      allChats.forEach((messages: any[], id: string) => {
        // Get the first message for preview instead of the last one
        const firstMessage = messages.length > 0 ? messages[0].content : undefined;
        // Use the timestamp of the first message as creation date
        const creationTimestamp = messages.length > 0 ? messages[0].timestamp : Date.now();
        const lastMessageTimestamp = messages.length > 0 ? messages[messages.length - 1].timestamp : Date.now();
        
        // Format the date for the title
        const creationDate = new Date(creationTimestamp).toLocaleDateString();
        
        chatList.push({
          id,
          title: `Chat: ${creationDate}`,
          firstMessage,
          timestamp: lastMessageTimestamp // Still sort by last message time
        });
      });
      
      // Sort chats by timestamp (newest first)
      return chatList.sort((a, b) => b.timestamp - a.timestamp);
    };

    // Initial fetch of chats
    const fetchChats = async () => {
      try {
        setIsLoading(true);
        const allChats = await window.ChatAPI.getChats();
        setChats(processChatsMap(allChats));
        setError(null);
      } catch (err) {
        console.error('Failed to fetch chats:', err);
        setError('Failed to load chats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChats();

    // Set up listener for chat updates
    const removeChatListener = window.ChatAPI.onChatUpdate((updatedChats: any) => {
      setChats(processChatsMap(updatedChats));
    });

    // Clean up listener on unmount
    return () => {
      if (removeChatListener) {
        removeChatListener();
      }
    };
  }, []);

  const handleDeleteChat = async (chatId: string) => {
    if (!window.ChatAPI) return;
    
    try {
      await window.ChatAPI.deleteChat(chatId);
      // No need to manually update the chats state here
      // as the chat listener will handle the update
      
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

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar scrollbar-hide-inactive">
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
                } w-full`}
                onClick={() => onSelectChat(chat.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      <span className="font-medium">Chat:</span> <span className="font-normal">{new Date(chat.timestamp).toLocaleDateString()}</span>
                    </h3>
                    {chat.firstMessage && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {chat.firstMessage}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(chat.id);
                    }}
                    className="ml-2 text-gray-400 hover:text-red-500 flex-shrink-0"
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