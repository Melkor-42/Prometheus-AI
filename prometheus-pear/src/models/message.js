import crypto from 'hypercore-crypto';

/**
 * Message types enum
 */
const MessageType = {
  TEXT: 'text',
  SYSTEM: 'system',
  IMAGE: 'image',
  FILE: 'file'
};

/**
 * Message roles enum
 */
const MessageRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
};

/**
 * Message class for storing and serializing chat messages
 */
class Message {
  /**
   * Create a new message
   * @param {string} content - Message content
   * @param {string} role - Message role (user, assistant, system)
   * @param {string} userId - User ID
   * @param {string} type - Message type
   * @param {string} chatId - Chat ID
   * @param {string} displayName - Display name
   * @param {string} reasoningContent - Optional reasoning content
   */
  constructor(content, role, userId, type, chatId, displayName, reasoningContent = null) {
    this.id = crypto.randomBytes(8).toString('hex');
    this.content = content || '';
    this.role = role || MessageRole.USER;
    this.sender = {
      id: userId,
      displayName: displayName || 'Unknown'
    };
    this.type = type || MessageType.TEXT;
    this.timestamp = Date.now();
    this.chatId = chatId;
    this.reasoningContent = reasoningContent;
  }
  
  /**
   * Create a system message
   * @param {string} content - Message content
   * @param {string} chatId - Chat ID
   * @returns {Message} New system message
   */
  static system(content, chatId) {
    return new Message(
      content,
      MessageRole.SYSTEM,
      'system',
      MessageType.SYSTEM,
      chatId,
      'System'
    );
  }
  
  /**
   * Serialize the message to JSON
   * @returns {string} Serialized message
   */
  serialize() {
    return JSON.stringify(this);
  }
  
  /**
   * Deserialize a message from JSON
   * @param {string} serialized - Serialized message
   * @returns {Message} Deserialized message
   */
  static fromSerialized(serialized) {
    try {
      const data = JSON.parse(serialized);
      
      // Handle array of messages (for conversations)
      if (Array.isArray(data)) {
        return data.map(msg => Message.fromObject(msg));
      }
      
      // Handle single message
      return Message.fromObject(data);
    } catch (err) {
      console.error('Error deserializing message:', err);
      return null;
    }
  }
  
  /**
   * Create a message from a plain object
   * @param {Object} obj - Plain object with message properties
   * @returns {Message} New message
   */
  static fromObject(obj) {
    // Determine correct user ID and display name from object
    // Check for sender property first, fall back to direct properties
    const userId = obj.sender?.id || obj.userId;
    const displayName = obj.sender?.displayName || obj.displayName;
    
    const message = new Message(
      obj.content,
      obj.role,
      userId,
      obj.type,
      obj.chatId,
      displayName,
      obj.reasoningContent
    );
    
    message.id = obj.id || message.id;
    message.timestamp = obj.timestamp || message.timestamp;
    
    return message;
  }
}

export { Message, MessageType, MessageRole }; 