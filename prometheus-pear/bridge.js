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
    import('./src/main.js'),
    import('./src/services/llm-service.js')
  ]).then(([mainModule, llmServiceModule]) => {
    console.log('Main module and LLM service imported successfully');
    
    // const { default: api, onMessage } = mainModule;
    const { default: api } = mainModule;
    const { default: llmService } = llmServiceModule;
    
    // Expose the backend API to the window object so it can be accessed from the frontend
    window.ChatAPI = {
      // Room management
      createRoom: async () => {
        return await api.createRoom();
      },
      
      joinRoom: async (roomId) => {
        return await api.joinRoom(roomId);
      },
      
      leaveRoom: async () => {
        return await api.leaveRoom();
      },
      
      // Message handling
      sendMessage: (message, chatId) => {
        return api.sendMessage(message, chatId);
      },
      
      getMessages: (roomId) => {
        return api.getMessages(roomId);
      },
      
      onNewMessage: (callback) => {
        return api.onNewMessage(callback);
      },
      
      // Chat update listener
      onChatUpdate: (callback) => {
        return api.onChatUpdate(callback);
      },
      
      // Status information
      getPeerCount: () => {
        return api.getPeerCount();
      },
      
      getPeers: () => {
        return api.getPeers();
      },
      
      getCurrentTopic: () => {
        return api.getCurrentTopic();
      },
      
      // User identity management
      setDisplayName: (name) => {
        return api.setDisplayName(name);
      },
      
      getUserIdentity: () => {
        return api.getUserIdentity();
      },
      
      // LLM hosting
      setLLMConfig: (config) => {
        return api.setLLMConfig(config);
      },
      
      setHostStatus: (isHost) => {
        // This will reinitialize the chat system with the appropriate implementation
        window.ChatAPI = {
          ...window.ChatAPI,
          ...api.initialize(isHost)
        };
        return true;
      },
      
      // // Legacy message handler (for backwards compatibility)
      // onMessage: (callback) => {
      //   onMessage((peerName, message) => {
      //     callback(peerName, message);
      //   });
      // },
      
      // Chat management
      getChats: () => {
        return api.getChats();
      },

      getChat: (chatId) => {
        return api.getChat(chatId);
      },
      
      createChat: () => {
        return api.createChat();
      },
      
      deleteChat: async (chatId) => {
        return await api.deleteChat(chatId);
      }
    };
    
    // Expose the LLM service globally
    window.llmService = llmService;
    
    // Also import the message and identity modules to make them available globally
    Promise.all([
      import('./src/models/message.js'),
      import('./src/services/identity.js')
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