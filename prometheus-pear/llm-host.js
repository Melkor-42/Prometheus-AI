/**
 * LLM Host and Client management for P2P LLM chat application
 */

import { LLMMessage, LLMConversation, conversationStore } from './llm-messages.js';
import llmService from './llm-service.js';
import { userIdentity } from './identity.js';

/**
 * LLM Host info - shared with peers
 */
export class LLMHostInfo {
  constructor(peerId, displayName, providerInfo, models) {
    this.peerId = peerId;
    this.displayName = displayName;
    this.provider = providerInfo;
    this.models = models;
    this.availableModels = models || [];
    this.status = 'available';
    this.timestamp = Date.now();
  }

  serialize() {
    return {
      type: 'llm-host-info',
      hostInfo: {
        peerId: this.peerId,
        displayName: this.displayName,
        provider: this.provider,
        availableModels: this.availableModels,
        status: this.status,
        timestamp: this.timestamp
      }
    };
  }

  static fromSerialized(data) {
    if (!data.hostInfo) return null;
    
    const hostInfo = data.hostInfo;
    return new LLMHostInfo(
      hostInfo.peerId,
      hostInfo.displayName,
      hostInfo.provider,
      hostInfo.availableModels
    );
  }
}

/**
 * LLM Request - sent from client to host
 */
export class LLMRequest {
  constructor(requestId, conversationId, model, messages, options = {}) {
    this.requestId = requestId || Date.now().toString(36) + Math.random().toString(36).substring(2);
    this.conversationId = conversationId;
    this.model = model;
    this.messages = messages;
    this.options = options;
    this.timestamp = Date.now();
  }

  serialize() {
    return {
      type: 'llm-request',
      request: {
        requestId: this.requestId,
        conversationId: this.conversationId,
        model: this.model,
        messages: this.messages,
        options: this.options,
        timestamp: this.timestamp
      }
    };
  }

  static fromSerialized(data) {
    if (!data.request) return null;
    
    const request = data.request;
    return new LLMRequest(
      request.requestId,
      request.conversationId,
      request.model,
      request.messages,
      request.options
    );
  }
}

/**
 * LLM Response - sent from host to client
 */
export class LLMResponse {
  constructor(requestId, conversationId, model, response, error = null, isStream = false) {
    this.requestId = requestId;
    this.conversationId = conversationId;
    this.model = model;
    this.response = response;
    this.error = error;
    this.isStream = isStream;
    this.timestamp = Date.now();
  }

  serialize() {
    return {
      type: 'llm-response',
      response: {
        requestId: this.requestId,
        conversationId: this.conversationId,
        model: this.model,
        response: this.response,
        error: this.error,
        isStream: this.isStream,
        timestamp: this.timestamp
      }
    };
  }

  static fromSerialized(data) {
    if (!data.response) return null;
    
    const response = data.response;
    return new LLMResponse(
      response.requestId,
      response.conversationId,
      response.model,
      response.response,
      response.error,
      response.isStream
    );
  }
}

/**
 * LLM Stream Chunk - sent from host to client for streaming responses
 */
export class LLMStreamChunk {
  constructor(requestId, conversationId, chunk, done = false) {
    this.requestId = requestId;
    this.conversationId = conversationId;
    this.chunk = chunk;
    this.done = done;
    this.timestamp = Date.now();
  }

  serialize() {
    return {
      type: 'llm-stream-chunk',
      chunk: {
        requestId: this.requestId,
        conversationId: this.conversationId,
        chunk: this.chunk,
        done: this.done,
        timestamp: this.timestamp
      }
    };
  }

  static fromSerialized(data) {
    if (!data.chunk) return null;
    
    const chunk = data.chunk;
    return new LLMStreamChunk(
      chunk.requestId,
      chunk.conversationId,
      chunk.chunk,
      chunk.done
    );
  }
}

/**
 * LLM Host - manages an LLM provider and responds to requests
 */
export class LLMHost {
  constructor(options = {}) {
    this.provider = null;
    this.models = [];
    this.hostInfo = null;
    this.status = 'initializing';
    this.activeRequests = new Map();
    this.sendMessageCallback = null;
    this.messageHandlers = new Map();
    
    // Register message handlers
    this._registerMessageHandlers();
  }

  /**
   * Initialize the LLM host with a provider
   * @param {string} providerName - Name of the LLM provider
   * @param {Object} providerConfig - Configuration for the provider
   */
  async initialize(providerName, providerConfig) {
    try {
      this.status = 'initializing';
      
      // Create the provider
      this.provider = llmService.createProvider(providerName, providerConfig);
      
      // Get available models
      this.models = await this.provider.getModels();
      
      // Create host info
      const identity = userIdentity.getIdentity();
      this.hostInfo = new LLMHostInfo(
        identity.id,
        identity.displayName,
        {
          name: this.provider.name,
          // Include limited provider info, but don't expose sensitive config
          info: { 
            name: providerName,
            description: `${providerName} LLM provider` 
          }
        },
        this.models
      );
      
      this.status = 'available';
      console.log(`LLM Host initialized with provider: ${providerName}`);
      console.log(`Available models: ${this.models.map(m => m.id || m.name).join(', ')}`);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize LLM host:', error);
      this.status = 'error';
      return false;
    }
  }

  /**
   * Set the callback for sending messages
   * @param {Function} callback - Function to send messages
   */
  setSendMessageCallback(callback) {
    this.sendMessageCallback = callback;
  }

  /**
   * Process a message from a peer
   * @param {Object} data - Parsed message data
   * @param {Object} peer - Peer information
   */
  processMessage(data, peer) {
    if (!data || !data.type) return;
    
    const handler = this.messageHandlers.get(data.type);
    if (handler) {
      handler(data, peer);
    }
  }

  /**
   * Register handlers for different message types
   * @private
   */
  _registerMessageHandlers() {
    // Handle LLM requests
    this.messageHandlers.set('llm-request', (data, peer) => {
      this._handleLLMRequest(data, peer);
    });
    
    // Handle host info requests
    this.messageHandlers.set('llm-host-info-request', (data, peer) => {
      this._handleHostInfoRequest(data, peer);
    });
  }

  /**
   * Handle an LLM request from a peer
   * @private
   * @param {Object} data - Request data
   * @param {Object} peer - Peer information
   */
  async _handleLLMRequest(data, peer) {
    if (!this.provider || this.status !== 'available') {
      this._sendErrorResponse(data.request.requestId, data.request.conversationId, 'LLM host not available');
      return;
    }
    
    const request = LLMRequest.fromSerialized(data);
    if (!request) {
      console.error('Invalid LLM request:', data);
      return;
    }
    
    console.log(`Received LLM request from peer ${peer.name}, requestId: ${request.requestId}`);
    
    // Store the active request
    this.activeRequests.set(request.requestId, {
      request,
      peer,
      startTime: Date.now()
    });
    
    try {
      if (request.options.stream === true) {
        // Handle streaming request
        await this._handleStreamingRequest(request, peer);
      } else {
        // Handle non-streaming request
        await this._handleNonStreamingRequest(request, peer);
      }
    } catch (error) {
      console.error('Error processing LLM request:', error);
      this._sendErrorResponse(request.requestId, request.conversationId, error.message);
    } finally {
      // Clean up the request
      this.activeRequests.delete(request.requestId);
    }
  }

  /**
   * Handle a non-streaming LLM request
   * @private
   * @param {LLMRequest} request - The LLM request
   * @param {Object} peer - Peer information
   */
  async _handleNonStreamingRequest(request, peer) {
    try {
      // Process the request
      const response = await this.provider.chatCompletion(
        request.model,
        request.messages,
        request.options
      );
      
      // Send the response
      const llmResponse = new LLMResponse(
        request.requestId,
        request.conversationId,
        request.model,
        response
      );
      
      this._sendToPeer(peer, llmResponse.serialize());
    } catch (error) {
      console.error('Error in non-streaming request:', error);
      this._sendErrorResponse(request.requestId, request.conversationId, error.message);
    }
  }

  /**
   * Handle a streaming LLM request
   * @private
   * @param {LLMRequest} request - The LLM request
   * @param {Object} peer - Peer information
   */
  async _handleStreamingRequest(request, peer) {
    try {
      // Process the streaming request
      await this.provider.streamChatCompletion(
        request.model,
        request.messages,
        (chunk) => {
          // Send each chunk to the peer
          const streamChunk = new LLMStreamChunk(
            request.requestId,
            request.conversationId,
            chunk
          );
          
          this._sendToPeer(peer, streamChunk.serialize());
        },
        request.options
      );
      
      // Send final chunk indicating the stream is done
      const finalChunk = new LLMStreamChunk(
        request.requestId,
        request.conversationId,
        null,
        true
      );
      
      this._sendToPeer(peer, finalChunk.serialize());
    } catch (error) {
      console.error('Error in streaming request:', error);
      this._sendErrorResponse(request.requestId, request.conversationId, error.message);
      
      // Send final chunk with error
      const finalChunk = new LLMStreamChunk(
        request.requestId,
        request.conversationId,
        null,
        true
      );
      
      this._sendToPeer(peer, finalChunk.serialize());
    }
  }

  /**
   * Handle a host info request
   * @private
   * @param {Object} data - Request data
   * @param {Object} peer - Peer information
   */
  _handleHostInfoRequest(data, peer) {
    if (!this.hostInfo) return;
    
    // Update the host info with current status
    this.hostInfo.status = this.status;
    this.hostInfo.timestamp = Date.now();
    
    // Send the host info
    this._sendToPeer(peer, this.hostInfo.serialize());
  }

  /**
   * Send an error response to a peer
   * @private
   * @param {string} requestId - Request ID
   * @param {string} conversationId - Conversation ID
   * @param {string} errorMessage - Error message
   */
  _sendErrorResponse(requestId, conversationId, errorMessage) {
    const request = this.activeRequests.get(requestId);
    if (!request) return;
    
    const errorResponse = new LLMResponse(
      requestId,
      conversationId,
      request.request.model,
      null,
      errorMessage
    );
    
    this._sendToPeer(request.peer, errorResponse.serialize());
  }

  /**
   * Send a message to a peer
   * @private
   * @param {Object} peer - Peer information
   * @param {Object} message - Message to send
   */
  _sendToPeer(peer, message) {
    if (!peer || !peer.connection || !this.sendMessageCallback) return;
    
    try {
      const serialized = typeof message === 'string' ? message : JSON.stringify(message);
      this.sendMessageCallback(peer, serialized);
    } catch (error) {
      console.error('Error sending message to peer:', error);
    }
  }

  /**
   * Broadcast host info to all peers
   * @param {Array} peers - List of peers to broadcast to
   */
  broadcastHostInfo(peers) {
    if (!this.hostInfo) return;
    
    // Update the host info with current status
    this.hostInfo.status = this.status;
    this.hostInfo.timestamp = Date.now();
    
    const serialized = this.hostInfo.serialize();
    
    for (const peer of peers) {
      this._sendToPeer(peer, serialized);
    }
  }
}

/**
 * LLM Client - connects to LLM hosts and sends requests
 */
export class LLMClient {
  constructor() {
    this.hosts = new Map();
    this.activeRequests = new Map();
    this.sendMessageCallback = null;
    this.messageHandlers = new Map();
    this.requestCallbacks = new Map();
    
    // Register message handlers
    this._registerMessageHandlers();
  }

  /**
   * Set the callback for sending messages
   * @param {Function} callback - Function to send messages
   */
  setSendMessageCallback(callback) {
    this.sendMessageCallback = callback;
  }

  /**
   * Process a message from a peer
   * @param {Object} data - Parsed message data
   * @param {Object} peer - Peer information
   */
  processMessage(data, peer) {
    if (!data || !data.type) return;
    
    const handler = this.messageHandlers.get(data.type);
    if (handler) {
      handler(data, peer);
    }
  }

  /**
   * Register handlers for different message types
   * @private
   */
  _registerMessageHandlers() {
    // Handle host info
    this.messageHandlers.set('llm-host-info', (data, peer) => {
      this._handleHostInfo(data, peer);
    });
    
    // Handle LLM responses
    this.messageHandlers.set('llm-response', (data, peer) => {
      this._handleLLMResponse(data, peer);
    });
    
    // Handle LLM stream chunks
    this.messageHandlers.set('llm-stream-chunk', (data, peer) => {
      this._handleLLMStreamChunk(data, peer);
    });
  }

  /**
   * Handle host info from a peer
   * @private
   * @param {Object} data - Host info data
   * @param {Object} peer - Peer information
   */
  _handleHostInfo(data, peer) {
    const hostInfo = LLMHostInfo.fromSerialized(data);
    if (!hostInfo) return;
    
    // Update peer information
    peer.isLLMHost = true;
    peer.hostInfo = hostInfo;
    
    // Store host info
    this.hosts.set(peer.id, {
      peer,
      hostInfo
    });
    
    console.log(`Received host info from peer ${peer.name}:`, hostInfo);
  }

  /**
   * Handle an LLM response from a host
   * @private
   * @param {Object} data - Response data
   * @param {Object} peer - Peer information
   */
  _handleLLMResponse(data, peer) {
    const response = LLMResponse.fromSerialized(data);
    if (!response) return;
    
    console.log(`Received LLM response from peer ${peer.name}, requestId: ${response.requestId}`);
    
    // Find the callback for this request
    const callback = this.requestCallbacks.get(response.requestId);
    if (callback) {
      callback.onResponse(response);
      
      // If there's an error or it's not a stream, remove the callback
      if (response.error || !response.isStream) {
        this.requestCallbacks.delete(response.requestId);
      }
    }
    
    // Clean up the request if it's complete
    if (response.error || !response.isStream) {
      this.activeRequests.delete(response.requestId);
    }
  }

  /**
   * Handle an LLM stream chunk from a host
   * @private
   * @param {Object} data - Stream chunk data
   * @param {Object} peer - Peer information
   */
  _handleLLMStreamChunk(data, peer) {
    const chunk = LLMStreamChunk.fromSerialized(data);
    if (!chunk) return;
    
    // Find the callback for this request
    const callback = this.requestCallbacks.get(chunk.requestId);
    if (callback && callback.onChunk) {
      callback.onChunk(chunk);
    }
    
    // Clean up the request if it's done
    if (chunk.done) {
      this.requestCallbacks.delete(chunk.requestId);
      this.activeRequests.delete(chunk.requestId);
    }
  }

  /**
   * Request host info from a peer
   * @param {Object} peer - Peer to request info from
   */
  requestHostInfo(peer) {
    if (!peer || !peer.connection) return;
    
    const request = {
      type: 'llm-host-info-request',
      timestamp: Date.now()
    };
    
    this._sendToPeer(peer, request);
  }

  /**
   * Send an LLM request to a host
   * @param {Object} host - Host to send the request to
   * @param {string} model - Model to use
   * @param {Array} messages - Messages to send
   * @param {Object} options - Additional options
   * @param {Object} callbacks - Callbacks for the response
   * @returns {string} Request ID
   */
  sendLLMRequest(host, model, messages, options = {}, callbacks = {}) {
    if (!host || !host.peer || !host.peer.connection) {
      throw new Error('Invalid host');
    }
    
    // Create a new conversation if not provided
    const conversationId = options.conversationId || Date.now().toString(36) + Math.random().toString(36).substring(2);
    
    // Create the request
    const request = new LLMRequest(null, conversationId, model, messages, options);
    
    // Store the active request
    this.activeRequests.set(request.requestId, {
      request,
      host,
      startTime: Date.now()
    });
    
    // Register callbacks
    this.requestCallbacks.set(request.requestId, {
      onResponse: callbacks.onResponse || (() => {}),
      onChunk: callbacks.onChunk || (() => {})
    });
    
    // Send the request
    this._sendToPeer(host.peer, request.serialize());
    
    return request.requestId;
  }

  /**
   * Send a message to a peer
   * @private
   * @param {Object} peer - Peer information
   * @param {Object} message - Message to send
   */
  _sendToPeer(peer, message) {
    if (!peer || !peer.connection || !this.sendMessageCallback) return;
    
    try {
      const serialized = typeof message === 'string' ? message : JSON.stringify(message);
      this.sendMessageCallback(peer, serialized);
    } catch (error) {
      console.error('Error sending message to peer:', error);
    }
  }

  /**
   * Get all available LLM hosts
   * @returns {Array} List of available hosts
   */
  getAvailableHosts() {
    return Array.from(this.hosts.values())
      .filter(host => host.hostInfo && host.hostInfo.status === 'available')
      .map(host => ({
        peerId: host.peer.id,
        name: host.peer.name,
        displayName: host.hostInfo.displayName,
        provider: host.hostInfo.provider,
        models: host.hostInfo.availableModels
      }));
  }
}

// Export singleton instances
export const llmHost = new LLMHost();
export const llmClient = new LLMClient(); 