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
  hostStatus?: HostStatus;
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
      
      // LLM hosting
      setLLMConfig?: (config: LLMConfig) => void;
      setHostStatus?: (isHost: boolean) => void;
      
      // Legacy
      onMessage: (callback: (peerName: string, message: string) => void) => void;
    };
    
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