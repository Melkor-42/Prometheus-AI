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
   * @param {string} roomId - Room ID where the message was sent
   * @param {string} displayName - Sender's display name (optional)
   * @param {string} reasoning_content - Assistant's reasoning (optional)
   */
  constructor(content, role, senderId, type = MessageType.TEXT, roomId = null, displayName = null, reasoning_content = null) {
    this.id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    this.content = content;
    this.role = role;
    this.sender = {
      id: senderId,
      displayName: displayName || senderId
    };
    this.timestamp = Date.now();
    this.type = type;
    this.room = roomId;
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
      room: this.room,
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
        data.room,
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
   * @param {string} roomId - Room ID
   * @returns {Message} System message
   */
  static system(content, roomId = null) {
    return new Message(content, MessageRole.SYSTEM, 'system', MessageType.SYSTEM, roomId, 'System');
  }
}

/**
 * Simple in-memory message store
 */
export class MessageStore {
  constructor() {
    this.messages = new Map(); // roomId -> messages[]
    this.listeners = new Set();
  }

  /**
   * Add a message to the store
   * @param {Message} message - Message to add
   */
  addMessage(message) {
    if (!message.room) return;
    
    if (!this.messages.has(message.room)) {
      this.messages.set(message.room, []);
    }
    
    const roomMessages = this.messages.get(message.room);
    roomMessages.push(message);
    
    // Notify listeners
    this._notifyListeners(message);
  }

  /**
   * Get messages for a specific room
   * @param {string} roomId - Room ID
   * @returns {Message[]} Array of messages
   */
  getMessages(roomId) {
    return this.messages.get(roomId) || [];
  }


  /**
   * Clear messages for a room
   * @param {string} roomId - Room ID
   */
  clearRoom(roomId) {
    this.messages.delete(roomId);
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