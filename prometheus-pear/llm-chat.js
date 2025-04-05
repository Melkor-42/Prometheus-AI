/**
 * P2P LLM Chat Implementation
 * Allows peers to share access to their LLMs or connect to peers with LLMs
 */

import chat from './backend.js';
import { LLMMessage, conversationStore } from './llm-messages.js';
import llmService from './llm-service.js';

// Define app states
const AppState = {
  INITIALIZING: 'initializing',
  WELCOME: 'welcome',
  HOST_SETUP: 'host_setup',
  JOIN_SETUP: 'join_setup',
  CONNECTING: 'connecting',
  CHATTING: 'chatting',
  ERROR: 'error'
};

// LLM Chat implementation
class LLMChat {
  constructor() {
    // App state
    this.state = AppState.INITIALIZING;
    this.stateMessage = 'Initializing...';
    this.error = null;
    
    // DOM elements
    this.rootElement = null;
    this.chatContainer = null;
    
    // Conversation state
    this.activeConversationId = null;
    this.currentHost = null;
    this.selectedModel = null;
    this.isWaitingForResponse = false;
    
    // Listeners
    this.stateChangeListeners = [];
    this.messageListeners = [];
    this.availableHostsListeners = [];
    
    // Initialize
    this._initializeChatAPI();
  }
  
  /**
   * Initialize the Chat API
   */
  async _initializeChatAPI() {
    try {
      // Check if the bridge is available
      await this._waitForBridge();
      
      // Set up message listener
      chat.onNewMessage((message) => {
        // Handle regular chat messages
        this._notifyMessageListeners(message);
      });
      
      // Set the initial state
      this._changeState(AppState.WELCOME);
    } catch (error) {
      console.error('Failed to initialize Chat API:', error);
      this._changeState(AppState.ERROR, 'Failed to initialize chat API');
      this.error = error;
    }
  }
  
  /**
   * Wait for the bridge to become available
   */
  async _waitForBridge(timeout = 5000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const checkBridge = () => {
        if (chat && typeof chat.createRoom === 'function') {
          resolve();
        } else if (Date.now() - start > timeout) {
          reject(new Error('Timeout waiting for bridge'));
        } else {
          setTimeout(checkBridge, 100);
        }
      };
      checkBridge();
    });
  }
  
  /**
   * Change the current app state
   * @param {string} newState - New state
   * @param {string} message - Optional state message
   */
  _changeState(newState, message = '') {
    this.state = newState;
    this.stateMessage = message || '';
    
    // Notify listeners
    this._notifyStateListeners();
  }
  
  /**
   * Notify state change listeners
   */
  _notifyStateListeners() {
    for (const listener of this.stateChangeListeners) {
      try {
        listener(this.state, this.stateMessage);
      } catch (err) {
        console.error('Error in state change listener:', err);
      }
    }
  }
  
  /**
   * Notify message listeners
   */
  _notifyMessageListeners(message) {
    for (const listener of this.messageListeners) {
      try {
        listener(message);
      } catch (err) {
        console.error('Error in message listener:', err);
      }
    }
  }
  
  /**
   * Notify available hosts listeners
   */
  _notifyAvailableHostsListeners() {
    const hosts = this.getAvailableLLMHosts();
    for (const listener of this.availableHostsListeners) {
      try {
        listener(hosts);
      } catch (err) {
        console.error('Error in available hosts listener:', err);
      }
    }
  }
  
  /**
   * Get user identity
   */
  getUserIdentity() {
    return chat.getUserIdentity();
  }
  
  /**
   * Set user display name
   * @param {string} displayName - New display name
   */
  setDisplayName(displayName) {
    return chat.setDisplayName(displayName);
  }
  
  /**
   * Get available LLM hosts from connected peers
   */
  getAvailableLLMHosts() {
    return chat.getAvailableLLMHosts() || [];
  }
  
  /**
   * Initialize this user as an LLM host
   * @param {string} providerName - Provider name
   * @param {Object} config - Provider configuration
   */
  async initializeAsHost(providerName, config) {
    try {
      this._changeState(AppState.HOST_SETUP, 'Setting up LLM host...');
      
      // Validate provider and config
      if (!providerName) {
        throw new Error('Provider name is required');
      }
      
      // Check if the provider exists
      const providers = llmService.getAvailableProviders();
      if (!providers.includes(providerName)) {
        throw new Error(`Provider ${providerName} is not available`);
      }
      
      // Initialize the LLM host
      const success = await chat.initializeLLMHost(providerName, config);
      
      if (!success) {
        throw new Error(`Failed to initialize as LLM host with provider ${providerName}`);
      }
      
      // Create a new room
      const roomId = await chat.createRoom();
      
      if (!roomId) {
        throw new Error('Failed to create room');
      }
      
      this._changeState(AppState.CHATTING, `Hosting LLM with ${providerName}`);
      return roomId;
    } catch (error) {
      console.error('Error initializing as host:', error);
      this._changeState(AppState.ERROR, `Failed to initialize as host: ${error.message}`);
      this.error = error;
      return null;
    }
  }
  
  /**
   * Join a room with an LLM host
   * @param {string} roomId - Room ID to join
   */
  async joinRoom(roomId) {
    try {
      this._changeState(AppState.CONNECTING, `Joining room ${roomId}...`);
      
      // Join the room
      const success = await chat.joinRoom(roomId);
      
      if (!success) {
        throw new Error(`Failed to join room ${roomId}`);
      }
      
      // Wait for hosts to be discovered
      await this._waitForHosts(10000);
      
      this._changeState(AppState.CHATTING, `Joined room ${roomId}`);
      return true;
    } catch (error) {
      console.error('Error joining room:', error);
      this._changeState(AppState.ERROR, `Failed to join room: ${error.message}`);
      this.error = error;
      return false;
    }
  }
  
  /**
   * Wait for LLM hosts to be discovered
   * @param {number} timeout - Timeout in milliseconds
   */
  async _waitForHosts(timeout = 5000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const checkHosts = () => {
        const hosts = this.getAvailableLLMHosts();
        if (hosts.length > 0) {
          resolve(hosts);
        } else if (Date.now() - start > timeout) {
          resolve([]); // Resolve with empty list after timeout
        } else {
          setTimeout(checkHosts, 500);
        }
      };
      checkHosts();
    });
  }
  
  /**
   * Get available models from the selected host
   */
  getAvailableModels() {
    if (!this.currentHost) {
      return [];
    }
    
    return this.currentHost.models || [];
  }
  
  /**
   * Select an LLM host to use
   * @param {string} hostId - Host ID to select
   */
  selectHost(hostId) {
    const hosts = this.getAvailableLLMHosts();
    const host = hosts.find(h => h.peerId === hostId);
    
    if (!host) {
      console.error(`Host ${hostId} not found`);
      return false;
    }
    
    this.currentHost = host;
    
    // Select the first model by default
    if (host.models && host.models.length > 0) {
      this.selectedModel = host.models[0].id || host.models[0];
    }
    
    return true;
  }
  
  /**
   * Select a model from the current host
   * @param {string} modelId - Model ID to select
   */
  selectModel(modelId) {
    if (!this.currentHost) {
      return false;
    }
    
    const models = this.getAvailableModels();
    const model = models.find(m => (m.id || m) === modelId);
    
    if (!model) {
      console.error(`Model ${modelId} not found`);
      return false;
    }
    
    this.selectedModel = modelId;
    return true;
  }
  
  /**
   * Create a new conversation
   * @param {string} initialSystemPrompt - Optional system prompt
   */
  createConversation(initialSystemPrompt = null) {
    // Create a new conversation ID
    const conversationId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    
    // Initialize conversation
    const conversation = conversationStore.createConversation(conversationId);
    
    // Add system message if provided
    if (initialSystemPrompt) {
      conversation.addMessage(LLMMessage.system(initialSystemPrompt));
    }
    
    this.activeConversationId = conversationId;
    return conversationId;
  }
  
  /**
   * Get the current conversation
   */
  getCurrentConversation() {
    if (!this.activeConversationId) {
      return null;
    }
    
    return conversationStore.getConversation(this.activeConversationId);
  }
  
  /**
   * Send a message to the LLM
   * @param {string} content - User message content
   */
  async sendMessage(content) {
    if (!content || !this.currentHost || !this.selectedModel) {
      return false;
    }
    
    // Get or create conversation
    if (!this.activeConversationId) {
      this.createConversation();
    }
    
    const conversation = this.getCurrentConversation();
    if (!conversation) {
      console.error('No active conversation');
      return false;
    }
    
    // Add user message
    const userMessage = LLMMessage.user(content);
    conversation.addMessage(userMessage);
    
    // Notify message listeners
    this._notifyMessageListeners({
      type: 'llm-user-message',
      message: userMessage,
      conversationId: this.activeConversationId
    });
    
    // Set waiting state
    this.isWaitingForResponse = true;
    
    try {
      // Prepare messages for the LLM
      const messages = conversation.formatForAPI();
      
      // Options for the request
      const options = {
        stream: true,
        conversationId: this.activeConversationId
      };
      
      // Create the assistant message placeholder
      const assistantMessage = LLMMessage.assistant('');
      let fullResponse = '';
      
      // Add the assistant message to the conversation
      conversation.addMessage(assistantMessage);
      
      // Notify about the initial empty message
      this._notifyMessageListeners({
        type: 'llm-assistant-message-start',
        message: assistantMessage,
        conversationId: this.activeConversationId
      });
      
      // Send the request to the host
      await new Promise((resolve, reject) => {
        try {
          chat.sendLLMRequest(
            this.currentHost,
            this.selectedModel,
            messages,
            options,
            (response) => {
              // Handle complete response
              if (response.error) {
                console.error('Error from LLM host:', response.error);
                reject(new Error(response.error));
              } else if (!response.isStream) {
                // For non-streaming responses
                fullResponse = response.response?.content || response.response || '';
                assistantMessage.content = fullResponse;
                
                // Notify message update
                this._notifyMessageListeners({
                  type: 'llm-assistant-message-update',
                  message: assistantMessage,
                  conversationId: this.activeConversationId
                });
                
                resolve();
              }
            },
            (chunk) => {
              // Handle streaming chunk
              if (chunk.done) {
                resolve();
              } else if (chunk.chunk) {
                fullResponse += chunk.chunk;
                assistantMessage.content = fullResponse;
                
                // Notify message update
                this._notifyMessageListeners({
                  type: 'llm-assistant-message-update',
                  message: assistantMessage,
                  conversationId: this.activeConversationId
                });
              }
            }
          );
        } catch (err) {
          reject(err);
        }
      });
      
      // Notify message complete
      this._notifyMessageListeners({
        type: 'llm-assistant-message-complete',
        message: assistantMessage,
        conversationId: this.activeConversationId
      });
      
      return true;
    } catch (err) {
      console.error('Error sending message to LLM:', err);
      
      // Add error message
      const errorMessage = LLMMessage.system(`Error: ${err.message}`);
      conversation.addMessage(errorMessage);
      
      // Notify error
      this._notifyMessageListeners({
        type: 'llm-error',
        message: errorMessage,
        error: err,
        conversationId: this.activeConversationId
      });
      
      return false;
    } finally {
      // Reset waiting state
      this.isWaitingForResponse = false;
    }
  }
  
  /**
   * Register a state change listener
   * @param {Function} listener - Listener function
   */
  onStateChange(listener) {
    this.stateChangeListeners.push(listener);
    
    // Immediately call with current state
    listener(this.state, this.stateMessage);
    
    // Return unsubscribe function
    return () => {
      const index = this.stateChangeListeners.indexOf(listener);
      if (index !== -1) {
        this.stateChangeListeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Register a message listener
   * @param {Function} listener - Listener function
   */
  onMessage(listener) {
    this.messageListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.messageListeners.indexOf(listener);
      if (index !== -1) {
        this.messageListeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Register an available hosts listener
   * @param {Function} listener - Listener function
   */
  onAvailableHostsChange(listener) {
    this.availableHostsListeners.push(listener);
    
    // Immediately call with current hosts
    listener(this.getAvailableLLMHosts());
    
    // Start polling for host updates
    if (this.availableHostsListeners.length === 1) {
      this._startHostPolling();
    }
    
    // Return unsubscribe function
    return () => {
      const index = this.availableHostsListeners.indexOf(listener);
      if (index !== -1) {
        this.availableHostsListeners.splice(index, 1);
      }
      
      // Stop polling if no listeners
      if (this.availableHostsListeners.length === 0) {
        this._stopHostPolling();
      }
    };
  }
  
  // Polling for host updates
  _hostPollingInterval = null;
  
  _startHostPolling() {
    if (this._hostPollingInterval) return;
    
    this._hostPollingInterval = setInterval(() => {
      this._notifyAvailableHostsListeners();
    }, 2000);
  }
  
  _stopHostPolling() {
    if (this._hostPollingInterval) {
      clearInterval(this._hostPollingInterval);
      this._hostPollingInterval = null;
    }
  }
  
  /**
   * Leave the current room
   */
  async leaveRoom() {
    try {
      await chat.leaveRoom();
      this._changeState(AppState.WELCOME);
      
      // Reset state
      this.activeConversationId = null;
      this.currentHost = null;
      this.selectedModel = null;
      
      return true;
    } catch (error) {
      console.error('Error leaving room:', error);
      return false;
    }
  }
  
  /**
   * Get the room ID
   */
  getRoomId() {
    return chat.getCurrentTopic();
  }
}

// Create and export a singleton instance
const llmChat = new LLMChat();
export default llmChat; 