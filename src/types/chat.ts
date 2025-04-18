export interface Message {
  id: string;
  content: string;
  role: string;
  sender: {
    id: string;
    displayName: string;
  };
  timestamp: number;
  type: string;
  chatId: string;
  reasoning_content: string | null;
  isMe?: boolean;
}

export interface StructuredMessage extends Message {
  isMe: boolean;
}

export interface Room {
  id: string;
  peerCount: number;
}

export interface LLMConfig {
  provider: string;
  model: string;
  apiKey?: string;
}

export interface HostStatus {
  isHost: boolean;
  llmConfig?: LLMConfig;
}

export interface UserIdentity {
  id: string;
  displayName: string;
  hostStatus?: {
    isHost: boolean;
    llmConfig?: {
      provider: string;
      model: string;
      apiKey: string;
    };
  };
}

export interface ChatAPI {
  createRoom: () => Promise<string>;
  joinRoom: (topicHex: string) => Promise<boolean>;
  leaveRoom: () => Promise<boolean>;
  sendMessage: (message: string, chatId: string) => boolean;
  getPeerCount: () => number;
  getCurrentTopic: () => string | null;
  getPeers: () => Array<{id: string, displayName: string, joinedAt: number}>;
  getMessages: (roomId?: string) => StructuredMessage[];
  onNewMessage: (callback: (message: StructuredMessage) => void) => () => void;
  setDisplayName: (name: string) => string;
  getUserIdentity: () => UserIdentity;
  setLLMConfig: (config: {provider: string, model: string, apiKey: string}) => boolean;
  setHostStatus: (isHost: boolean) => {isHost: boolean, llmConfig?: {provider: string, model: string, apiKey: string}};
  onMessage: (callback: (peerName: string, message: string) => void) => void;
  
  // New chat management methods
  getChats: () => Promise<Map<string, Message[]>>;
  getChat: (chatId: string) => Promise<Message[]>;
  createChat: () => Promise<string>;
  deleteChat: (chatId: string) => Promise<void>;
  
  // Chat update listener
  onChatUpdate: (callback: (chats: Map<string, Message[]>) => void) => () => void;
}

// Define the global ChatAPI interface
declare global {
  interface Window {
    ChatAPI: ChatAPI;
    
    // Global message classes
    ChatMessage: any;
    MessageType: {
      TEXT: string;
      SYSTEM: string;
      IMAGE: string;
    };
    userIdentity: any;
    llmService?: any;
  }
} 