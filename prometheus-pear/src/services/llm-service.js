/**
 * LLM Service module for interfacing with different LLM providers
 */

/**
 * Base LLM Provider class that defines the interface for all LLM providers
 */
class LLMProvider {
    constructor(config = {}) {
      this.config = config;
    }
  
    /**
     * Get the name of the provider
     * @returns {string} Provider name
     */
    get name() {
      return 'base';
    }
  
    /**
     * Get available models from the provider
     * @returns {Promise<Array>} List of available models
     */
    async getModels() {
      throw new Error('Method not implemented');
    }
  
    /**
     * Send a chat completion request to the LLM
     * @param {string} model - Model to use
     * @param {Array} messages - Array of message objects with role and content
     * @param {Object} options - Additional options for the request
     * @returns {Promise<Object>} Response from the LLM
     */
    async chatCompletion(model, messages, options = {}) {
      throw new Error('Method not implemented');
    }
  
    /**
     * Stream a chat completion request to the LLM
     * @param {string} model - Model to use
     * @param {Array} messages - Array of message objects with role and content
     * @param {Function} onUpdate - Callback for each chunk of the response
     * @param {Object} options - Additional options for the request
     * @returns {Promise<Object>} Final response from the LLM
     */
    async streamChatCompletion(model, messages, onUpdate, options = {}) {
      throw new Error('Method not implemented');
    }
  }
  
  /**
   * Venice AI LLM Provider implementation
   */
  class VeniceAIProvider extends LLMProvider {
    constructor(config = {}) {
      super(config);
      this.apiKey = config.apiKey;
    //   this.baseUrl = 'https://api.venice.ai/api/v1';
      this.baseUrl = Pear.config.links.VeniceAPI;
      console.log(this.baseUrl)
      
      if (!this.apiKey) {
        console.warn('Venice AI API key not provided');
      }
    }
  
    get name() {
      return 'veniceai';
    }
  
    /**
     * Get available models from Venice AI
     * @returns {Promise<Array>} List of available models
     */
    async getModels() {
      try {
        const headers = new Headers();
        headers.append('Authorization', `Bearer ${this.apiKey}`);
  
        const requestOptions = {
          method: 'GET',
          headers: headers,
          redirect: 'follow'
        };
  
        const response = await fetch(`${this.baseUrl}/models?type=all`, requestOptions);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.data || [];
      } catch (error) {
        console.error('Error fetching Venice AI models:', error);
        throw error;
      }
    }
  
    /**
     * Send a chat completion request to Venice AI
     * @param {string} model - Model to use
     * @param {Array} messages - Array of message objects with role and content
     * @param {Object} options - Additional options for the request
     * @returns {Promise<Object>} Response from Venice AI
     */
    async chatCompletion(model, messages, options = {}) {
      try {
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        headers.append('Authorization', `Bearer ${this.apiKey}`);
  
        const payload = {
          model: model,
          messages: messages,
          stream: false,
          ...options
        };
  
        const requestOptions = {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload),
          redirect: 'follow'
        };
  
        const response = await fetch(`${this.baseUrl}/chat/completions`, requestOptions);
        
        if (!response.ok) {
          throw new Error(`Venice AI API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error calling Venice AI chat completion:', error);
        throw error;
      }
    }
  
    /**
     * Stream a chat completion request from Venice AI
     * @param {string} model - Model to use
     * @param {Array} messages - Array of message objects with role and content
     * @param {Function} onUpdate - Callback for each chunk of the response
     * @param {Object} options - Additional options for the request
     * @returns {Promise<Object>} Final response from Venice AI
     */
    async streamChatCompletion(model, messages, onUpdate, options = {}) {
      try {
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        headers.append('Authorization', `Bearer ${this.apiKey}`);
  
        const payload = {
          model: model,
          messages: messages,
          stream: true,
          ...options
        };
  
        const requestOptions = {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload),
          redirect: 'follow'
        };
  
        const response = await fetch(`${this.baseUrl}/chat/completions`, requestOptions);
        
        if (!response.ok) {
          throw new Error(`Venice AI API error: ${response.status} ${response.statusText}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let result = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          
          // Parse the SSE format
          // Each SSE message starts with "data: " and ends with two newlines
          const lines = chunk.split('\n\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6); // Remove "data: " prefix
              
              if (data === '[DONE]') {
                // Stream completed
                continue;
              }
              
              try {
                const parsedData = JSON.parse(data);
                if (onUpdate && typeof onUpdate === 'function') {
                  onUpdate(parsedData);
                }
                result = parsedData;
              } catch (e) {
                console.warn('Failed to parse SSE chunk:', data);
              }
            }
          }
        }
        
        return result;
      } catch (error) {
        console.error('Error streaming Venice AI chat completion:', error);
        throw error;
      }
    }
  }
  
  /**
   * Mock LLM Provider for development and testing
   */
  class MockProvider extends LLMProvider {
    constructor(config = {}) {
      super(config);
      this.delay = config.delay || 1000;
    }
  
    get name() {
      return 'mock';
    }
  
    async getModels() {
      await new Promise(resolve => setTimeout(resolve, this.delay));
      return [
        { id: 'mock-small', name: 'Mock LLM (Small)' },
        { id: 'mock-medium', name: 'Mock LLM (Medium)' },
        { id: 'mock-large', name: 'Mock LLM (Large)' }
      ];
    }
  
    async chatCompletion(model, messages, options = {}) {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, this.delay));
      
      // Get the last message from the user
      const lastMessage = messages[messages.length - 1];
      
      return {
        id: `mock-${Date.now()}`,
        object: 'chat.completion',
        created: Date.now(),
        model: model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: `This is a mock response to: "${lastMessage.content}". I am a simulated LLM for testing purposes.`
            },
            finish_reason: 'stop'
          }
        ]
      };
    }
  
    async streamChatCompletion(model, messages, onUpdate, options = {}) {
      // Get the last message from the user
      const lastMessage = messages[messages.length - 1];
      const response = `This is a mock response to: "${lastMessage.content}". I am a simulated LLM for testing purposes.`;
      
      // Split the response into chunks to simulate streaming
      const chunks = response.split(' ');
      let accumulatedResponse = '';
      
      for (const chunk of chunks) {
        // Simulate delay between chunks
        await new Promise(resolve => setTimeout(resolve, 100));
        
        accumulatedResponse += chunk + ' ';
        
        const mockChunk = {
          id: `mock-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: model,
          choices: [
            {
              index: 0,
              delta: {
                role: 'assistant',
                content: chunk + ' '
              },
              finish_reason: null
            }
          ]
        };
        
        if (onUpdate && typeof onUpdate === 'function') {
          onUpdate(mockChunk);
        }
      }
      
      // Final chunk with finish reason
      const finalChunk = {
        id: `mock-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: model,
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: 'stop'
          }
        ]
      };
      
      if (onUpdate && typeof onUpdate === 'function') {
        onUpdate(finalChunk);
      }
      
      return {
        id: `mock-${Date.now()}`,
        object: 'chat.completion',
        created: Date.now(),
        model: model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: accumulatedResponse.trim()
            },
            finish_reason: 'stop'
          }
        ]
      };
    }
  }
  
  /**
   * LLM Service factory to create and manage LLM providers
   */
  class LLMService {
    constructor() {
      this.providers = {};
      
      // Register default providers
      this.registerProvider('veniceai', VeniceAIProvider);
      this.registerProvider('mock', MockProvider);
    }
  
    /**
     * Register a new LLM provider
     * @param {string} name - Provider name
     * @param {Class} providerClass - Provider class
     */
    registerProvider(name, providerClass) {
      this.providers[name] = providerClass;
    }
  
    /**
     * Create an instance of an LLM provider
     * @param {string} name - Provider name
     * @param {Object} config - Provider configuration
     * @returns {LLMProvider} Provider instance
     */
    createProvider(name, config = {}) {
      const ProviderClass = this.providers[name];
      
      if (!ProviderClass) {
        throw new Error(`Unknown LLM provider: ${name}`);
      }
      
      return new ProviderClass(config);
    }
  }
  
  // Export the LLM service singleton
  const llmService = new LLMService();
  export default llmService;
  
  // Export provider classes for direct use if needed
//   export { LLMProvider, VeniceAIProvider, MockProvider }; 