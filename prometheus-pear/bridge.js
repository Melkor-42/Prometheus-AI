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
  // Now we can safely import the backend
  Promise.all([
    import('./backend.js'),
    import('./llm-service.js')
  ]).then(([backendModule, llmServiceModule]) => {
    console.log('Backend and LLM service imported successfully');
    
    const { default: backend, onMessage } = backendModule;
    const { default: llmService } = llmServiceModule;
    
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
      
      // LLM hosting
      setLLMConfig: (config) => {
        return backend.setLLMConfig(config);
      },
      
      setHostStatus: (isHost) => {
        return backend.setHostStatus(isHost);
      },
      
      // Legacy message handler (for backwards compatibility)
      onMessage: (callback) => {
        onMessage((peerName, message) => {
          callback(peerName, message);
        });
      },
      
      // Chat management
      getChats: () => {
        return backend.getChats();
      },

      getChat: () => {
        return backend.getChat(chatId);
      },
      
      createChat: async () => {
        return await backend.createChat();
      },
      
      deleteChat: async (chatId) => {
        return await backend.deleteChat(chatId);
      }
    };
    
    // Expose the LLM service globally
    window.llmService = llmService;
    
    // Also import the message and identity modules to make them available globally
    Promise.all([
      import('./messages.js'),
      import('./identity.js')
    ]).then(([messageModule, identityModule]) => {
      window.ChatMessage = messageModule.Message;
      window.MessageType = messageModule.MessageType;
      window.userIdentity = identityModule.userIdentity;
      console.log('Message and identity modules imported');
    }).catch(err => {
      console.error('Failed to import modules:', err);
    });
    
    // Dispatch an event when the ChatAPI is ready
    window.dispatchEvent(new Event('chatapi-ready'));
    console.log('ChatAPI is now available');
  }).catch(err => {
    console.error('Failed to import backend:', err);
  });
}

// Start waiting for Pear
waitForPear();