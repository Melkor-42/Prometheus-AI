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
  import('./backend.js').then(({ default: backend, onMessage }) => {
    console.log('Backend imported successfully');
    
    // Expose the backend API to the window object so it can be accessed from the frontend
    window.ChatAPI = {
      createRoom: async () => {
        return await backend.createRoom();
      },
      
      joinRoom: async (roomId) => {
        return await backend.joinRoom(roomId);
      },
      
      sendMessage: (message) => {
        return backend.sendMessage(message);
      },
      
      getPeerCount: () => {
        return backend.getPeerCount();
      },
      
      getCurrentTopic: () => {
        return backend.getCurrentTopic();
      },
      
      leaveRoom: async () => {
        return await backend.leaveRoom();
      },
      
      // Register a message handler
      onMessage: (callback) => {
        onMessage((peerName, message) => {
          callback(peerName, message);
        });
      }
    };
    
    // Dispatch an event when the ChatAPI is ready
    window.dispatchEvent(new Event('chatapi-ready'));
    console.log('ChatAPI is now available');
  }).catch(err => {
    console.error('Failed to import backend:', err);
  });
}

// Start waiting for Pear
waitForPear();

// If Pear provides a teardown function, use it for cleanup
if (typeof Pear !== 'undefined' && Pear.teardown) {
  Pear.teardown(() => {
    console.log('Cleaning up P2P connections...');
    // Any cleanup logic can go here
  });
}