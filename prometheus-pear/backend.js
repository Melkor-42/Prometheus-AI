import Hyperswarm from 'hyperswarm'   // Module for P2P networking and connecting peers
import crypto from 'hypercore-crypto' // Cryptographic functions for generating the key in app
import b4a from 'b4a'                 // Module for buffer-to-string and vice-versa conversions 
const { teardown, updates } = Pear    // Functions for cleanup and updates

console.log('Backend module loaded');

// Create a Hyperswarm instance for P2P connections
const swarm = new Hyperswarm()
console.log('Hyperswarm instance created');

teardown(() => swarm.destroy())


let activeTopic = null
const connectedPeers = new Map()

// API for the frontend to call
export default {
  // Create a new chat room
  createRoom: async () => {
    console.log('BE Creating new room...');
    //Generate a new random topic (32 byte string)
    const topicBuffer = crypto.randomBytes(32)
    const topic = await joinSwarm(topicBuffer)
    console.log('Room created with ID:', topic);
    return topic
  },

  // Join an existing chat room
  joinRoom: async (roomId) => {
    console.log('Joining room:', roomId);
    try {
      const topicBuffer = b4a.from(roomId, 'hex')
      await joinSwarm(topicBuffer)
      console.log('Successfully joined room');
      return true
    } catch (err) {
      console.error('Failed to join room:', err);
      return false
    }
  },

  joinSwarm: async (topicBuffer) => {

    // Join the swarm with the topic. Setting both client/server to true means that this app can act as both.
    const discovery = swarm.join(topicBuffer, { client: true, server: true })
    await discovery.flushed()
    const topic = b4a.toString(topicBuffer, 'hex')
    return topic
  },

  // Send a message to all connected peers
  sendMessage: (message) => {
    console.log('Sending message to peers:', message);
    // Send the message to all peers
    let sentCount = 0;
    for (const peer of connectedPeers.values()) {
      try {
        peer.write(message)
        sentCount++;
      } catch (err) {
        console.error('Error sending message to peer:', err);
      }
    }
    console.log(`Message sent to ${sentCount} peers`);
    return sentCount > 0
  },

  // Get the current number of connected peers
  getPeerCount: () => {
    return connectedPeers.size
  },

  // Get the current topic (room ID)
  getCurrentTopic: () => {
    return activeTopic ? b4a.toString(activeTopic, 'hex') : null
  },

  // Leave the current room
  leaveRoom: async () => {
    console.log('Leaving room');
    if (activeTopic) {
      swarm.leave(activeTopic)
      activeTopic = null
      connectedPeers.clear()
      console.log('Room left successfully');
      return true
    }
    console.log('No active room to leave');
    return false
  }
}

// Register event handlers for peer connections and messages
let messageCallback = null

export function onMessage(callback) {
  messageCallback = callback
  console.log('Message callback registered');
}

// Join the swarm with the given topic
async function joinSwarm(topicBuffer) {
  console.log('Joining swarm...');
  
  // Leave previous room if there is one
  if (activeTopic) {
    console.log('Leaving previous room');
    swarm.leave(activeTopic)
    connectedPeers.clear()
  }

  activeTopic = topicBuffer
  
  // Join the swarm with the topic
  console.log('Connecting to the DHT network...');
  const discovery = swarm.join(topicBuffer, { client: true, server: true })
  await discovery.flushed()
  console.log('Connected to the DHT network');

  return b4a.toString(topicBuffer, 'hex')
}

// Handle new connections and messages
swarm.on('connection', (peer) => {
  // Use first 6 chars of public key as peer name
  const id = b4a.toString(peer.remotePublicKey, 'hex')
  const name = id.substr(0, 6)
  
  console.log(`New peer connected: ${name}`);
  
  // Store the connection
  connectedPeers.set(id, peer)
  
  // Handle incoming messages
  peer.on('data', message => {
    const messageStr = b4a.toString(message);
    console.log(`Received message from ${name}: ${messageStr.substring(0, 30)}${messageStr.length > 30 ? '...' : ''}`);
    
    if (messageCallback) {
      messageCallback(name, messageStr)
    }
  })
  
  // Handle disconnections
  peer.on('close', () => {
    console.log(`Peer disconnected: ${name}`);
    connectedPeers.delete(id)
  })
  
  peer.on('error', e => {
    console.error(`Connection error with peer ${name}: ${e}`)
    connectedPeers.delete(id)
  })
})

// Update the connected peers count whenever the swarm changes
swarm.on('update', () => {
  console.log(`Peer count updated: ${connectedPeers.size} connected peers`);
})

// Cleanup when the app is closed
if (typeof Pear !== 'undefined' && Pear.teardown) {
  console.log('Registering Pear teardown handler');
  Pear.teardown(() => {
    console.log('Destroying swarm connections');
    swarm.destroy()
  })
} 