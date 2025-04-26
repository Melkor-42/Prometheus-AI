import PeerFactory from './core/peer-factory.js';
import { Message, MessageType, MessageRole } from './models/message.js';
import { messageStore } from './models/message-store.js';
import { userIdentity } from './services/identity.js';
import llmService from './services/llm-service.js';

/**
 * Main entry point for the P2P application
 * Uses a factory pattern to create the appropriate peer implementation
 * based on whether the user wants to host an LLM
 */

// Store the active peer instance
let activePeerInstance = null;

/**
 * Initialize the P2P system
 * @param {boolean} isHost - Whether the user wants to host an LLM
 * @returns {Object} Peer instance API
 */
function initialize(isHost = false) {
  console.log(`Initializing P2P system, isHost: ${isHost}`);
  
  // Clean up any existing instance
  if (activePeerInstance) {
    console.log('Cleaning up previous peer instance');
    activePeerInstance.leaveRoom().catch(err => {
      console.error('Error leaving room:', err);
    });
  }

  activePeerInstance = PeerFactory.createPeerInstance(isHost);
  
  return createApi(activePeerInstance);
}

/**
 * Create a consistent API regardless of the underlying implementation
 * @param {Object} instance - Peer instance
 * @returns {Object} Unified API
 */
function createApi(instance) {
  return {
    // Room management
    createRoom: () => instance.createRoom(),
    joinRoom: (roomId, stealth) => instance.joinRoom(roomId, stealth),
    leaveRoom: () => instance.leaveRoom(),
    
    // Message handling
    sendMessage: (message, chatId) => instance.sendMessage(message, chatId),
    onNewMessage: (callback) => instance.onNewMessage(callback),
    onChatUpdate: (callback) => instance.onChatUpdate(callback),
    
    // Status information
    getPeerCount: () => instance.getPeerCount(),
    getPeers: () => instance.getPeers(),
    getCurrentTopic: () => instance.getCurrentTopic(),
    
    // User identity
    setDisplayName: (name) => instance.setDisplayName(name),
    getUserIdentity: () => instance.getUserIdentity(),
    
    // LLM hosting (only available on ServerPeer)
    setLLMConfig: (config) => {

      
      if (typeof instance.setLLMConfig === 'function') {
        return instance.setLLMConfig(config);
      }
      console.warn('LLM hosting is not available in client mode');
      return false;
    },
    
    setHostStatus: (isHost) => {
      if (typeof instance.setHostStatus === 'function') {
        return instance.setHostStatus(isHost);
      }
      console.warn('Host status cannot be changed in client mode');
      return false;
    },
    
    // Chat management
    getChats: () => instance.getChats(),
    getChat: (chatId) => instance.getChat(chatId),
    createChat: () => instance.createChat(),
    deleteChat: (chatId) => instance.deleteChat(chatId)
  };
}

// Create the default client instance
const defaultApi = initialize(false);

// // Legacy message handler (for backward compatibility)
// function onMessage(callback) {
//   if (activePeerInstance) {
//     activePeerInstance.onMessage(callback);
//   }
// }

// Export default API and the initialize function to allow changing modes
export default {
  ...defaultApi,
  initialize
};

// Export message handler function for backward compatibility
// export { onMessage, Message, MessageType, MessageRole }; 
export { Message, MessageType, MessageRole }; 