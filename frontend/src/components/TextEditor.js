import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { FiSave, FiDownload, FiSearch, FiCopy, FiRefreshCw, FiMaximize2, FiMinimize2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const TextEditor = () => {
  const { state, actions } = useApp();
  const { currentDocument, extractedText, isTextModified } = state;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [isSaving, setIsSaving] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [documentPages, setDocumentPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loadingPages, setLoadingPages] = useState(false);
  const textareaRef = useRef(null);

  // Update word and character count
  useEffect(() => {
    const words = extractedText.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharCount(extractedText.length);
  }, [extractedText]);

  // Fetch document pages when document changes
  useEffect(() => {
    if (currentDocument?.id) {
      fetchDocumentPages();
    }
  }, [currentDocument?.id]);

  const fetchDocumentPages = async () => {
    try {
      setLoadingPages(true);
      const pages = await apiService.getDocumentPages(currentDocument.id);
      setDocumentPages(pages);
      setCurrentPageIndex(0);
    } catch (error) {
      console.error('Error fetching document pages:', error);
      setDocumentPages([]);
    } finally {
      setLoadingPages(false);
    }
  };

  // Page navigation functions
  const nextPage = () => {
    if (currentPageIndex < documentPages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const prevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const goToPage = (index) => {
    if (index >= 0 && index < documentPages.length) {
      setCurrentPageIndex(index);
    }
  };

  // Search functionality
  useEffect(() => {
    if (searchTerm && extractedText) {
      const regex = new RegExp(searchTerm, 'gi');
      const matches = [...extractedText.matchAll(regex)];
      setSearchResults(matches.map(match => match.index));
      setCurrentSearchIndex(matches.length > 0 ? 0 : -1);
    } else {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
    }
  }, [searchTerm, extractedText]);

  // Highlight search results
  const highlightText = (text) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };

  // Navigate search results
  const navigateSearch = (direction) => {
    if (searchResults.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = currentSearchIndex < searchResults.length - 1 ? currentSearchIndex + 1 : 0;
    } else {
      newIndex = currentSearchIndex > 0 ? currentSearchIndex - 1 : searchResults.length - 1;
    }
    
    setCurrentSearchIndex(newIndex);
    
    // Scroll to the result
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const position = searchResults[newIndex];
      textarea.focus();
      textarea.setSelectionRange(position, position + searchTerm.length);
      textarea.scrollTop = (position / extractedText.length) * textarea.scrollHeight;
    }
  };

  // Save text
  const handleSave = async () => {
    if (!currentDocument || !isTextModified) return;
    
    setIsSaving(true);
    try {
      await apiService.validateDocument(currentDocument.id, extractedText);
      actions.setTextSaved();
      actions.showSuccess('Document saved successfully');
    } catch (error) {
      actions.showError('Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      actions.showSuccess('Text copied to clipboard');
    } catch (error) {
      actions.showError('Failed to copy text');
    }
  };

  // Export document
  const handleExport = async (format = 'txt') => {
    try {
      const blob = await apiService.exportDocument(currentDocument.id, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentDocument.name.replace('.pdf', '')}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      actions.showSuccess(`Document exported as ${format.toUpperCase()}`);
    } catch (error) {
      actions.showError('Failed to export document');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
      if (event.ctrlKey && event.key === 'f') {
        event.preventDefault();
        document.getElementById('search-input')?.focus();
      }
      if (event.key === 'F11') {
        event.preventDefault();
        setIsFullscreen(!isFullscreen);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  if (!currentDocument) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-secondary-100 dark:bg-secondary-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiSearch className="w-8 h-8 text-secondary-400" />
        </div>
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
          No Document Selected
        </h3>
        <p className="text-secondary-600 dark:text-secondary-400">
          Upload a document or select one from the sidebar to start editing.
        </p>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-secondary-900' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-secondary-200 dark:border-secondary-700">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
              {currentDocument.name}
            </h2>
            <div className="flex items-center space-x-4 text-sm text-secondary-500 dark:text-secondary-400">
              <span>{wordCount} words</span>
              <span>{charCount} characters</span>
              {isTextModified && (
                <span className="text-orange-600 dark:text-orange-400">• Unsaved changes</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <input
              id="search-input"
              type="text"
              placeholder="Search in document..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-8 pr-4 py-2 text-sm border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <FiSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
            
            {searchResults.length > 0 && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <span className="text-xs text-secondary-500">
                  {currentSearchIndex + 1}/{searchResults.length}
                </span>
                <button
                  onClick={() => navigateSearch('prev')}
                  className="p-1 hover:bg-secondary-100 dark:hover:bg-secondary-600 rounded"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => navigateSearch('next')}
                  className="p-1 hover:bg-secondary-100 dark:hover:bg-secondary-600 rounded"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
            title="Copy text (Ctrl+C)"
          >
            <FiCopy className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
          </button>
          
          <div className="relative group">
            <button className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
              <FiDownload className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
            </button>
            
            {/* Export Dropdown */}
            <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <button
                onClick={() => handleExport('txt')}
                className="w-full text-left px-3 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 first:rounded-t-lg"
              >
                Export as TXT
              </button>
              <button
                onClick={() => handleExport('docx')}
                className="w-full text-left px-3 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 last:rounded-b-lg"
              >
                Export as DOCX
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
            title="Toggle fullscreen (F11)"
          >
            {isFullscreen ? (
              <FiMinimize2 className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
            ) : (
              <FiMaximize2 className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
            )}
          </button>
          
          <button
            onClick={handleSave}
            disabled={!isTextModified || isSaving}
            className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save changes (Ctrl+S)"
          >
            {isSaving ? (
              <div className="flex items-center space-x-2">
                <FiRefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <FiSave className="w-4 h-4" />
                <span>Save</span>
              </div>
            )}
          </button>
        </div>
      </div>
      
      {/* Two-Page Book View */}
      <div className="flex-1 p-6 flex justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex gap-6 max-w-7xl w-full">
          {/* Left Page - Original Image */}
          <div className="flex-1 max-w-2xl">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Original Document
                  </h3>
                  {documentPages.length > 0 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Page {currentPageIndex + 1} of {documentPages.length}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4">
                {loadingPages ? (
                  <div className="flex items-center justify-center h-[600px] bg-gray-100 dark:bg-gray-700 rounded">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-gray-500 dark:text-gray-400">Loading pages...</p>
                    </div>
                  </div>
                ) : documentPages.length > 0 && documentPages[currentPageIndex]?.imageUrl ? (
                  <div className="flex justify-center">
                    <img
                      src={documentPages[currentPageIndex].imageUrl}
                      alt={`Page ${currentPageIndex + 1}`}
                      className="max-w-full h-auto border border-gray-300 dark:border-gray-600 rounded shadow-sm"
                      style={{ maxHeight: '600px', aspectRatio: '210/297' }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[600px] bg-gray-100 dark:bg-gray-700 rounded">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400">No image available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Page - Extracted Text */}
          <div className="flex-1 max-w-2xl">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Extracted Text
                  </h3>
                  <div className="flex items-center space-x-2">
                    {isTextModified && (
                      <span className="text-sm text-orange-600 dark:text-orange-400">
                        Unsaved changes
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <textarea
                  ref={textareaRef}
                  value={extractedText}
                  onChange={(e) => actions.updateText(e.target.value)}
                  className="w-full h-[600px] p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm leading-relaxed"
                  style={{ minHeight: '600px', aspectRatio: '210/297' }}
                  placeholder="Extracted text will appear here..."
                  spellCheck={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page Navigation */}
      {documentPages.length > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={prevPage}
              disabled={currentPageIndex === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FiChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            
            <div className="flex items-center space-x-2">
              {documentPages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToPage(index)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    index === currentPageIndex
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            
            <button
              onClick={nextPage}
              disabled={currentPageIndex === documentPages.length - 1}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-secondary-200 dark:border-secondary-700 text-sm text-secondary-500 dark:text-secondary-400">
        <div className="flex items-center space-x-4">
          <span>Status: {currentDocument.status}</span>
          <span>Pages: {currentDocument.pages || 1}</span>
          {searchResults.length > 0 && (
            <span>{searchResults.length} search results</span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <span>Ctrl+S to save</span>
          <span>Ctrl+F to search</span>
          <span>F11 for fullscreen</span>
        </div>
      </div>
    </div>
  );
};

export default TextEditor;