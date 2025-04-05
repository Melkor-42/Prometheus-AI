import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const rootElement = document.getElementById('root')!
const root = createRoot(rootElement)

// Load the scripts dynamically if they're not already loaded
const loadScripts = async () => {
  // Check if ChatAPI is already available
  if (window.ChatAPI) {
    return
  }
  
  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.onload = () => resolve()
      script.onerror = (error) => reject(error)
      document.head.appendChild(script)
    })
  }
  
  try {
    // Load Pear SDK and bridge
    await loadScript('./prometheus-pear/pear-sdk.js')
    await loadScript('./prometheus-pear/bridge.js')
    
    if (!window.ChatAPI) {
      throw new Error('ChatAPI not initialized correctly')
    }
  } catch (error) {
    throw error
  }
}

// Setup check for ChatAPI
const waitForChatAPI = () => {
  return new Promise<void>((resolve, reject) => {
    // First try: if ChatAPI is already available
    if (window.ChatAPI) {
      resolve()
      return
    }
    
    // Second try: check periodically
    let attempts = 0
    const maxAttempts = 50 // 5 seconds
    
    const checkInterval = setInterval(() => {
      attempts++
      
      if (window.ChatAPI) {
        clearInterval(checkInterval)
        resolve()
        return
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval)
        reject(new Error('Timed out waiting for ChatAPI'))
      }
    }, 100)
    
    // Also listen for the event
    window.addEventListener('chatapi-ready', () => {
      clearInterval(checkInterval)
      resolve()
    }, { once: true })
  })
}

// Initialize and then render the app
const initializeAndRender = async () => {
  try {
    await loadScripts()
    await waitForChatAPI()
    
    console.log('ChatAPI is ready, rendering app')
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  } catch (error) {
    console.error('Failed to initialize:', error)
    // Still render the app, but with an error state
    root.render(
      <StrictMode>
        <div className="p-4 text-red-600">
          <h1 className="text-xl font-bold">Failed to initialize</h1>
          <p className="mt-2">Could not load the required scripts or ChatAPI.</p>
          <pre className="mt-4 p-2 bg-gray-100 rounded">{String(error)}</pre>
        </div>
      </StrictMode>
    )
  }
}

initializeAndRender() 