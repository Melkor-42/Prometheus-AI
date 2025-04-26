import React from 'react';
import SunLogo from "../assets/sun.svg?react";
import MoonLogo from "../assets/moon.svg?react";

interface HeaderProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const Header: React.FC<HeaderProps> = ({ darkMode, toggleDarkMode }) => {
  return (
    <header className="draggable bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="w-full mx-auto pl-4 sm:pl-6 lg:pl-8 h-12 flex items-center">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Prometheus AI</h1>

        <div className="flex-grow" />

        {/* Dark mode toggle should not be draggable */}
        <button
          onClick={toggleDarkMode}
          className="no-drag ml-4 p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <SunLogo className="w-4 h-4" /> : <MoonLogo className="w-4 h-4" />}
        </button>

        {/* Pear window controls */}
        <div className="mr-2">
          {/* @ts-ignore */}
          <pear-ctrl />
        </div>
      </div>
    </header>
  );
};

export default Header;