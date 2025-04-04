/**
 * Message list UI component for the P2P chat application
 */

import { MessageType } from './messages.js';

/**
 * Creates and manages a message list UI component
 */
export class MessageList {
  /**
   * Create a new MessageList instance
   * @param {HTMLElement} container - Container element for the message list
   * @param {Object} options - Configuration options
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = Object.assign({
      maxMessages: 100,
      messageDateFormat: {
        hour: '2-digit',
        minute: '2-digit'
      }
    }, options);
    
    this.messages = [];
    this.currentRoom = null;
    
    this._createUI();
    this._setupStyles();
  }
  
  /**
   * Create the message list UI
   * @private
   */
  _createUI() {
    this.element = document.createElement('div');
    this.element.className = 'message-list';
    
    this.messageContainer = document.createElement('div');
    this.messageContainer.className = 'message-container';
    
    this.element.appendChild(this.messageContainer);
    this.container.appendChild(this.element);
  }
  
  /**
   * Set up styles for the message list
   * @private
   */
  _setupStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .message-list {
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        background-color: #f5f5f5;
      }
      
      .message-container {
        flex: 1;
        overflow-y: auto;
        padding: 15px;
      }
      
      .message {
        margin-bottom: 10px;
        padding: 8px 12px;
        border-radius: 8px;
        max-width: 80%;
        word-wrap: break-word;
      }
      
      .message-self {
        background-color: #dcf8c6;
        align-self: flex-end;
        margin-left: auto;
      }
      
      .message-other {
        background-color: white;
        align-self: flex-start;
        margin-right: auto;
      }
      
      .message-system {
        background-color: #e0e0e0;
        color: #666;
        font-style: italic;
        margin: 5px auto;
        text-align: center;
        max-width: 90%;
      }
      
      .message-sender {
        font-weight: bold;
        margin-bottom: 3px;
      }
      
      .message-time {
        font-size: 0.8em;
        color: #888;
        margin-top: 3px;
        text-align: right;
      }
      
      .message-content {
        white-space: pre-wrap;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Set the current room ID
   * @param {string} roomId - Room ID
   */
  setRoom(roomId) {
    if (this.currentRoom === roomId) return;
    
    this.currentRoom = roomId;
    this.clearMessages();
    
    // Load the messages for this room
    if (roomId && window.ChatAPI) {
      const messages = window.ChatAPI.getMessages(roomId);
      if (messages && messages.length) {
        this.addMessages(messages);
      }
    }
  }
  
  /**
   * Clear all messages
   */
  clearMessages() {
    this.messages = [];
    this.messageContainer.innerHTML = '';
  }
  
  /**
   * Add a single message
   * @param {Object} message - Message object
   */
  addMessage(message) {
    // Don't add if it's for a different room
    if (message.room !== this.currentRoom) return;
    
    // Add to the messages array
    this.messages.push(message);
    
    // Trim messages if we're over the limit
    if (this.messages.length > this.options.maxMessages) {
      this.messages.shift();
      
      // Remove the first message from the DOM
      if (this.messageContainer.firstChild) {
        this.messageContainer.removeChild(this.messageContainer.firstChild);
      }
    }
    
    // Create the message element
    const messageElement = this._createMessageElement(message);
    
    // Add the message to the container
    this.messageContainer.appendChild(messageElement);
    
    // Scroll to the bottom
    this.scrollToBottom();
  }
  
  /**
   * Add multiple messages
   * @param {Array} messages - Array of message objects
   */
  addMessages(messages) {
    if (!Array.isArray(messages) || !messages.length) return;
    
    // Sort messages by timestamp
    const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);
    
    // Add each message
    sortedMessages.forEach(message => {
      this.addMessage(message);
    });
  }
  
  /**
   * Create a message element
   * @private
   * @param {Object} message - Message object
   * @returns {HTMLElement} Message element
   */
  _createMessageElement(message) {
    const messageElement = document.createElement('div');
    
    // Determine message type and set appropriate class
    if (message.type === MessageType.SYSTEM) {
      messageElement.className = 'message message-system';
      
      const content = document.createElement('div');
      content.className = 'message-content';
      content.textContent = message.content;
      
      messageElement.appendChild(content);
    } else {
      // Check if the message is from the current user
      const identity = window.ChatAPI.getUserIdentity();
      const isSelf = message.sender.id === identity.id;
      
      messageElement.className = `message ${isSelf ? 'message-self' : 'message-other'}`;
      
      // Create sender element
      if (!isSelf) {
        const sender = document.createElement('div');
        sender.className = 'message-sender';
        sender.textContent = message.sender.displayName || message.sender.id;
        messageElement.appendChild(sender);
      }
      
      // Create content element
      const content = document.createElement('div');
      content.className = 'message-content';
      content.textContent = message.content;
      messageElement.appendChild(content);
      
      // Create time element
      const time = document.createElement('div');
      time.className = 'message-time';
      
      const date = new Date(message.timestamp);
      time.textContent = date.toLocaleTimeString(undefined, this.options.messageDateFormat);
      
      messageElement.appendChild(time);
    }
    
    return messageElement;
  }
  
  /**
   * Scroll to the bottom of the message list
   */
  scrollToBottom() {
    this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
  }
  
  /**
   * Set up message listener
   */
  setupMessageListener() {
    if (!window.ChatAPI) {
      console.error('ChatAPI not available');
      return;
    }
    
    // Listen for new messages
    window.ChatAPI.onNewMessage(message => {
      if (message.room === this.currentRoom) {
        this.addMessage(message);
      }
    });
  }
}

/**
 * Create and initialize a message list component
 * @param {HTMLElement} container - Container element for the message list
 * @param {Object} options - Configuration options
 * @returns {MessageList} Message list instance
 * 
 * Example usage:
 * 
 * // Create message list
 * const messageList = createMessageList(document.getElementById('chat-container'));
 * 
 * // Set the current room
 * messageList.setRoom('room-id');
 * 
 * // Set up message listener
 * messageList.setupMessageListener();
 */
export function createMessageList(container, options = {}) {
  return new MessageList(container, options);
} 