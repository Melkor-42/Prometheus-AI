import React from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, darkMode, toggleDarkMode }) => {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-200">
      <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <main className="flex-grow overflow-hidden">
        <div className="h-full w-full">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Layout; 