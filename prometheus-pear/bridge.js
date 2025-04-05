/**
 * Bridge between the frontend and the Pear runtime.
 * 
 * This file exposes the backend API to the frontend and handles
 * communication with the Hyperswarm-based P2P network.
 */

import chatBackend from './backend.js';

// Expose the chat backend API to the window object
window.PrometheusChat = chatBackend;

// Log that the bridge has been loaded
console.log('P2P LLM Chat Bridge loaded successfully');

// Setup message handler for the chat backend
chatBackend.onMessage((sender, message) => {
  console.log(`Message from ${sender}: ${message}`);
});

// Wait for Pear to be available before initializing the backend
function waitForPear() {
  if (typeof Pear !== 'undefined') {
    console.log('Pear runtime detected, initializing bridge...');
    initializeBridge();
  } else {
    console.log('Waiting for Pear runtime...');
    setTimeout(waitForPear, 100);
  }
}

function initializeBridge() {
  // Import all required modules
  Promise.all([
    import('./backend.js'),
    import('./messages.js'),
    import('./identity.js'),
    import('./llm-service.js'),
    import('./llm-messages.js'),
    import('./llm-host.js')
  ]).then(([
    { default: backend, onMessage },
    messageModule,
    identityModule,
    { default: llmService },
    llmMessages,
    llmHost
  ]) => {
    console.log('All modules imported successfully');
    
    // Expose the backend API to the window object so it can be accessed from the frontend
    window.ChatAPI = {
      // Room management
      createRoom: async () => {
        return await backend.createRoom();
      },
      
      joinRoom: async (roomId) => {
        return await backend.joinRoom(roomId);
      },
      
      leaveRoom: async () => {
        return await backend.leaveRoom();
      },
      
      // Message handling
      sendMessage: (message) => {
        return backend.sendMessage(message);
      },
      
      getMessages: (roomId) => {
        return backend.getMessages(roomId);
      },
      
      onNewMessage: (callback) => {
        return backend.onNewMessage(callback);
      },
      
      // Status information
      getPeerCount: () => {
        return backend.getPeerCount();
      },
      
      getPeers: () => {
        return backend.getPeers();
      },
      
      getCurrentTopic: () => {
        return backend.getCurrentTopic();
      },
      
      // User identity management
      setDisplayName: (name) => {
        return backend.setDisplayName(name);
      },
      
      getUserIdentity: () => {
        return backend.getUserIdentity();
      },
      
      // Legacy message handler (for backwards compatibility)
      onMessage: (callback) => {
        onMessage((peerName, message) => {
          callback(peerName, message);
        });
      },
      
      // LLM-related methods
      initializeLLMHost: (provider, config) => {
        return backend.initializeLLMHost(provider, config);
      },
      
      getAvailableLLMHosts: () => {
        return backend.getAvailableLLMHosts();
      },
      
      sendLLMRequest: (host, model, messages, options, onResponse, onChunk) => {
        return backend.sendLLMRequest(host, model, messages, options, onResponse, onChunk);
      }
    };
    
    // Make all modules available globally
    window.ChatMessage = messageModule.Message;
    window.MessageType = messageModule.MessageType;
    window.userIdentity = identityModule.userIdentity;
    
    // LLM-related globals
    window.llmService = llmService;
    window.LLMMessage = llmMessages.LLMMessage;
    window.LLMConversation = llmMessages.LLMConversation;
    window.conversationStore = llmMessages.conversationStore;
    window.llmHost = llmHost.llmHost;
    window.llmClient = llmHost.llmClient;
    
    console.log('All modules exposed globally');
    
    // Dispatch an event when the ChatAPI is ready
    window.dispatchEvent(new Event('chatapi-ready'));
    console.log('ChatAPI is now available');
  }).catch(err => {
    console.error('Failed to import modules:', err);
  });
}

// Start waiting for Pear
waitForPear();