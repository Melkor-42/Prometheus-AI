/**
 * This file demonstrates how to persistently store chat messages using Hypercore
 * NOTE: This is an example/reference implementation, not yet integrated with the app
 */

import Hypercore from 'hypercore';
import Hyperbee from 'hyperbee';
import Corestore from 'corestore';
import b4a from 'b4a'; 

import { Message } from './messages.js';

/**
 * PersistentMessageStore - Stores chat messages using Hypercore/Hyperbee
 * This provides a persistent, append-only, distributed database for chat history
 */
export class PersistentMessageStore {
  /**
   * Create a new PersistentMessageStore
   * @param {string} storagePath - Path for storing the Hypercore data
   */
  constructor(storagePath) {
    this.store = new Corestore(storagePath);
    this.rooms = new Map(); // roomId -> { db, core, messages }
    this.listeners = new Set();
  }

  /**
   * Initialize the store
   * @returns {Promise<void>}
   */
  async init() {
    await this.store.ready();
    console.log('PersistentMessageStore initialized');
  }

  /**
   * Open or create a room database
   * @param {string} roomId - Room ID to open
   * @param {string|Buffer} key - Optional key for existing room
   * @returns {Promise<Object>} Room metadata
   */
  async openRoom(roomId, key = null) {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId);
    }

    // Create or load the core for this room
    const nameOrKey = key ? key : `room-${roomId}`;
    const core = this.store.get(nameOrKey);
    await core.ready();

    // Create the database
    const db = new Hyperbee(core, {
      keyEncoding: 'utf-8',
      valueEncoding: 'json'
    });
    await db.ready();

    // Create an in-memory cache for quick access
    const messages = [];

    // Store room info
    const roomInfo = { db, core, messages };
    this.rooms.set(roomId, roomInfo);

    // Load existing messages into memory
    await this._loadExistingMessages(roomId);

    return roomInfo;
  }

  /**
   * Load existing messages from Hyperbee into memory
   * @private
   * @param {string} roomId - Room ID
   */
  async _loadExistingMessages(roomId) {
    const roomInfo = this.rooms.get(roomId);
    if (!roomInfo) return;

    const { db, messages } = roomInfo;
    
    // Read all messages from the database
    const stream = db.createReadStream({ gt: 'msg:', lt: 'msg:~' });
    
    for await (const { key, value } of stream) {
      try {
        // Reconstruct the message from stored data
        const message = new Message(
          value.content,
          value.senderId,
          value.type,
          roomId
        );
        message.id = value.id;
        message.timestamp = value.timestamp;
        
        // Add to in-memory cache
        messages.push(message);
      } catch (err) {
        console.error('Error loading message:', err);
      }
    }
    
    console.log(`Loaded ${messages.length} messages for room ${roomId}`);
  }

  /**
   * Add a message to the store
   * @param {Message} message - Message to add
   * @returns {Promise<void>}
   */
  async addMessage(message) {
    if (!message.room) {
      console.error('Cannot add message without room ID');
      return;
    }
    
    // Ensure the room is open
    let roomInfo = this.rooms.get(message.room);
    if (!roomInfo) {
      roomInfo = await this.openRoom(message.room);
    }
    
    // Store in Hyperbee
    const key = `msg:${message.timestamp}:${message.id}`;
    const value = {
      id: message.id,
      content: message.content,
      senderId: message.sender.id,
      timestamp: message.timestamp,
      type: message.type
    };
    
    try {
      await roomInfo.db.put(key, value);
      
      // Add to in-memory cache
      roomInfo.messages.push(message);
      
      // Notify listeners
      this._notifyListeners(message);
    } catch (err) {
      console.error('Error storing message:', err);
    }
  }

  /**
   * Get messages for a specific room
   * @param {string} roomId - Room ID
   * @returns {Promise<Message[]>} Array of messages
   */
  async getMessages(roomId) {
    // Ensure the room is open
    let roomInfo = this.rooms.get(roomId);
    if (!roomInfo) {
      roomInfo = await this.openRoom(roomId);
    }
    
    return roomInfo.messages;
  }

  /**
   * Get the replication key for a room
   * @param {string} roomId - Room ID
   * @returns {Promise<string|null>} Hex-encoded key or null
   */
  async getRoomKey(roomId) {
    const roomInfo = this.rooms.get(roomId);
    if (!roomInfo) return null;
    
    return b4a.toString(roomInfo.core.key, 'hex');
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

  /**
   * Create a replication stream for a room
   * @param {string} roomId - Room ID 
   * @param {boolean} isInitiator - Whether this peer is initiating the connection
   * @returns {Promise<stream>} Replication stream
   */
  async createReplicationStream(roomId, isInitiator) {
    const roomInfo = this.rooms.get(roomId);
    if (!roomInfo) {
      throw new Error(`Room ${roomId} not found`);
    }
    
    return roomInfo.core.replicate(isInitiator);
  }

  /**
   * Close the store and all databases
   * @returns {Promise<void>}
   */
  async close() {
    // Close all room databases
    for (const [roomId, roomInfo] of this.rooms.entries()) {
      try {
        await roomInfo.db.close();
        await roomInfo.core.close();
      } catch (err) {
        console.error(`Error closing room ${roomId}:`, err);
      }
    }
    
    // Clear the room map
    this.rooms.clear();
    
    // Close the store
    await this.store.close();
    console.log('PersistentMessageStore closed');
  }
}

/**
 * Usage Example:
 * 
 * // Initialize storage
 * const store = new PersistentMessageStore('./chat-data');
 * await store.init();
 * 
 * // Open a room (creates if doesn't exist)
 * await store.openRoom('room-id');
 * 
 * // Add a message
 * const message = new Message('Hello world', 'user1', 'text', 'room-id');
 * await store.addMessage(message);
 * 
 * // Get all messages
 * const messages = await store.getMessages('room-id');
 * 
 * // Listen for new messages
 * store.addListener(message => {
 *   console.log('New message:', message);
 * });
 * 
 * // Replicate with another peer
 * const stream = await store.createReplicationStream('room-id', true);
 * stream.pipe(otherPeerStream).pipe(stream);
 * 
 * // Close when done
 * await store.close();
 */ 