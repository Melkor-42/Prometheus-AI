import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Welcome from './pages/Welcome'
import Chat from './pages/Chat'
import LLMChat from './pages/LLMChat'

// Define app states
type Page = 'welcome' | 'chat' | 'llmChat'

function App() {
  const [darkMode, setDarkMode] = useState<boolean>(false)
  const [currentPage, setCurrentPage] = useState<Page>('welcome')
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
    setDarkMode(prev => {
      const newMode = !prev;
      if (newMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return newMode;
    });
  }

  // Navigation function
  const navigateTo = (page: Page, roomId: string | null = null) => {
    setCurrentPage(page);
    
    if (roomId !== undefined) {
      setCurrentRoomId(roomId);
    }
  }

  // Render the correct component based on current state
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'welcome':
        return <Welcome onJoinRoom={(roomId) => navigateTo('chat', roomId)} />;
      case 'chat':
        return (
          <Chat 
            roomId={currentRoomId} 
            onLeaveRoom={() => navigateTo('welcome', null)} 
            onStartLLMChat={() => navigateTo('llmChat')}
          />
        );
      case 'llmChat':
        return (
          <LLMChat
            roomId={currentRoomId}
            onLeaveRoom={() => navigateTo('chat')}
          />
        );
      default:
        return <Welcome onJoinRoom={(roomId) => navigateTo('chat', roomId)} />;
    }
  }

  return (
    <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      {renderCurrentPage()}
    </Layout>
  )
}

export default App
