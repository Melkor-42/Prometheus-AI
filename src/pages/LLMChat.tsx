import { useState, useEffect, useRef, FormEvent } from 'react';
import { 
  LLMHost, 
  LLMMessage as LLMMessageType, 
  LLMResponse, 
  LLMStreamChunk
} from '../types/chat';

interface LLMChatProps {
  roomId: string | null;
  onLeaveRoom: () => void;
}

type ChatState = 'initial' | 'hosting' | 'joining' | 'chatting';
type ProviderType = 'venice' | 'mock';

// Simple message component
const Message = ({ 
  message, 
  isUser 
}: { 
  message: LLMMessageType, 
  isUser: boolean 
}) => {
  // Format message content with basic markdown
  const formatContent = (content: string) => {
    if (!content) return '';
    
    // Convert new lines to break tags
    let html = content.replace(/\n/g, '<br />');
    
    // Handle code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Handle inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    return html;
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] rounded-lg px-4 py-2 ${isUser ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-white'}`}>
        <div dangerouslySetInnerHTML={{ __html: formatContent(message.content) }} />
        <div className="text-xs opacity-70 mt-1 text-right">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

// Thinking indicator animation
const ThinkingIndicator = () => {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2">
        <div className="flex space-x-2">
          <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-300 animate-bounce" style={{ animationDelay: '600ms' }}></div>
        </div>
      </div>
    </div>
  );
};

const LLMChat = ({ roomId, onLeaveRoom }: LLMChatProps) => {
  const [chatState, setChatState] = useState<ChatState>('initial');
  const [provider, setProvider] = useState<ProviderType>('venice');
  const [apiKey, setApiKey] = useState('');
  const [availableHosts, setAvailableHosts] = useState<LLMHost[]>([]);
  const [selectedHost, setSelectedHost] = useState<LLMHost | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [messages, setMessages] = useState<LLMMessageType[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const hostsPollingRef = useRef<number | null>(null);

  // Initialize state based on roomId
  useEffect(() => {
    if (roomId) {
      setTimeout(() => {
        startPollingForHosts();
      }, 1000); // Give a bit of time for connections to establish
    }
  }, [roomId]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (hostsPollingRef.current !== null) {
        window.clearInterval(hostsPollingRef.current);
      }
    };
  }, []);

  const startPollingForHosts = () => {
    // Immediate first check
    checkForHosts();
    
    // Then start polling
    if (hostsPollingRef.current === null) {
      hostsPollingRef.current = window.setInterval(checkForHosts, 2000);
    }
  };

  const checkForHosts = () => {
    if (window.ChatAPI) {
      const hosts = window.ChatAPI.getAvailableLLMHosts();
      setAvailableHosts(hosts);
    }
  };

  const handleHostSetup = async (e: FormEvent) => {
    e.preventDefault();
    
    setChatState('hosting');
    
    // Initialize host based on provider
    let config;
    if (provider === 'venice') {
      config = { apiKey, defaultModel: 'venice' };
    } else {
      config = { delay: 1000 };
    }
    
    try {
      const success = await window.ChatAPI.initializeLLMHost(provider === 'venice' ? 'VeniceAI' : 'MockProvider', config);
      
      if (success) {
        setChatState('chatting');
        // Create a new conversation
        if (window.conversationStore) {
          const newConvId = Date.now().toString(36) + Math.random().toString(36).substring(2);
          const conv = window.conversationStore.createConversation(newConvId, "New Conversation");
          
          // Add system message
          const systemMessage = window.LLMMessage.system(
            "You are a helpful AI assistant in a peer-to-peer chat. The user is connecting directly to someone hosting you."
          );
          conv.addMessage(systemMessage);
          
          setConversationId(newConvId);
          
          // Add welcome message to UI
          setMessages([
            {
              id: 'system-welcome',
              role: 'system',
              content: 'You are now hosting an LLM. Other users can join your room and chat with your LLM.',
              timestamp: Date.now()
            }
          ]);
        }
      } else {
        setChatState('initial');
        alert('Failed to initialize LLM host');
      }
    } catch (error) {
      console.error(error);
      setChatState('initial');
      alert('An error occurred while setting up the LLM host');
    }
  };

  const handleJoinChat = (host: LLMHost) => {
    setSelectedHost(host);
    
    // Select first model by default
    if (host.models && host.models.length > 0) {
      const firstModel = typeof host.models[0] === 'string' 
        ? host.models[0] 
        : (host.models[0] as any).id || (host.models[0] as any).name;
      
      setSelectedModel(firstModel);
    }
    
    setChatState('chatting');
    
    // Create a new conversation
    if (window.conversationStore) {
      const newConvId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      const conv = window.conversationStore.createConversation(newConvId, "New Conversation");
      
      // Add system message
      const systemMessage = window.LLMMessage.system(
        "You are a helpful AI assistant in a peer-to-peer chat. The user is connecting directly to someone hosting you."
      );
      conv.addMessage(systemMessage);
      
      setConversationId(newConvId);
    }
    
    // Add welcome message to UI
    setMessages([
      {
        id: 'system-welcome',
        role: 'system',
        content: `Connected to ${host.displayName || host.name}'s LLM (${host.provider.name})`,
        timestamp: Date.now()
      }
    ]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || (selectedHost === null && chatState !== 'hosting')) return;
    
    // Create user message
    const userMessage = window.LLMMessage.user(inputMessage);
    
    // Add to messages state for UI
    setMessages(prevMessages => [
      ...prevMessages,
      { ...userMessage } as LLMMessageType
    ]);
    
    setInputMessage('');
    setIsThinking(true);
    
    try {
      // Get the conversation
      const conversation = window.conversationStore.getConversation(conversationId!);
      
      // Add user message to conversation
      conversation.addMessage(userMessage);
      
      // Format messages for API
      const apiMessages = conversation.messages.map((msg: LLMMessageType) => ({
        role: msg.role,
        content: msg.content,
        id: msg.id,
        timestamp: msg.timestamp
      }));
      
      // Create placeholder for assistant response
      const assistantMessage = window.LLMMessage.assistant('');
      let fullResponse = '';
      
      // Add empty message to conversation
      conversation.addMessage(assistantMessage);
      
      // Request options
      const options = {
        stream: true,
        conversationId: conversationId
      };
      
      if (chatState === 'hosting') {
        // We're hosting - use our own LLM
        await new Promise<void>((resolve, reject) => {
          try {
            // Get hosts including ourself
            const hosts = window.ChatAPI.getAvailableLLMHosts();
            const myHost = hosts[0]; // First host should be us
            
            if (!myHost) {
              throw new Error('Failed to find local LLM host');
            }
            
            // Host specific model selection logic
            const model = myHost.models && myHost.models.length > 0 
              ? (typeof myHost.models[0] === 'string' 
                ? myHost.models[0] 
                : (myHost.models[0] as any).id || (myHost.models[0] as any).name)
              : 'default';
            
            window.ChatAPI.sendLLMRequest(
              myHost,
              model,
              apiMessages,
              options,
              (response: LLMResponse) => {
                if (response.error) {
                  reject(new Error(response.error));
                }
              },
              (chunk: LLMStreamChunk) => {
                if (chunk.done) {
                  assistantMessage.content = fullResponse;
                  resolve();
                } else if (chunk.chunk) {
                  // Extract content from chunk
                  const content = chunk.chunk.choices?.[0]?.delta?.content || '';
                  if (content) {
                    fullResponse += content;
                    // Update the message in conversation
                    assistantMessage.content = fullResponse;
                    
                    // Force update UI with current response text
                    setMessages(prevMessages => {
                      const messages = [...prevMessages];
                      const lastMessageIndex = messages.findIndex(m => m.id === assistantMessage.id);
                      
                      if (lastMessageIndex === -1) {
                        // Add assistant message if not already in list
                        messages.push({...assistantMessage, content: fullResponse} as LLMMessageType);
                      } else {
                        // Update content of existing message
                        messages[lastMessageIndex] = {...messages[lastMessageIndex], content: fullResponse};
                      }
                      
                      return messages;
                    });
                  }
                }
              }
            );
          } catch (err) {
            reject(err);
          }
        });
      } else if (selectedHost) {
        // We're connected to a host
        await new Promise<void>((resolve, reject) => {
          try {
            window.ChatAPI.sendLLMRequest(
              selectedHost,
              selectedModel,
              apiMessages,
              options,
              (response: LLMResponse) => {
                if (response.error) {
                  reject(new Error(response.error));
                }
              },
              (chunk: LLMStreamChunk) => {
                if (chunk.done) {
                  assistantMessage.content = fullResponse;
                  resolve();
                } else if (chunk.chunk) {
                  // Extract content from chunk
                  const content = chunk.chunk.choices?.[0]?.delta?.content || '';
                  if (content) {
                    fullResponse += content;
                    // Update the message in conversation
                    assistantMessage.content = fullResponse;
                    
                    // Force update UI with current response text
                    setMessages(prevMessages => {
                      const messages = [...prevMessages];
                      const lastMessageIndex = messages.findIndex(m => m.id === assistantMessage.id);
                      
                      if (lastMessageIndex === -1) {
                        // Add assistant message if not already in list
                        messages.push({...assistantMessage, content: fullResponse} as LLMMessageType);
                      } else {
                        // Update content of existing message
                        messages[lastMessageIndex] = {...messages[lastMessageIndex], content: fullResponse};
                      }
                      
                      return messages;
                    });
                  }
                }
              }
            );
          } catch (err) {
            reject(err);
          }
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: 'error-' + Date.now(),
          role: 'system',
          content: `Error: ${(error as Error).message}`,
          timestamp: Date.now()
        } as LLMMessageType
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleLeaveRoom = async () => {
    // Clear polling
    if (hostsPollingRef.current !== null) {
      window.clearInterval(hostsPollingRef.current);
      hostsPollingRef.current = null;
    }
    
    // Leave the room
    await window.ChatAPI.leaveRoom();
    
    // Reset state
    setMessages([]);
    setAvailableHosts([]);
    setSelectedHost(null);
    setSelectedModel('');
    setConversationId(null);
    setChatState('initial');
    
    // Notify parent
    onLeaveRoom();
  };

  // Check if we're hosting or connecting to a host
  const isHosting = chatState === 'hosting' || (selectedHost === null && chatState === 'chatting');

  // Initial setup UI
  if (chatState === 'initial') {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 bg-white dark:bg-gray-800 shadow rounded-lg">
          <h2 className="text-xl font-bold mb-4">P2P LLM Chat</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Host an LLM Option */}
            <div 
              className="p-4 border rounded-lg hover:border-blue-500 cursor-pointer transition-colors"
              onClick={() => setChatState('hosting')}
            >
              <h3 className="font-bold text-lg mb-2">Host an LLM</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Host your own LLM and allow others to connect to you.
              </p>
            </div>
            
            {/* Join existing room option - only enabled if we have roomId */}
            <div 
              className={`p-4 border rounded-lg ${roomId ? 'hover:border-blue-500 cursor-pointer' : 'opacity-50 cursor-not-allowed'} transition-colors`}
              onClick={() => roomId && setChatState('joining')}
            >
              <h3 className="font-bold text-lg mb-2">Join LLM Host</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {roomId 
                  ? 'Connect to an existing LLM host in this room.' 
                  : 'Join a room first to connect to LLM hosts.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Host setup UI
  if (chatState === 'hosting') {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 bg-white dark:bg-gray-800 shadow rounded-lg">
          <h2 className="text-xl font-bold mb-4">Host an LLM</h2>
          
          <form onSubmit={handleHostSetup}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">LLM Provider</label>
              <select 
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                value={provider}
                onChange={(e) => setProvider(e.target.value as ProviderType)}
              >
                <option value="venice">Venice AI</option>
                <option value="mock">Mock Provider (for testing)</option>
              </select>
            </div>
            
            {provider === 'venice' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">API Key</label>
                <input 
                  type="password"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Venice AI API key"
                  required
                />
              </div>
            )}
            
            <div className="flex justify-between">
              <button
                type="button"
                className="px-4 py-2 border rounded"
                onClick={() => setChatState('initial')}
              >
                Back
              </button>
              
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Start Hosting
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Join existing LLM host UI
  if (chatState === 'joining') {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 bg-white dark:bg-gray-800 shadow rounded-lg">
          <h2 className="text-xl font-bold mb-4">Join LLM Host</h2>
          
          {availableHosts.length === 0 ? (
            <div className="text-center p-4">
              <div className="flex justify-center mb-2">
                <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
              </div>
              <p>Looking for LLM hosts in this room...</p>
              <button
                className="mt-4 px-4 py-2 border rounded"
                onClick={() => setChatState('initial')}
              >
                Back
              </button>
            </div>
          ) : (
            <>
              <p className="mb-4">Select an LLM host to connect to:</p>
              
              <div className="space-y-2 mb-4">
                {availableHosts.map((host) => (
                  <div 
                    key={host.peerId}
                    className="p-3 border rounded-lg hover:border-blue-500 cursor-pointer transition-colors"
                    onClick={() => handleJoinChat(host)}
                  >
                    <div className="font-bold">{host.displayName || host.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Provider: {host.provider.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Models: {Array.isArray(host.models) && host.models.map(m => 
                        typeof m === 'string' ? m : (m as any).name || (m as any).id
                      ).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                className="px-4 py-2 border rounded"
                onClick={() => setChatState('initial')}
              >
                Back
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Chat UI
  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="p-3 bg-white dark:bg-gray-800 shadow flex justify-between items-center">
        <div>
          <h2 className="font-bold">
            {isHosting
              ? 'Hosting LLM'
              : `Connected to ${selectedHost?.displayName || selectedHost?.name}'s LLM`}
          </h2>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Room ID: {roomId}
          </div>
        </div>
        
        <button
          className="px-3 py-1 text-sm border rounded hover:bg-red-100"
          onClick={handleLeaveRoom}
        >
          Leave Room
        </button>
      </div>
      
      {/* Chat messages area */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        {messages.map((message) => (
          <Message 
            key={message.id} 
            message={message} 
            isUser={message.role === 'user'} 
          />
        ))}
        
        {isThinking && <ThinkingIndicator />}
        
        <div ref={messageEndRef} />
      </div>
      
      {/* Message input */}
      <div className="p-3 bg-white dark:bg-gray-800 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            placeholder="Type a message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isThinking}
          />
          <button
            className={`px-4 py-2 rounded ${isThinking || !inputMessage.trim() 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white'}`}
            onClick={handleSendMessage}
            disabled={isThinking || !inputMessage.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default LLMChat; 