import ClientPeer from './client-peer.js';
import ServerPeer from './server-peer.js';

/**
 * Factory for creating P2P instances based on user's choice
 */
class PeerFactory {
  /**
   * Create a new P2P instance based on user's choice
   * @param {boolean} isHost - Whether the user wants to host an LLM
   * @returns {Object} - Either a ClientPeer or ServerPeer instance
   */
  static createPeerInstance(isHost) {
    console.log(`Creating P2P instance, isHost: ${isHost}`);
    
    if (isHost) {
      console.log('Creating ServerPeer instance with LLM hosting capabilities');
      return new ServerPeer();
    } else {
      console.log('Creating ClientPeer instance for basic functionality');
      return new ClientPeer();
    }
  }
}

export default PeerFactory; 