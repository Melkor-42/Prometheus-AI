import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Welcome from './pages/Welcome'
// import Chat from './pages/Chat'

function App() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    
    // Check if dark mode should be enabled
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
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

  return (
    <BrowserRouter>
      <Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
        <Welcome />
        {/* <Routes> */}
          {/* <Route path="/" element={<Welcome />} /> */}
          {/* <Route path="/chat/:roomId?" element={<Chat />} /> */}
        {/* </Routes> */}
      </Layout>
    </BrowserRouter>
  )
}

export default App
