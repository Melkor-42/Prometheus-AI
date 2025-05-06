import crypto from 'hypercore-crypto';

/**
 * Message store to manage messages across chats
 */
class MessageStore {
  constructor() {
    this.messages = new Map(); // Map of chatId -> array of messages
    this.listeners = new Set(); // Message listeners
    this.chatListeners = new Set(); // Chat listeners
  }
  
  /**
   * Add a message to the store
   * @param {Message} message - Message to add
   */
  addMessage(message) {
    if (!message || !message.chatId) {
      console.error('Cannot add message without chatId');
      return;
    }
    
    // Get or create the chat array
    if (!this.messages.has(message.chatId)) {
      this.messages.set(message.chatId, []);
    }
    
    const chatMessages = this.messages.get(message.chatId);
    
    // Check if message already exists (based on id)
    const existingIndex = chatMessages.findIndex(m => m.id === message.id);
    if (existingIndex !== -1) {
      // Replace existing message
      chatMessages[existingIndex] = message;
    } else {
      // Add new message
      chatMessages.push(message);
    }
    
    // Notify listeners
    this._notifyListeners(message);
    this._notifyChatListeners();
  }
  
  /**
   * Get all messages for a chat
   * @param {string} chatId - Chat ID
   * @returns {Array} Array of messages
   */
  getChat(chatId) {
    return this.messages.get(chatId) || [];
  }
  
  /**
   * Get all chats
   * @returns {Map} Map of chatId -> array of messages
   */
  getChats() {
    return this.messages;
  }
  
  /**
   * Create a new chat
   * @returns {string} New chat ID
   */
  createChat() {
    const chatId = crypto.randomBytes(8).toString('hex');
    this.messages.set(chatId, []);
    this._notifyChatListeners();
    return chatId;
  }
  
  /**
   * Delete a chat
   * @param {string} chatId - Chat ID to delete
   * @returns {boolean} True if chat was deleted
   */
  deleteChat(chatId) {
    const result = this.messages.delete(chatId);
    if (result) {
      this._notifyChatListeners();
    }
    return result;
  }
  
  /**
   * Clear all messages for a room
   * @param {string} roomId - Room ID
   */
  clearRoom(roomId) {
    // In the new architecture, room and chat are separate concepts
    // This is left for backward compatibility
  }
  
  /**
   * Add a listener for new messages
   * @param {Function} callback - Function to call when a message is added
   * @returns {Function} Function to remove the listener
   */
  addListener(callback) {
    if (typeof callback !== 'function') return () => {};
    
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  /**
   * Add a listener for chat updates
   * @param {Function} callback - Function to call when chats are modified
   * @returns {Function} Function to remove the listener
   */
  addChatListener(callback) {
    if (typeof callback !== 'function') return () => {};
    
    this.chatListeners.add(callback);
    return () => this.chatListeners.delete(callback);
  }
  
  /**
   * Notify all message listeners
   * @private
   */
  _notifyListeners(message) {
    for (const listener of this.listeners) {
      try {
        listener(message);
      } catch (err) {
        console.error('Error in message listener:', err);
      }
    }
  }
  
  /**
   * Notify all chat listeners
   * @private
   */
  _notifyChatListeners() {
    // Pass the entire messages map to listeners instead of just the keys
    // This allows the frontend to access message contents for previews
    
    for (const listener of this.chatListeners) {
      try {
        listener(this.messages);
      } catch (err) {
        console.error('Error in chat listener:', err);
      }
    }
  }
}

// Create a singleton instance
const messageStore = new MessageStore();

export { messageStore }; 