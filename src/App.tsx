import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Welcome from './pages/Welcome'
import Chat from './pages/Chat'
import HostLLM from './pages/HostLLM'
import Dashboard from './pages/Dashboard'

// Define app states
type AppPage = 'welcome' | 'chat' | 'hostLLM' | 'dashboard';

function App() {
  const [darkMode, setDarkMode] = useState(false)
  const [currentPage, setCurrentPage] = useState<AppPage>('welcome')
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  // const [currentRoomId, setCurrentRoomId] = useState<string | null>("1234567890")

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    
    // Check if dark mode should be enabled
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }

    // Check if we're already in a room
    if (typeof window.ChatAPI !== 'undefined') {
      const existingRoom = window.ChatAPI.getCurrentTopic();
      if (existingRoom) {
        setCurrentRoomId(existingRoom);
        
        // Check if we're a host, navigate to dashboard instead of chat
        try {
          const identity = window.ChatAPI.getUserIdentity();
          if (identity.hostStatus?.isHost) {
            setCurrentPage('dashboard');
          } else {
            setCurrentPage('chat');
          }
        } catch (error) {
          console.error('Failed to check host status:', error);
          setCurrentPage('chat');
        }
      }
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // Navigation functions
  const navigateToChat = (roomId: string) => {
    setCurrentRoomId(roomId);
    setCurrentPage('chat');
  }

  const navigateToHostLLM = (roomId: string) => {
    setCurrentRoomId(roomId);
    setCurrentPage('hostLLM');
  }

  const navigateToDashboard = (roomId: string) => {
    setCurrentRoomId(roomId);
    setCurrentPage('dashboard');
  }

  const navigateToWelcome = () => {
    setCurrentPage('welcome');
    setCurrentRoomId(null);
  }

  // Render the correct component based on current state
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard 
            roomId={currentRoomId} 
            onLeaveRoom={navigateToWelcome}
            onNavigateToChat={navigateToChat}
          />
        );
      case 'chat':
        return <Chat roomId={currentRoomId} onLeaveRoom={navigateToWelcome} />;
      case 'hostLLM':
        return (
          <HostLLM 
            roomId={currentRoomId} 
            onLeaveRoom={navigateToWelcome}
            onContinueToChat={(roomId) => navigateToDashboard(roomId)}
          />
        );
      case 'welcome':
      default:
        return <Welcome onJoinRoom={navigateToChat} onCreateHostRoom={navigateToHostLLM} />;
    }
  }

  return (
    <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      {renderCurrentPage()}
    </Layout>
  )
}

export default App
