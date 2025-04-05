export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  isMe: boolean;
  type?: string;
}

export interface StructuredMessage {
  id: string;
  content: string;
  sender: {
    id: string;
    displayName: string;
  };
  timestamp: number;
  type: string;
  room: string | null;
}

export interface Room {
  id: string;
  peerCount: number;
}

export interface UserIdentity {
  id: string;
  displayName: string;
}

// LLM related types
export interface LLMMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface LLMConversation {
  id: string;
  title: string;
  messages: LLMMessage[];
  metadata?: {
    createdAt: number;
    updatedAt: number;
  };
  addMessage: (message: LLMMessage) => void;
}

export interface LLMHost {
  peerId: string;
  name: string;
  displayName?: string;
  models: string[] | { id: string; name: string }[];
  provider: {
    name: string;
    type: string;
  };
}

export interface LLMRequestOptions {
  stream?: boolean;
  conversationId?: string | null;
}

export interface LLMResponse {
  requestId: string;
  conversationId: string | null;
  model: string;
  response?: any;
  error?: string;
}

export interface LLMStreamChunk {
  requestId: string;
  conversationId: string | null;
  chunk?: {
    choices?: Array<{
      delta?: {
        content?: string;
      };
    }>;
  };
  done: boolean;
  error?: string;
}

export interface ChatAPI {
  // Room management
  createRoom(): Promise<string>;
  joinRoom(roomId: string): Promise<void>;
  leaveRoom(): Promise<void>;
  getCurrentTopic(): string | null;
  
  // Message handling
  sendMessage(message: string): void;
  getMessages(): StructuredMessage[];
  onMessage(callback: (sender: string, message: string) => void): void;
  onNewMessage(callback: (message: StructuredMessage) => void): () => void;
  
  // Status information
  getPeerCount(): number;
  getPeers(): Array<{id: string, displayName: string, joinedAt: number}>;
  
  // User identity
  getUserIdentity(): UserIdentity;
  setDisplayName(name: string): UserIdentity;
  
  // LLM functionality
  initializeLLMHost(providerType: string, config: any): Promise<boolean>;
  getAvailableLLMHosts(): LLMHost[];
  sendLLMRequest(
    host: LLMHost, 
    model: string, 
    messages: LLMMessage[], 
    options: LLMRequestOptions,
    onResponse: (response: LLMResponse) => void,
    onChunk?: (chunk: LLMStreamChunk) => void
  ): Promise<string>;
}

// Define the global ChatAPI interface
declare global {
  interface Window {
    ChatAPI: {
      // Room management
      createRoom: () => Promise<string>;
      joinRoom: (topicHex: string) => Promise<boolean>;
      leaveRoom: () => Promise<boolean>;
      
      // Message handling
      sendMessage: (message: string) => boolean;
      getMessages: (roomId?: string) => StructuredMessage[];
      onNewMessage: (callback: (message: StructuredMessage) => void) => Function;
      
      // Status information
      getPeerCount: () => number;
      getCurrentTopic: () => string | null;
      getPeers: () => Array<{id: string, displayName: string, joinedAt: number}>;
      
      // User identity
      getUserIdentity: () => UserIdentity;
      setDisplayName: (name: string) => string;
      
      // Legacy
      onMessage: (callback: (peerName: string, message: string) => void) => void;
      
      // LLM-related methods
      initializeLLMHost: (provider: string, config: any) => Promise<boolean>;
      getAvailableLLMHosts: () => LLMHost[];
      sendLLMRequest: (
        host: LLMHost, 
        model: string, 
        messages: LLMMessage[], 
        options: LLMRequestOptions,
        onResponse: (response: LLMResponse) => void,
        onChunk: (chunk: LLMStreamChunk) => void
      ) => string;
    };
    
    // Global message classes
    ChatMessage: any;
    MessageType: {
      TEXT: string;
      SYSTEM: string;
      IMAGE: string;
    };
    userIdentity: any;
    
    // LLM-related globals
    llmService: {
      getAvailableProviders: () => string[];
      createProvider: (name: string, config: any) => any;
    };
    LLMMessage: {
      system: (content: string) => LLMMessage;
      user: (content: string) => LLMMessage;
      assistant: (content: string) => LLMMessage;
    };
    LLMConversation: any;
    conversationStore: {
      getConversation: (id: string) => LLMConversation;
      createConversation: (id: string, title: string) => LLMConversation;
      getAllConversations: () => LLMConversation[];
      addConversation: (conversation: LLMConversation) => void;
      updateConversation: (conversation: LLMConversation) => void;
      deleteConversation: (id: string) => boolean;
      addListener: (callback: (type: string, conversation: LLMConversation) => void) => Function;
    };
    llmHost: any;
    llmClient: any;
  }
} 