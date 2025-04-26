import Hyperswarm from 'hyperswarm'   // Module for P2P networking and connecting peers
import crypto from 'hypercore-crypto' // Cryptographic functions for generating the key in app
import b4a from 'b4a'                 // Module for buffer-to-string and vice-versa conversions 
const { teardown, updates } = Pear    // Functions for cleanup and updates

import { userIdentity } from '../services/identity.js'
import { messageStore } from '../models/message-store.js'

/**
 * Abstract base class for P2P networking functionality
 * Provides common methods for P2P connection management
 */
class BaseP2P {
  constructor() {
    console.log('BaseP2P: Creating Hyperswarm instance');
    this.swarm = new Hyperswarm();
    this.activeTopic = null;
    this.currentRoomId = null;
    this.swarmConnections = 0;
    this.messageCallback = null;
    this.peers = new Map(); // Store peer information
    
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
      
      // Handle incoming messages
      peer.on('data', this._handleIncomingData.bind(this, id, peer));
      
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
        
        if (this.currentRoomId) {
          // Handle disconnection in specific implementations
          this._handlePeerDisconnection(id, name, peerInfo);
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
  }

  // Abstract method
  _handleIncomingData(peerId, peer, serializedMessage) {
    throw new Error('_handleIncomingData must be implemented by subclass');
  }
  
  // Abstract method
  _handlePeerDisconnection(peerId, name, peerInfo) {
    // Default implementation does nothing
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
    
    return topic;
  }

  async joinRoom(roomId, stealth = false) {
    console.log(`Joining room: ${roomId} with stealth=${stealth}`);
    try {
      const topicBuffer = b4a.from(roomId, 'hex');
      await this._joinSwarm(topicBuffer, stealth);
      console.log('Successfully joined room');
      
      return true;
    } catch (err) {
      console.error('Failed to join room:', err);
      return false;
    }
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
   * Register a listener for chat updates
   * @param {Function} callback - Called when chats are modified
   * @returns {Function} Function to remove the listener
   */
  onChatUpdate(callback) {
    return messageStore.addChatListener(callback);
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

export default BaseP2P; 