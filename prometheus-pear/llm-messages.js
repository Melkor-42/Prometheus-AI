/**
 * LLM chat message types and utilities
 */

// Message roles
export const MessageRole = {
  SYSTEM: 'system',
  USER: 'user',
  ASSISTANT: 'assistant'
};

/**
 * Creates a structured LLM message object
 */
export class LLMMessage {
  /**
   * Create a new LLM message
   * @param {string} role - Message role (system, user, assistant)
   * @param {string} content - Message content
   * @param {string} messageId - Optional message ID
   */
  constructor(role, content, messageId = null) {
    this.id = messageId || Date.now().toString(36) + Math.random().toString(36).substring(2);
    this.role = role;
    this.content = content;
    this.timestamp = Date.now();
  }

  /**
   * Format the message for LLM API consumption
   * @returns {Object} Formatted message for LLM APIs
   */
  formatForLLM() {
    return {
      role: this.role,
      content: this.content
    };
  }

  /**
   * Create a system message
   * @param {string} content - System message content
   * @returns {LLMMessage} System message
   */
  static system(content) {
    return new LLMMessage(MessageRole.SYSTEM, content);
  }

  /**
   * Create a user message
   * @param {string} content - User message content
   * @returns {LLMMessage} User message
   */
  static user(content) {
    return new LLMMessage(MessageRole.USER, content);
  }

  /**
   * Create an assistant message
   * @param {string} content - Assistant message content
   * @returns {LLMMessage} Assistant message
   */
  static assistant(content) {
    return new LLMMessage(MessageRole.ASSISTANT, content);
  }
}

/**
 * Manages a conversation with an LLM
 */
export class LLMConversation {
  /**
   * Create a new LLM conversation
   * @param {string} id - Conversation ID
   * @param {string} title - Conversation title
   * @param {Array<LLMMessage>} messages - Initial messages
   * @param {Object} metadata - Additional metadata
   */
  constructor(id = null, title = 'New Conversation', messages = [], metadata = {}) {
    this.id = id || Date.now().toString(36) + Math.random().toString(36).substring(2);
    this.title = title;
    this.messages = [...messages];
    this.metadata = {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...metadata
    };
  }

  /**
   * Add a message to the conversation
   * @param {LLMMessage} message - Message to add
   */
  addMessage(message) {
    this.messages.push(message);
    this.metadata.updatedAt = Date.now();
  }

  /**
   * Format all messages for LLM API consumption
   * @returns {Array<Object>} Formatted messages for LLM APIs
   */
  formatMessagesForLLM() {
    return this.messages.map(msg => msg.formatForLLM());
  }

  /**
   * Create a new conversation with a system message
   * @param {string} systemMessage - System message content
   * @param {string} title - Conversation title
   * @returns {LLMConversation} New conversation with system message
   */
  static withSystemMessage(systemMessage, title = 'New Conversation') {
    const systemMsg = LLMMessage.system(systemMessage);
    return new LLMConversation(null, title, [systemMsg]);
  }

  /**
   * Serialize the conversation for storage or transmission
   * @returns {Object} Serialized conversation
   */
  serialize() {
    return {
      id: this.id,
      title: this.title,
      messages: this.messages,
      metadata: this.metadata
    };
  }

  /**
   * Create a conversation from serialized data
   * @param {Object} data - Serialized conversation data
   * @returns {LLMConversation} Deserialized conversation
   */
  static fromSerialized(data) {
    return new LLMConversation(
      data.id,
      data.title,
      data.messages.map(msg => new LLMMessage(msg.role, msg.content, msg.id)),
      data.metadata
    );
  }
}

/**
 * Store for managing multiple LLM conversations
 */
export class LLMConversationStore {
  constructor() {
    this.conversations = new Map();
    this.listeners = new Set();
  }

  /**
   * Add a conversation to the store
   * @param {LLMConversation} conversation - Conversation to add
   */
  addConversation(conversation) {
    this.conversations.set(conversation.id, conversation);
    this._notifyListeners('add', conversation);
  }

  /**
   * Get a conversation by ID
   * @param {string} id - Conversation ID
   * @returns {LLMConversation|undefined} Conversation if found
   */
  getConversation(id) {
    return this.conversations.get(id);
  }

  /**
   * Get all conversations
   * @returns {Array<LLMConversation>} All conversations
   */
  getAllConversations() {
    return Array.from(this.conversations.values());
  }

  /**
   * Update a conversation in the store
   * @param {LLMConversation} conversation - Updated conversation
   */
  updateConversation(conversation) {
    if (this.conversations.has(conversation.id)) {
      this.conversations.set(conversation.id, conversation);
      this._notifyListeners('update', conversation);
    }
  }

  /**
   * Delete a conversation from the store
   * @param {string} id - Conversation ID
   * @returns {boolean} True if the conversation was deleted
   */
  deleteConversation(id) {
    const conversation = this.conversations.get(id);
    if (conversation) {
      this.conversations.delete(id);
      this._notifyListeners('delete', conversation);
      return true;
    }
    return false;
  }

  /**
   * Add a listener for conversation changes
   * @param {Function} callback - Called with (eventType, conversation)
   * @returns {Function} Function to remove the listener
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify listeners about a change
   * @private
   * @param {string} eventType - Event type ('add', 'update', 'delete')
   * @param {LLMConversation} conversation - The affected conversation
   */
  _notifyListeners(eventType, conversation) {
    for (const listener of this.listeners) {
      try {
        listener(eventType, conversation);
      } catch (err) {
        console.error('Error in conversation listener:', err);
      }
    }
  }
}

// Export a singleton instance of the conversation store
export const conversationStore = new LLMConversationStore(); 