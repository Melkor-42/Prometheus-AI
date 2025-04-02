import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Welcome from './pages/Welcome'
import Chat from './pages/Chat'

// Define app states
type AppPage = 'welcome' | 'chat';

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
        setCurrentPage('chat');
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

  const navigateToWelcome = () => {
    setCurrentPage('welcome');
    setCurrentRoomId(null);
  }

  // Render the correct component based on current state
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'chat':
        return <Chat roomId={currentRoomId} onLeaveRoom={navigateToWelcome} />;
      case 'welcome':
      default:
        return <Welcome onJoinRoom={navigateToChat} />;
    }
  }

  return (
    <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      {renderCurrentPage()}
    </Layout>
  )
}

export default App
