import React, { useEffect } from 'react';
import { useApp } from './context/AppContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import UploadSection from './components/UploadSection';
import ProcessingView from './components/ProcessingView';
import TextEditor from './components/TextEditor';
import ChatInterface from './components/ChatInterface';
import DocumentList from './components/DocumentList';
import ValidationPage from './components/ValidationPage';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { apiService } from './services/api';

function App() {
  const { state, actions } = useApp();
  const {
    activeTab,
    sidebarOpen,
    darkMode,
    currentDocument,
    isProcessing,
    isUploading,
    validationDocumentId
  } = state;

  // Load documents on app start
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const documents = await apiService.getDocuments();
        actions.setDocuments(documents);
      } catch (error) {
        console.error('Failed to load documents:', error);
        actions.showError('Failed to load documents');
      }
    };

    loadDocuments();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl+S for save
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        if (activeTab === 'editor' && currentDocument) {
          // Trigger save action
          console.log('Save shortcut triggered');
        }
      }
      
      // Ctrl+D for dark mode toggle
      if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        actions.toggleDarkMode();
      }
      
      // Escape to close sidebar on mobile
      if (event.key === 'Escape' && window.innerWidth < 768) {
        actions.toggleSidebar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, currentDocument, actions]);

  const renderMainContent = () => {
    if (isUploading || isProcessing) {
      return <ProcessingView />;
    }

    switch (activeTab) {
      case 'upload':
        return <UploadSection />;
      case 'editor':
        return currentDocument ? <TextEditor /> : <UploadSection />;
      case 'chat':
        return <ChatInterface />;
      case 'documents':
        return <DocumentList />;
      case 'validation':
        return validationDocumentId ? (
          <ValidationPage 
            documentId={validationDocumentId} 
            onClose={actions.endValidation}
          />
        ) : <DocumentList />;
      default:
        return <UploadSection />;
    }
  };

  return (
    <ErrorBoundary>
      <div className={`min-h-screen bg-secondary-50 dark:bg-secondary-900 transition-colors duration-200 ${darkMode ? 'dark' : ''}`}>
        {/* Header */}
        <Header />
        
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Sidebar */}
          <div className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            fixed lg:relative lg:translate-x-0
            z-30 lg:z-0
            w-64 lg:w-80
            h-full
            transition-transform duration-300 ease-in-out
            lg:transition-none
          `}>
            <Sidebar />
          </div>
          
          {/* Sidebar overlay for mobile */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
              onClick={actions.toggleSidebar}
            />
          )}
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Primary Content */}
            <div className="flex-1 overflow-auto">
              <div className="p-4 lg:p-6">
                {renderMainContent()}
              </div>
            </div>
            
            {/* Chat Panel (Desktop) */}
            {currentDocument && activeTab !== 'chat' && (
              <div className="hidden xl:block w-96 border-l border-secondary-200 dark:border-secondary-700">
                <div className="h-full">
                  <ChatInterface isPanel={true} />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-secondary-800 border-t border-secondary-200 dark:border-secondary-700 z-10">
          <div className="flex justify-around py-2">
            <button
              onClick={() => actions.setActiveTab('upload')}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                activeTab === 'upload'
                  ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-secondary-600 dark:text-secondary-400'
              }`}
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-xs">Upload</span>
            </button>
            
            <button
              onClick={() => actions.setActiveTab('editor')}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                activeTab === 'editor'
                  ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-secondary-600 dark:text-secondary-400'
              }`}
              disabled={!currentDocument}
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-xs">Editor</span>
            </button>
            
            <button
              onClick={() => actions.setActiveTab('chat')}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                activeTab === 'chat'
                  ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-secondary-600 dark:text-secondary-400'
              }`}
              disabled={!currentDocument}
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-xs">Chat</span>
            </button>
            
            <button
              onClick={() => actions.setActiveTab('documents')}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                activeTab === 'documents'
                  ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-secondary-600 dark:text-secondary-400'
              }`}
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-xs">Docs</span>
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;