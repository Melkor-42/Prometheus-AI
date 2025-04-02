export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  isMe: boolean;
}

export interface Room {
  id: string;
  peerCount: number;
}

// Define the global ChatAPI interface
declare global {
  interface Window {
    ChatAPI: {
      createRoom: () => Promise<string>;
      joinRoom: (topicHex: string) => Promise<boolean>;
      sendMessage: (message: string) => boolean;
      getPeerCount: () => number;
      getCurrentTopic: () => string | null;
      leaveRoom: () => Promise<boolean>;
      onMessage: (callback: (peerName: string, message: string) => void) => void;
    };
  }
} 