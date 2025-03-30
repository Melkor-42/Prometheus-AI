import React from 'react';
import SunLogo from "../assets/sun.svg?react";
import MoonLogo from "../assets/moon.svg?react";

interface HeaderProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const Header: React.FC<HeaderProps> = ({ darkMode, toggleDarkMode }) => {
  return (
    <header className="draggable fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-md z-50">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center">
        {/* Pear window controls */}
        <div className="mr-4">
          {/* @ts-ignore */}
          <pear-ctrl />
        </div>

        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Prometheus AI</h1>

        <div className="flex-grow" />

        {/* Dark mode toggle should not be draggable */}
        <button
          onClick={toggleDarkMode}
          className="no-drag ml-4 p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <SunLogo /> : <MoonLogo />}
        </button>
      </div>
    </header>
  );
};

export default Header;



// import React from 'react';
// import SunLogo from "../assets/sun.svg?react";
// import MoonLogo from "../assets/moon.svg?react";

// interface HeaderProps {
//   darkMode: boolean;
//   toggleDarkMode: () => void;
// }

// const Header: React.FC<HeaderProps> = ({ darkMode, toggleDarkMode }) => {
//   return (
//     <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-md z-50">
//       <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
//         <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prometheus AI</h1>
//         <div className="flex-grow" />
//         <button
//           onClick={toggleDarkMode}
//           className="ml-4 p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
//           aria-label="Toggle dark mode"
//         >
//           {darkMode ? <SunLogo /> : <MoonLogo />}
//         </button>
//       </div>
//     </header>
//   );
// };

// export default Header; 