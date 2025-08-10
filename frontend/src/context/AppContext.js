import React, { createContext, useContext, useReducer, useEffect } from 'react';
import toast from 'react-hot-toast';

const AppContext = createContext();

const initialState = {
  // Theme
  darkMode: false,
  
  // Documents
  documents: [],
  currentDocument: null,
  
  // Upload state
  uploadProgress: 0,
  isUploading: false,
  
  // OCR Processing
  isProcessing: false,
  processingStatus: '',
  processingProgress: 0,
  
  // Text Editor
  extractedText: '',
  isTextModified: false,
  
  // Chat
  chatMessages: [],
  isChatLoading: false,
  
  // UI State
  activeTab: 'upload', // upload, editor, chat, documents, validation
  sidebarOpen: true,
  
  // Validation
  validationDocumentId: null,
  isValidating: false,
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'TOGGLE_DARK_MODE':
      return { ...state, darkMode: !state.darkMode };
    
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    
    case 'SET_UPLOAD_PROGRESS':
      return { ...state, uploadProgress: action.payload };
    
    case 'SET_UPLOADING':
      return { ...state, isUploading: action.payload };
    
    case 'SET_PROCESSING':
      return { 
        ...state, 
        isProcessing: action.payload.isProcessing,
        processingStatus: action.payload.status || '',
        processingProgress: action.payload.progress || 0
      };
    
    case 'SET_DOCUMENTS':
      return { ...state, documents: action.payload };
    
    case 'ADD_DOCUMENT':
      return { 
        ...state, 
        documents: [action.payload, ...state.documents],
        currentDocument: action.payload
      };
    
    case 'SET_CURRENT_DOCUMENT':
      return { ...state, currentDocument: action.payload };
    
    case 'DELETE_DOCUMENT':
      const filteredDocs = state.documents.filter(doc => doc.id !== action.payload);
      return { 
        ...state, 
        documents: filteredDocs,
        currentDocument: state.currentDocument?.id === action.payload ? null : state.currentDocument
      };
    
    case 'SET_EXTRACTED_TEXT':
      return { 
        ...state, 
        extractedText: action.payload,
        isTextModified: false
      };
    
    case 'UPDATE_TEXT':
      return { 
        ...state, 
        extractedText: action.payload,
        isTextModified: true
      };
    
    case 'SET_TEXT_SAVED':
      return { ...state, isTextModified: false };
    
    case 'SET_CHAT_MESSAGES':
      return { ...state, chatMessages: action.payload };
    
    case 'ADD_CHAT_MESSAGE':
      return { 
        ...state, 
        chatMessages: [...state.chatMessages, action.payload]
      };
    
    case 'SET_CHAT_LOADING':
      return { ...state, isChatLoading: action.payload };
    
    case 'CLEAR_CHAT':
      return { ...state, chatMessages: [] };
    
    case 'RESET_UPLOAD_STATE':
      return {
        ...state,
        uploadProgress: 0,
        isUploading: false,
        isProcessing: false,
        processingStatus: '',
        processingProgress: 0
      };
    
    case 'START_VALIDATION':
      return {
        ...state,
        activeTab: 'validation',
        validationDocumentId: action.payload,
        isValidating: true
      };
    
    case 'END_VALIDATION':
      return {
        ...state,
        activeTab: 'documents',
        validationDocumentId: null,
        isValidating: false
      };
    
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme) {
      dispatch({ type: 'TOGGLE_DARK_MODE' });
    }
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', state.darkMode);
  }, [state.darkMode]);

  // Auto-save functionality
  useEffect(() => {
    if (state.isTextModified && state.currentDocument) {
      const autoSaveTimer = setTimeout(() => {
        // Auto-save logic here
        console.log('Auto-saving document...');
      }, 30000); // Auto-save after 30 seconds of inactivity

      return () => clearTimeout(autoSaveTimer);
    }
  }, [state.isTextModified, state.extractedText, state.currentDocument]);

  const actions = {
    toggleDarkMode: () => dispatch({ type: 'TOGGLE_DARK_MODE' }),
    setActiveTab: (tab) => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab }),
    toggleSidebar: () => dispatch({ type: 'TOGGLE_SIDEBAR' }),
    
    setUploadProgress: (progress) => dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: progress }),
    setUploading: (isUploading) => dispatch({ type: 'SET_UPLOADING', payload: isUploading }),
    
    setProcessing: (processingData) => dispatch({ type: 'SET_PROCESSING', payload: processingData }),
    
    setDocuments: (documents) => dispatch({ type: 'SET_DOCUMENTS', payload: documents }),
    addDocument: (document) => dispatch({ type: 'ADD_DOCUMENT', payload: document }),
    setCurrentDocument: (document) => dispatch({ type: 'SET_CURRENT_DOCUMENT', payload: document }),
    deleteDocument: (documentId) => dispatch({ type: 'DELETE_DOCUMENT', payload: documentId }),
    
    setExtractedText: (text) => dispatch({ type: 'SET_EXTRACTED_TEXT', payload: text }),
    updateText: (text) => dispatch({ type: 'UPDATE_TEXT', payload: text }),
    setTextSaved: () => dispatch({ type: 'SET_TEXT_SAVED' }),
    
    setChatMessages: (messages) => dispatch({ type: 'SET_CHAT_MESSAGES', payload: messages }),
    addChatMessage: (message) => dispatch({ type: 'ADD_CHAT_MESSAGE', payload: message }),
    setChatLoading: (isLoading) => dispatch({ type: 'SET_CHAT_LOADING', payload: isLoading }),
    clearChat: () => dispatch({ type: 'CLEAR_CHAT' }),
    
    resetUploadState: () => dispatch({ type: 'RESET_UPLOAD_STATE' }),
    
    startValidation: (documentId) => dispatch({ type: 'START_VALIDATION', payload: documentId }),
    endValidation: () => dispatch({ type: 'END_VALIDATION' }),
    
    showSuccess: (message) => toast.success(message),
    showError: (message) => toast.error(message),
    showInfo: (message) => toast(message),
  };

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;