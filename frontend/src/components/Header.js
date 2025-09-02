import React from 'react';
import { useApp } from '../context/AppContext';
import { FiMenu, FiSun, FiMoon, FiSettings, FiHelpCircle } from 'react-icons/fi';

const Header = () => {
  const { state, actions } = useApp();
  const { darkMode, currentDocument } = state;

  return (
    <header className="bg-white dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700 h-16 flex items-center justify-between px-4 lg:px-6 shadow-sm">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {/* Sidebar Toggle */}
        <button
          onClick={actions.toggleSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
          aria-label="Toggle sidebar"
        >
          <FiMenu className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
        </button>
        
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-secondary-900 dark:text-white">
              OCR AI Assistant
            </h1>
            {currentDocument && (
              <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate max-w-48">
                {currentDocument.name}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Center Section - Navigation (Desktop) */}
      <nav className="hidden lg:flex items-center space-x-1">
        <button
          onClick={() => actions.setActiveTab('upload')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            state.activeTab === 'upload'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700'
          }`}
        >
          Upload
        </button>
        
        <button
          onClick={() => actions.setActiveTab('editor')}
          disabled={!currentDocument}
          className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            state.activeTab === 'editor'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700'
          }`}
        >
          Editor
        </button>
        
        <button
          onClick={() => actions.setActiveTab('chat')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            state.activeTab === 'chat'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700'
          }`}
        >
          Chat
        </button>
        
        <button
          onClick={() => actions.setActiveTab('documents')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            state.activeTab === 'documents'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700'
          }`}
        >
          Documents
        </button>
      </nav>
      
      {/* Right Section */}
      <div className="flex items-center space-x-2">
        {/* Processing Status Indicator */}
        {(state.isUploading || state.isProcessing) && (
          <div className="flex items-center space-x-2 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 rounded-full">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
              {state.isUploading ? 'Uploading...' : state.processingStatus || 'Processing...'}
            </span>
          </div>
        )}
        
        {/* Theme Toggle */}
        <button
          onClick={actions.toggleDarkMode}
          className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <FiSun className="w-5 h-5 text-yellow-500" />
          ) : (
            <FiMoon className="w-5 h-5 text-secondary-600" />
          )}
        </button>
        
        {/* Settings */}
        <button
          className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
          aria-label="Settings"
        >
          <FiSettings className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
        </button>
        
        {/* Help */}
        <button
          className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
          aria-label="Help"
        >
          <FiHelpCircle className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
        </button>
      </div>
    </header>
  );
};

export default Header;