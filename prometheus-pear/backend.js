import Hyperswarm from 'hyperswarm'   // Module for P2P networking and connecting peers
import crypto from 'hypercore-crypto' // Cryptographic functions for generating the key in app
import b4a from 'b4a'                 // Module for buffer-to-string and vice-versa conversions 
const { teardown, updates } = Pear    // Functions for cleanup and updates

import { Message, messageStore, MessageType, MessageRole } from './messages.js'
import { userIdentity } from './identity.js'
import llmService from './llm-service.js'

class P2PChat {
  constructor() {
    console.log('P2PChat: Creating Hyperswarm instance');
    this.swarm = new Hyperswarm();
    this.activeTopic = null;
    this.currentRoomId = null;
    this.swarmConnections = 0;
    this.messageCallback = null;
    this.peers = new Map(); // Store peer information
    this.llmProvider = null; // LLM provider instance
    
    // Set up event listeners
    this._setupEventListeners();
    
    // Handle Pear lifecycle
    teardown(() => {
      console.log('TEARDOWN: Destroying Hyperswarm instance and all connections');
      this.swarm.destroy();
    });
    updates(() => Pear.reload());
  }
  
  _setupEventListeners() {
    // Handle new connections
    this.swarm.on('connection', (peer) => {
      // Use first 6 chars of public key as peer name
      const id = b4a.toString(peer.remotePublicKey, 'hex');
      const name = id.substr(0, 6);
      
      console.log(`New peer connected: ${name}`);
      
      // Store peer information 
      this.peers.set(id, { 
        connection: peer,
        name: name,
        joinedAt: Date.now()
      });
      
      // Exchange identity information with new peer
      this._sendIdentity(peer);
      
      // Add system message about the new peer
      // if (this.currentRoomId) {
      //   const joinMessage = Message.system(`User ${name} joined the chat`, this.currentRoomId);
      //   messageStore.addMessage(joinMessage);
      // }
      
      // Handle incoming messages
      peer.on('data', serializedMessage => {
        try {
          // Try to parse as JSON first
          const data = JSON.parse(serializedMessage);
          
          // Handle identity updates
          if (data.type === 'identity') {
            this._handleIdentityMessage(id, data);
            return;
          }

          // Process message with LLM if we are the host
          const hostStatus = userIdentity.getHostStatus();
          if (hostStatus && hostStatus.isHost && this.llmProvider) {
            this._processWithLLM(data);
          } else{
            const message = Message.fromSerialized(serializedMessage);
            messageStore.addMessage(message);
          }
        } catch (err) {
          console.error('Error processing message:', err);
        }
      });
      
      peer.on('error', (e) => {
        const errorMsg = e?.message?.toLowerCase?.() || '';
      
        if (errorMsg.includes('connection reset by peer')) {
          console.log(`Peer ${name} disconnected (left the room)`);
        } else {
          console.error(`Connection error with peer ${name}:`, e);
        }
      });

      // Handle disconnections
      peer.on('close', () => {
        console.log(`Peer disconnected: ${name}`);
        const peerInfo = this.peers.get(id);
        this.peers.delete(id);
        
        // Add system message about peer leaving
        if (this.currentRoomId) {
          const displayName = peerInfo?.displayName || name;
          // const leaveMessage = Message.system(`User ${displayName} left the chat`, this.currentRoomId);
          // messageStore.addMessage(leaveMessage);
        }
      });
    });

    this.swarm.on('update', () => {
      this.swarmConnections = this.swarm.connections.size;
      console.log(`Peer count updated: ${this.swarmConnections} connected peers`);
    });
    
    // Listen for display name changes
    userIdentity.setOnDisplayNameChange((newName) => {
      this._broadcastIdentity();
    });
    
    // Listen for host status changes
    userIdentity.setOnHostStatusChange((hostStatus) => {
      this._broadcastIdentity();
    });
  }
  
  /**
   * Handle identity information from a peer
   * @private
   */
  _handleIdentityMessage(peerId, data) {
    if (!data.identity) return;
    
    const peerInfo = this.peers.get(peerId);
    if (!peerInfo) return;
    
    // Update peer info with display name
    if (data.identity.displayName) {
      peerInfo.displayName = data.identity.displayName;
      console.log(`Updated peer ${peerId} display name to: ${peerInfo.displayName}`);
    }
    
    // Update peer info with host status
    if (data.identity.hostStatus) {
      peerInfo.hostStatus = data.identity.hostStatus;
      console.log(`Updated peer ${peerId} host status:`, peerInfo.hostStatus);
    }
  }
  
  /**
   * Send identity information to a newly connected peer
   * @private
   */
  _sendIdentity(peer) {
    const identityMessage = {
      type: 'identity',
      identity: userIdentity.getIdentity()
    };
    
    try {
      peer.write(JSON.stringify(identityMessage));
    } catch (err) {
      console.error('Error sending identity:', err);
    }
  }
  
  /**
   * Broadcast identity to all connected peers
   * @private
   */
  _broadcastIdentity() {
    const identityMessage = {
      type: 'identity',
      identity: userIdentity.getIdentity()
    };
    
    const serialized = JSON.stringify(identityMessage);
    
    for (const [_, peerInfo] of this.peers) {
      try {
        peerInfo.connection.write(serialized);
      } catch (err) {
        console.error('Error broadcasting identity:', err);
      }
    }
  }
  
  /**
   * Process a message with the LLM and send the response
   * @private
   */
  async _processWithLLM(messages) {
    if (!this.llmProvider) return;

    try {
      // Call the LLM with the messages
      const hostStatus = userIdentity.getHostStatus()
      const model = hostStatus.llmConfig.model
      const response = await this.llmProvider.chatCompletion(
        model,
        messages,
        { temperature: 0.7, max_tokens: 500 }
      );
      
      // Extract the response text
      let responseText = '';
      let reasoningContent = null;
      
      if (response.choices && response.choices.length > 0) {
        responseText = response.choices[0].message.content;
        reasoningContent = response.choices[0].message.reasoning_content;
      } else {
        responseText = 'Sorry, I could not generate a response.';
      }
      
      // Create a message from the LLM response
      const identity = userIdentity.getIdentity();
      const botName = `${identity.displayName}'s LLM`;
      const chatId = messages[0].chatId
      
      const llmResponseMessage = new Message(
        responseText,
        MessageRole.ASSISTANT,
        identity.id,
        MessageType.TEXT,
        chatId,
        botName,
        reasoningContent
      );

      // Send to all peers
      const serialized = llmResponseMessage.serialize();
      for (const [_, peerInfo] of this.peers) {
        try {
          peerInfo.connection.write(serialized);
        } catch (err) {
          console.error('Error sending LLM response to peer:', err);
        }
      }
      
      console.log('Sent LLM response to peers');
    } catch (err) {
      console.error('Error processing message with LLM:', err);
    }
  }
  
  // Event handler registration
  onMessage(callback) {
    this.messageCallback = callback;
    console.log('Message callback registered');
  }
  
  // API Methods
  async createRoom() {
    console.log('BE Creating new room...');
    const topicBuffer = crypto.randomBytes(32);
    const topic = await this._joinSwarm(topicBuffer);
    console.log('Room created with ID:', topic);
  
    this.activeTopic = topicBuffer;
    this.currentRoomId = topic;
    
    // Clear previous room messages and add welcome message
    // messageStore.clearRoom(topic);
    // const welcomeMessage = Message.system('Room created. Waiting for peers to join...', topic);
    // messageStore.addMessage(welcomeMessage);
    
    return topic;
  }

  async joinRoom(roomId, stealth = false) {
    console.log(`Joining room: ${roomId} with stealth=${stealth}`);
    try {
      const topicBuffer = b4a.from(roomId, 'hex');
      await this._joinSwarm(topicBuffer, stealth);
      console.log('Successfully joined room');
      
      // Clear previous room messages and add joined message
      // messageStore.clearRoom(roomId);
      // const joinedMessage = Message.system(`Joined room ${roomId}`, roomId);
      // messageStore.addMessage(joinedMessage);
      
      return true;
    } catch (err) {
      console.error('Failed to join room:', err);
      return false;
    }
  }

  sendMessage(content, chatId) {
    if (!this.currentRoomId) {
      console.error('Cannot send message: not in a room');
      return false;
    }
    
    // Get current user identity and host status
    const identity = userIdentity.getIdentity();
    // const hostStatus = userIdentity.getHostStatus();

    // Create structured message
    const message = new Message(
      content,
      MessageRole.USER,
      identity.id, 
      MessageType.TEXT,
      chatId,
      identity.displayName
    );

    // Add to local message store
    messageStore.addMessage(message);

    // Get messages to send based on host status
    const conversation = messageStore.getChat(chatId)
    
    // Send to all peers
    let sentCount = 0;
    for (const [_, peerInfo] of this.peers) {
      try {
        const serialized = JSON.stringify(conversation);
        peerInfo.connection.write(serialized);
        sentCount++;
      } catch (err) {
        console.error('Error sending message to peer:', err);
      }
    }
    
    console.log(`Message sent to ${sentCount} peers`);
    return sentCount > 0;
  }

  getPeerCount() {
    return this.swarmConnections;
  }

  getCurrentTopic() {
    return this.activeTopic ? b4a.toString(this.activeTopic, 'hex') : null;
  }

  getPeers() {
    return Array.from(this.peers.values())
      .map(peer => ({
        id: peer.name,
        displayName: peer.displayName || peer.name,
        joinedAt: peer.joinedAt
      }));
  }
  
  /**
   * Update the user's display name
   * @param {string} displayName - New display name
   */
  setDisplayName(displayName) {
    userIdentity.setDisplayName(displayName);
    return userIdentity.getDisplayName();
  }
  
  /**
   * Get the current user's identity
   * @returns {Object} User identity
   */
  getUserIdentity() {
    return userIdentity.getIdentity();
  }
  
  /**
   * Configure the LLM provider for hosting
   * @param {Object} config - LLM configuration
   */
  setLLMConfig(config) {
    try {
      console.log('Setting up LLM with config:', config);
      
      // Create the LLM provider
      this.llmProvider = llmService.createProvider(config.provider, {
        apiKey: config.apiKey
      });
      
      // Update user identity with host status
      userIdentity.setHostStatus(true, config);
      
      // Add system message about hosting
      // if (this.currentRoomId) {
      //   const hostMessage = Message.system(
      //     `LLM hosting activated with ${config.provider} model: ${config.model}`,
      //     this.currentRoomId
      //   );
      //   messageStore.addMessage(hostMessage);
      // }
      
      console.log('LLM provider created and host status updated');
      return true;
    } catch (err) {
      console.error('Failed to set up LLM:', err);
      this.llmProvider = null;
      userIdentity.setHostStatus(false);
      return false;
    }
  }
  
  /**
   * Set whether the user is hosting an LLM
   * @param {boolean} isHost - Whether the user is hosting
   */
  setHostStatus(isHost) {
    if (!isHost) {
      // Disable hosting
      this.llmProvider = null;
      userIdentity.setHostStatus(false);
      
      // Add system message about disabling hosting
      // if (this.currentRoomId) {
      //   const hostMessage = Message.system(
      //     'LLM hosting deactivated',
      //     this.currentRoomId
      //   );
      //   messageStore.addMessage(hostMessage);
      // }
    }
    
    return userIdentity.getHostStatus();
  }

  async leaveRoom() {
    console.log('Leaving room...');
  
    if (this.activeTopic) {
      const previousRoom = this.currentRoomId;
      
      try {
        await this.swarm.leave(this.activeTopic);       // stop DHT discovery
        this._closeAllConnections();                    // close live sockets
  
        this.activeTopic = null;
        this.currentRoomId = null;
        this.peers.clear();
        
        // Disable LLM hosting when leaving the room
        this.llmProvider = null;
        userIdentity.setHostStatus(false);
        
        // Add left message to the room we're leaving
        // if (previousRoom) {
        //   const leftMessage = Message.system('You left the room', previousRoom);
        //   messageStore.addMessage(leftMessage);
        // }
  
        console.log('Room left successfully');
        return true;
      } catch (err) {
        console.error('Error leaving room:', err);
        return false;
      }
    }
  
    console.log('No active room to leave');
    return false;
  }
  
  // Internal helper methods
  async _joinSwarm(topicBuffer, stealth = false) {
    console.log('Joining swarm... (stealth mode:', stealth, ')');

    // Clean up previous room
    if (this.activeTopic) {
      console.log('Leaving previous topic');
      try {
        await this.swarm.leave(this.activeTopic);
        this._closeAllConnections();
      } catch (err) {
        console.warn('Failed to fully leave previous topic:', err);
      }
      this.activeTopic = null;
      this.currentRoomId = null;
    }

    const options = stealth
      ? { client: true, server: false }
      : { client: true, server: true };

    console.log('Connecting to the DHT network with options:', options);
    const discovery = this.swarm.join(topicBuffer, options);
    await discovery.flushed();
    console.log('Connected to the DHT network');

    const topic = b4a.toString(topicBuffer, 'hex');
    this.activeTopic = topicBuffer;
    this.currentRoomId = topic;
    return topic;
  }

  _closeAllConnections() {
    console.log('Closing all active peer connections...');
    for (const conn of this.swarm.connections) {
      try {
        conn.destroy();
      } catch (e) {
        console.warn('Failed to destroy connection:', e);
      }
    }
    this.peers.clear();
  }
  
  // Register a listener for new messages
  onNewMessage(callback) {
    return messageStore.addListener(callback);
  }

  /**
   * Get messages for a specific chat
   * @param {string} chatId - Chat ID
   * @returns {Message[]} Array of messages for the chat
   */
  getChat(chatId) {
    return messageStore.getChat(chatId);
  }

  /**
   * Get all chats
   * @returns {Map<string, Message[]>} Map of chatId to array of messages
   */
  getChats() {
    return messageStore.getChats();
  }

  /**
   * Create a new chat
   * @returns {string} Chat ID
   */
  async createChat() {
    return messageStore.createChat();
  }

  /**
   * Delete a chat
   * @param {string} chatId - Chat ID to delete
   * @returns {boolean} True if chat was deleted, false if it didn't exist
   */
  async deleteChat(chatId) {
    return messageStore.deleteChat(chatId);
  }
}

// Create a singleton instance
const chatInstance = new P2PChat();

// API for the frontend to call
export default {
  createRoom: () => chatInstance.createRoom(),
  joinRoom: (roomId, stealth) => chatInstance.joinRoom(roomId, stealth),
  sendMessage: (message, chatId) => chatInstance.sendMessage(message, chatId),
  getPeerCount: () => chatInstance.getPeerCount(),
  getCurrentTopic: () => chatInstance.getCurrentTopic(),
  getPeers: () => chatInstance.getPeers(),
  leaveRoom: () => chatInstance.leaveRoom(),
  onNewMessage: (callback) => chatInstance.onNewMessage(callback),
  setDisplayName: (name) => chatInstance.setDisplayName(name),
  getUserIdentity: () => chatInstance.getUserIdentity(),
  setLLMConfig: (config) => chatInstance.setLLMConfig(config),
  setHostStatus: (isHost) => chatInstance.setHostStatus(isHost),
  getChats: () => chatInstance.getChats(),
  getChat: (chatId) => chatInstance.getChat(chatId),
  createChat: () => chatInstance.createChat(),
  deleteChat: (chatId) => chatInstance.deleteChat(chatId)
};

// Export the message handler function
export function onMessage(callback) {
  chatInstance.onMessage(callback);
}