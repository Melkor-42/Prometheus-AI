import Hyperswarm from 'hyperswarm'   // Module for P2P networking and connecting peers
import crypto from 'hypercore-crypto' // Cryptographic functions for generating the key in app
import b4a from 'b4a'                 // Module for buffer-to-string and vice-versa conversions 
const { teardown, updates } = Pear    // Functions for cleanup and updates

console.log('Backend module loaded - creating Hyperswarm instance');
const swarm = new Hyperswarm()
console.log('Hyperswarm instance created');

teardown(() => {
  console.log('TEARDOWN: Destroying Hyperswarm instance and all connections');
  swarm.destroy();
})
updates(() => Pear.reload())

let activeTopic = null
let currentRoomId = null
let swarmConnections = 0

// API for the frontend to call
export default {
  // Create a new chat room
  createRoom: async () => {
    console.log('BE Creating new room...');
    const topicBuffer = crypto.randomBytes(32)
    const topic = await joinSwarm(topicBuffer)
    console.log('Room created with ID:', topic);
  
    activeTopic = topicBuffer
    currentRoomId = topic
    return topic
  },

  // Join an existing chat room
  joinRoom: async (roomId, stealth = false) => {
    console.log(`Joining room: ${roomId} with stealth=${stealth}`);
    try {
      const topicBuffer = b4a.from(roomId, 'hex')
      await joinSwarm(topicBuffer, stealth)
      console.log('Successfully joined room');
      return true
    } catch (err) {
      console.error('Failed to join room:', err);
      return false
    }
  },

  // Send a message to all connected peers
  sendMessage: (message) => {
    console.log('Sending message to peers:', message);
    // Send the message to all peers
    let sentCount = 0;
    const peers = [...swarm.connections];
    for (const peer of peers) {
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
    return swarmConnections
  },

  // Get the current topic (room ID)
  getCurrentTopic: () => {
    return activeTopic ? b4a.toString(activeTopic, 'hex') : null
  },

  // Leave the current room
  leaveRoom: async () => {
    console.log('Leaving room...')
  
    if (activeTopic) {
      try {
        await swarm.leave(activeTopic)        // stop DHT discovery
        closeAllConnections()                 // close live sockets
  
        activeTopic = null
        currentRoomId = null
  
        console.log('Room left successfully')
        return true
      } catch (err) {
        console.error('Error leaving room:', err)
        return false
      }
    }
  
    console.log('No active room to leave')
    return false
  }
}

// Register event handlers for peer connections and messages
let messageCallback = null

export function onMessage(callback) {
  messageCallback = callback
  console.log('Message callback registered');
}

async function joinSwarm(topicBuffer, stealth = false) {
  console.log('Joining swarm... (stealth mode:', stealth, ')')

  // Clean up previous room
  if (activeTopic) {
    console.log('Leaving previous topic')
    try {
      await swarm.leave(activeTopic)
      closeAllConnections()
    } catch (err) {
      console.warn('Failed to fully leave previous topic:', err)
    }
    activeTopic = null
    currentRoomId = null
  }

  const options = stealth
    ? { client: true, server: false }
    : { client: true, server: true }

  console.log('Connecting to the DHT network with options:', options)
  const discovery = swarm.join(topicBuffer, options)
  await discovery.flushed()
  console.log('Connected to the DHT network')

  const topic = b4a.toString(topicBuffer, 'hex')
  activeTopic = topicBuffer
  currentRoomId = topic
  return topic
}

// Handle new connections and messages
swarm.on('connection', (peer) => {
  // Use first 6 chars of public key as peer name
  const id = b4a.toString(peer.remotePublicKey, 'hex')
  const name = id.substr(0, 6)
  
  console.log(`New peer connected: ${name}`);
  
  // Store the connection
  // connectedPeers.set(id, peer)
  
  // Handle incoming messages
  peer.on('data', message => {
    const messageStr = b4a.toString(message);
    // const messageStr = message
    // console.log(`Received message from ${name}: ${messageStr}`);
    
    if (messageCallback) {
      messageCallback(name, messageStr)
    }
  })
  
  peer.on('error', (e) => {
    const errorMsg = e?.message?.toLowerCase?.() || ''
  
    if (errorMsg.includes('connection reset by peer')) {
      console.log(`Peer ${name} disconnected (left the room)`)
    } else {
      console.error(`Connection error with peer ${name}:`, e)
    }
  })

  // Handle disconnections
  peer.on('close', () => {
    console.log(`Peer disconnected: ${name}`)
    //TODO: callback if needed
  })

})

swarm.on('update', () => {
  swarmConnections = swarm.connections.size
  console.log(`Peer count updated: ${swarmConnections} connected peers`);
}) 

function closeAllConnections() {
  console.log('Closing all active peer connections...')
  for (const conn of swarm.connections) {
    try {
      conn.destroy()
    } catch (e) {
      console.warn('Failed to destroy connection:', e)
    }
  }
}