/**
 * Message structure and handling for the P2P chat application
 */

// Message types
export const MessageType = {
  TEXT: 'text',
  SYSTEM: 'system',
  IMAGE: 'image'
};

// Message roles
export const MessageRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
};

/**
 * Creates a structured message object
 */
export class Message {
  /**
   * Create a new message
   * @param {string} content - The message content
   * @param {string} role - Message role (user/assistant/system)
   * @param {string} senderId - Sender's ID (peer name)
   * @param {string} type - Message type (default: text)
   * @param {string} chatId - Chat ID where the message was sent
   * @param {string} displayName - Sender's display name (optional)
   * @param {string} reasoning_content - Assistant's reasoning (optional)
   */
  constructor(content, role, senderId, type = MessageType.TEXT, chatId = null, displayName = null, reasoning_content = null) {
    this.id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    this.content = content;
    this.role = role;
    this.sender = {
      id: senderId,
      displayName: displayName || senderId
    };
    this.timestamp = Date.now();
    this.type = type;
    this.chatId = chatId;
    this.reasoning_content = reasoning_content;
  }

  /**
   * Serialize the message to a string for transmission
   */
  serialize() {
    return JSON.stringify({
      id: this.id,
      role: this.role,
      content: this.content,
      sender: this.sender,
      timestamp: this.timestamp,
      type: this.type,
      chatId: this.chatId,
      reasoning_content: this.reasoning_content
    });
  }

  /**
   * Create a message from a serialized string
   * @param {string} serialized - Serialized message
   * @returns {Message} Parsed message object
   */
  static fromSerialized(serialized) {
    try {
      const data = JSON.parse(serialized);
      const message = new Message(
        data.content,
        data.role,
        data.sender.senderId,
        data.type,
        data.chatId,
        data.sender.displayName,
        data.reasoning_content
      );
      message.id = data.id;
      message.timestamp = data.timestamp;
      return message;
    } catch (err) {
      console.error('Failed to parse message:', err);
    }
  }

  /**
   * Create a system message
   * @param {string} content - System message content
   * @param {string} chatId - Room ID
   * @returns {Message} System message
   */
  static system(content, chatId = null) {
    return new Message(content, MessageRole.SYSTEM, 'system', MessageType.SYSTEM, chatId, 'System');
  }
}

/**
 * Simple in-memory message store
 */
export class MessageStore {
  constructor() {
    this.chats = new Map(); // chatId -> messages[]
    this.listeners = new Set();
  }

  /**
   * Add a message to the store
   * @param {Message} message - Message to add
   */
  addMessage(message) {
    if (!message.chatId) return;
    
    if (!this.chats.has(message.chatId)) {
      this.chats.set(message.chatId, []);
    }
    
    const chatMessages = this.chats.get(message.chatId);
    chatMessages.push(message);
    
    // Notify listeners
    this._notifyListeners(message);
  }

  /**
   * Create a new chat
   * @returns {string} Chat ID
   */
  createChat() {
    // Generate a unique chat ID using timestamp and random string
    const chatId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    
    // Initialize empty message array for the chat
    this.chats.set(chatId, []);
    return chatId;
  }

  /**
   * Delete a chat
   * @param {string} chatId - Chat ID to delete
   * @returns {boolean} True if chat was deleted, false if it didn't exist
   */
  deleteChat(chatId) {
    if (!this.chats.has(chatId)) {
      return false;
    }
    
    // Remove the chat and its messages
    this.chats.delete(chatId);
    return true;
  }

  /**
   * Get all chats
   * @returns {Map<string, Message[]>} Map of chatId to array of messages
   */
  getChats() {
    return this.chats;
  }

  /**
   * Get messages for a specific chat
   * @param {string} chatId - Room ID
   * @returns {Message[]} Array of messages
   */
  getChat(chatId) {
    return this.chats.get(chatId) || [];
  }

  /**
   * Clear messages for a room
   * @param {string} chatId - Room ID
   */
  clearChat(chatId) {
    this.chats.delete(chatId);
  }

  /**
   * Add a listener for new messages
   * @param {Function} callback - Called when a new message is added
   * @returns {Function} Function to remove the listener
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners about a new message
   * @private
   * @param {Message} message - New message
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
}

// Export a singleton instance
export const messageStore = new MessageStore(); 