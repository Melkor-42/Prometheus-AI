import BaseP2P from './base-p2p.js';
import { Message } from '../models/message.js';
import { messageStore } from '../models/message-store.js';
import { userIdentity } from '../services/identity.js';
import llmService from '../services/llm-service.js';

/**
 * Server implementation of the P2P system
 * Extends the base peer with LLM hosting capabilities
 */
class ServerPeer extends BaseP2P {
  constructor() {
    super();
    console.log('ServerPeer: Initializing with LLM hosting capabilities');
    this.llmProvider = null; // LLM provider instance
    
    // Set up host status change listener
    userIdentity.setOnHostStatusChange((hostStatus) => {
      this._broadcastIdentity();
    });
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

      // Process message with LLM if we are the host
      const hostStatus = userIdentity.getHostStatus();
      if (hostStatus && hostStatus.isHost && this.llmProvider) {
        this._processWithLLM(data);
      }
    } catch (err) {
      console.error('Error processing message:', err);
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
      const hostStatus = userIdentity.getHostStatus();
      const model = hostStatus.llmConfig.model;
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
      const chatId = messages[0].chatId;
      
      const llmResponseMessage = new Message(
        responseText,
        'assistant',
        identity.id,
        'text',
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
    }
    
    return userIdentity.getHostStatus();
  }
  
  /**
   * @override
   */
  async leaveRoom() {
    const result = await super.leaveRoom();
    
    // Disable LLM hosting when leaving the room
    this.llmProvider = null;
    userIdentity.setHostStatus(false);
    
    return result;
  }
}

export default ServerPeer; 