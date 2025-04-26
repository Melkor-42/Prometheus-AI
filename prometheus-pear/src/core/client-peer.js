import BaseP2P from './base-p2p.js';
import { Message } from '../models/message.js';
import { messageStore } from '../models/message-store.js';
import { userIdentity } from '../services/identity.js';

/**
 * Client implementation of the P2P system
 * Focused on basic P2P functionality without hosting capabilities
 */
class ClientPeer extends BaseP2P {
  constructor() {
    super();
    console.log('ClientPeer: Initializing client mode');
  }
  
  /**
   * Handle incoming data from peers
   * @override
   */
  _handleIncomingData(peerId, peer, serializedMessage) {
    try {
      // Try to parse as JSON first
      const data = JSON.parse(serializedMessage);
      
      // Handle identity updates
      if (data.type === 'identity') {
        this._handleIdentityMessage(peerId, data);
        return;
      }

      // For regular messages, deserialize and add to message store
      const message = Message.fromSerialized(serializedMessage);
      messageStore.addMessage(message);
    } catch (err) {
      console.error('Error processing message:', err);
    }
  }
  
  /**
   * Send a message to all peers
   * @override
   */
  sendMessage(content, chatId) {
    if (!this.currentRoomId) {
      console.error('Cannot send message: not in a room');
      return false;
    }
    
    // Get current user identity
    const identity = userIdentity.getIdentity();

    // Create structured message
    const message = new Message(
      content,
      'user',
      identity.id, 
      'text',
      chatId,
      identity.displayName
    );

    // Add to local message store
    messageStore.addMessage(message);

    // Get messages to send
    const conversation = messageStore.getChat(chatId);
    
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
}

export default ClientPeer; 