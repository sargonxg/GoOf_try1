
import React from 'react';
import { AppView } from '../types';
import ChatIcon from './icons/ChatIcon';
import DocumentIcon from './icons/DocumentIcon';
import UNLogoIcon from './icons/UNLogoIcon';

interface HeaderProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, setView }) => {
  const navButtonClasses = (view: AppView) =>
    `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      currentView === view
        ? 'bg-blue-600 text-white'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
    }`;

  return (
    <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <UNLogoIcon className="h-9 w-9 text-blue-600" />
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
          UN Document Analyst
        </h1>
      </div>
      <nav className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
        <button onClick={() => setView(AppView.DOCUMENTS)} className={navButtonClasses(AppView.DOCUMENTS)}>
          <DocumentIcon className="h-5 w-5" />
          Documents
        </button>
        <button onClick={() => setView(AppView.CHAT)} className={navButtonClasses(AppView.CHAT)}>
          <ChatIcon className="h-5 w-5" />
          Chat
        </button>
      </nav>
    </header>
  );
};

export default Header;
