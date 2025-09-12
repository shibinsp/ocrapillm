import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FiFile, FiTrash2, FiDownload, FiSearch, FiClock, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { apiService, formatFileSize } from '../services/api';

const Sidebar = () => {
  const { state, actions } = useApp();
  const { documents, currentDocument } = state;
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const notProcessing = doc.status !== 'processing'; // Hide processing documents
    return matchesSearch && notProcessing;
  });

  const handleDocumentSelect = (document) => {
    actions.setCurrentDocument(document);
    actions.setActiveTab('editor');
    
    // Load document content
    if (document.id.includes('fallback')) {
      const fallbackText = 'This is a sample document for testing purposes.\n\nYou can edit this text and test the save functionality.\n\nThe OCR system would normally extract text from uploaded PDF documents.';
      actions.setExtractedText(fallbackText);
    } else {
      // Load document content for real documents
      loadDocumentContent(document.id);
    }
  };

  const loadDocumentContent = async (documentId) => {
    try {
      const content = await apiService.getDocumentContent(documentId);
      // The API returns the text directly in the 'text' field
      actions.setExtractedText(content.text || content || '');
    } catch (error) {
      console.error('Failed to load document content:', error);
      actions.showError('Failed to load document content');
    }
  };

  const handleDeleteDocument = async (documentId, event) => {
    event.stopPropagation();
    try {
      await apiService.deleteDocument(documentId);
      actions.deleteDocument(documentId);
      actions.showSuccess('Document deleted successfully');
      setShowDeleteConfirm(null);
    } catch (error) {
      actions.showError('Failed to delete document');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FiCheck className="w-4 h-4 text-green-500" />;
      case 'error':
        return <FiAlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FiClock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full bg-white dark:bg-secondary-800 border-r border-secondary-200 dark:border-secondary-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
        <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
          Documents
        </h2>
        
        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {/* Document List */}
      <div className="flex-1 overflow-y-auto">
        {filteredDocuments.length === 0 ? (
          <div className="p-4 text-center">
            <FiFile className="w-12 h-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-3" />
            <p className="text-secondary-500 dark:text-secondary-400 text-sm">
              {searchTerm ? 'No documents found' : 'No documents yet'}
            </p>
            {!searchTerm && (
              <p className="text-secondary-400 dark:text-secondary-500 text-xs mt-1">
                Upload a PDF to get started
              </p>
            )}
          </div>
        ) : (
          <div className="p-2">
            {filteredDocuments.map((document) => (
              <div
                key={document.id}
                onClick={() => handleDocumentSelect(document)}
                className={`relative group p-3 rounded-lg cursor-pointer transition-all duration-200 mb-2 ${
                  currentDocument?.id === document.id
                    ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                    : 'hover:bg-secondary-50 dark:hover:bg-secondary-700 border border-transparent'
                }`}
              >
                {/* Document Info */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(document.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-secondary-900 dark:text-white truncate">
                      {document.name}
                    </h3>
                    
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-secondary-500 dark:text-secondary-400">
                        {formatDate(document.created_at)}
                      </span>
                      {document.size && (
                        <>
                          <span className="text-xs text-secondary-400">•</span>
                          <span className="text-xs text-secondary-500 dark:text-secondary-400">
                            {formatFileSize(document.size)}
                          </span>
                        </>
                      )}
                    </div>
                    
                    {document.pages && (
                      <div className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                        {document.pages} pages
                      </div>
                    )}
                    
                    {/* Status Text */}
                    <div className="text-xs mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        document.status === 'completed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : document.status === 'processing'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          : document.status === 'error'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {document.status === 'completed' && 'Ready'}
                        {document.status === 'processing' && 'Processing'}
                        {document.status === 'error' && 'Error'}
                        {document.status === 'pending' && 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="flex items-center space-x-1">
                    {/* Download */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle download
                      }}
                      className="p-1 rounded hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors"
                      title="Download"
                    >
                      <FiDownload className="w-3 h-3 text-secondary-600 dark:text-secondary-400" />
                    </button>
                    
                    {/* Delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(document.id);
                      }}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete"
                    >
                      <FiTrash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                </div>
                
                {/* Delete Confirmation */}
                {showDeleteConfirm === document.id && (
                  <div className="absolute inset-0 bg-white dark:bg-secondary-800 rounded-lg border border-red-200 dark:border-red-800 p-3 z-10">
                    <p className="text-sm text-secondary-900 dark:text-white mb-3">
                      Delete this document?
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => handleDeleteDocument(document.id, e)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(null);
                        }}
                        className="flex-1 bg-secondary-200 hover:bg-secondary-300 dark:bg-secondary-600 dark:hover:bg-secondary-500 text-secondary-800 dark:text-secondary-200 text-xs py-1 px-2 rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-secondary-200 dark:border-secondary-700">
        <div className="text-xs text-secondary-500 dark:text-secondary-400 text-center">
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;