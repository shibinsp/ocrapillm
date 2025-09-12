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
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [documentPages, setDocumentPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loadingPages, setLoadingPages] = useState(false);
  const textareaRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);

  // Update word and character count
  useEffect(() => {
    // Ensure extractedText is a string
    const textContent = typeof extractedText === 'string' ? extractedText : (extractedText || '').toString();
    const words = textContent.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharCount(textContent.length);
  }, [extractedText]);

  // Auto-save functionality
  useEffect(() => {
    if (!currentDocument || !isTextModified || !autoSaveEnabled) return;
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new timeout for auto-save (30 seconds after last change)
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await apiService.autoSaveDocument(currentDocument.id, extractedText, 'auto');
        setLastSaveTime(new Date());
        actions.showSuccess('Document auto-saved');
        // Don't mark as saved to maintain the distinction between auto-save and manual save
      } catch (error) {
        console.error('Auto-save failed:', error);
        
        // Check if it's a "document not found" error
        if (error.response?.status === 404 || error.response?.data?.detail?.includes('Document not found')) {
          console.log('Document not found during auto-save, clearing stale state');
          actions.showError('Document no longer exists. Redirecting to document list.');
          actions.setCurrentDocument(null);
          actions.setExtractedText('');
          actions.setActiveTab('documents');
          return;
        }
        
        actions.showError('Auto-save failed');
      }
    }, 30000); // 30 seconds
    
    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [extractedText, currentDocument, isTextModified, autoSaveEnabled, actions]);
  
  // Fetch document pages when document changes
  useEffect(() => {
    if (currentDocument?.id) {
      fetchDocumentPages();
    }
  }, [currentDocument?.id]);

  const fetchDocumentPages = async () => {
    try {
      setLoadingPages(true);
      console.log('Fetching pages for document:', currentDocument.id);
      const pages = await apiService.getDocumentPages(currentDocument.id);
      console.log('Received pages:', pages);
      
      if (pages && pages.length > 0) {
        // Log the image URLs being used
        pages.forEach((page, index) => {
          console.log(`Page ${index + 1} image URL type:`, 
            page.imageUrl ? (page.imageUrl.startsWith('data:') ? 'base64 data URL' : 'external URL') : 'no URL');
        });
        setDocumentPages(pages);
        setCurrentPageIndex(0);
      } else {
        console.log('No pages returned from API - checking if document exists');
        // For documents without stored pages, create a placeholder
        setDocumentPages([]);
        setCurrentPageIndex(0);
      }
    } catch (error) {
      console.error('Error fetching document pages:', error);
      // Always show friendly error state
      setDocumentPages([]);
      setCurrentPageIndex(0);
      
      // Show user-friendly error message
      if (error.response?.status === 404) {
        console.log('Document pages not found - this may be normal for newly uploaded documents');
      } else {
        actions.showError('Failed to load document pages. You can still edit the text.');
      }
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
    const textContent = typeof extractedText === 'string' ? extractedText : (extractedText || '').toString();
    if (searchTerm && textContent) {
      const regex = new RegExp(searchTerm, 'gi');
      const matches = [...textContent.matchAll(regex)];
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
      const textContent = typeof extractedText === 'string' ? extractedText : (extractedText || '').toString();
      textarea.scrollTop = (position / textContent.length) * textarea.scrollHeight;
    }
  };

  // Save text
  const handleSave = async () => {
    if (!currentDocument || !isTextModified) {
      actions.showInfo('No changes to save');
      return;
    }
    
    setIsSaving(true);
    try {
      const textContent = typeof extractedText === 'string' ? extractedText : (extractedText || '').toString();
      console.log('Saving document:', {
        documentId: currentDocument.id,
        textLength: textContent.length,
        isModified: isTextModified
      });
      
      // Use auto-save endpoint with manual save type
      const response = await apiService.autoSaveDocument(currentDocument.id, extractedText, 'manual');
      console.log('Save response:', response);
      
      actions.setTextSaved();
      setLastSaveTime(new Date());
      actions.showSuccess('Document saved successfully');
    } catch (error) {
      console.error('Save error:', error);
      
      // Check if it's a "document not found" error
      if (error.response?.status === 404 || error.response?.data?.detail?.includes('Document not found')) {
        console.log('Document not found in database, clearing stale state');
        actions.showError('Document no longer exists. Please select a valid document.');
        actions.setCurrentDocument(null);
        actions.setExtractedText('');
        actions.setActiveTab('documents');
        setIsSaving(false);
        return;
      }
      
      // Try fallback with the validate endpoint
      try {
        console.log('Trying fallback save method...');
        await apiService.validateDocument(currentDocument.id, extractedText);
        actions.setTextSaved();
        setLastSaveTime(new Date());
        actions.showSuccess('Document saved successfully (fallback)');
      } catch (fallbackError) {
        console.error('Fallback save also failed:', fallbackError);
        
        // Show more detailed error message
        const errorMessage = error.response?.data?.detail || 
                            error.response?.data?.message || 
                            error.message || 
                            'Failed to save document';
        actions.showError(`Save failed: ${errorMessage}`);
        
        // For debugging: log the full error
        const textContent = typeof extractedText === 'string' ? extractedText : (extractedText || '').toString();
        console.error('Full save error details:', {
          originalError: error,
          fallbackError,
          documentId: currentDocument.id,
          textLength: textContent.length
        });
      }
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
              {lastSaveTime && (
                <span className="text-green-600 dark:text-green-400">
                  • Last saved: {lastSaveTime.toLocaleTimeString()}
                </span>
              )}
              {autoSaveEnabled && (
                <span className="text-blue-600 dark:text-blue-400">• Auto-save enabled</span>
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
          
          <div className="flex items-center space-x-2">
            {/* Auto-save toggle */}
            <label className="flex items-center space-x-2 text-sm text-secondary-600 dark:text-secondary-400">
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                className="rounded border-secondary-300 dark:border-secondary-600 text-primary-600 focus:ring-primary-500"
              />
              <span>Auto-save</span>
            </label>
            
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
      </div>
      
      {/* Two-Page Book View */}
      <div className="flex-1 p-6 flex justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex gap-6 max-w-7xl w-full">
          {/* Left Page - Original Image */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 h-full">
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
              <div className="p-4 h-full flex justify-center">
                {loadingPages ? (
                  <div className="flex items-center justify-center h-[600px] w-full bg-gray-100 dark:bg-gray-700 rounded">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-gray-500 dark:text-gray-400">Loading pages...</p>
                    </div>
                  </div>
                ) : documentPages.length > 0 && currentPageIndex < documentPages.length ? (
                  <div className="flex justify-center items-start w-full">
                    {/* Debug info */}
                    {console.log('Current page data:', {
                      pageIndex: currentPageIndex,
                      totalPages: documentPages.length,
                      currentPage: documentPages[currentPageIndex],
                      hasImageUrl: !!documentPages[currentPageIndex]?.imageUrl,
                      imageUrlType: documentPages[currentPageIndex]?.imageUrl?.startsWith('data:') ? 'base64' : 'url'
                    })}
                    
                    {documentPages[currentPageIndex]?.imageUrl ? (
                      <img
                        src={documentPages[currentPageIndex].imageUrl}
                        alt={`Page ${currentPageIndex + 1}`}
                        className="w-full h-[600px] object-contain border border-gray-300 dark:border-gray-600 rounded shadow-sm"
                        style={{ aspectRatio: '210/297' }}
                        onError={(e) => {
                          console.error('Image failed to load:', {
                            src: e.target.src,
                            srcLength: e.target.src?.length,
                            isBase64: e.target.src?.startsWith('data:'),
                            pageData: documentPages[currentPageIndex]
                          });
                          
                          // Show fallback UI immediately
                          e.target.style.display = 'none';
                          const fallback = e.target.nextSibling;
                          if (fallback) fallback.style.display = 'block';
                        }}
                        onLoad={() => {
                          const imageType = documentPages[currentPageIndex].imageUrl?.startsWith('data:') ? 'base64' : 'URL';
                          console.log(`✅ Image loaded successfully (${imageType}):`, 
                            documentPages[currentPageIndex].imageUrl?.substring(0, 50) + '...');
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-[600px] w-full bg-gray-100 dark:bg-gray-700 rounded">
                        <div className="text-center">
                          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <p className="text-gray-500 dark:text-gray-400 mb-2">No image URL found</p>
                          <p className="text-gray-400 dark:text-gray-500 text-sm">Page {currentPageIndex + 1} of {documentPages.length}</p>
                          <button 
                            className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                            onClick={() => {
                              console.log('🔄 Retrying page fetch for document:', currentDocument.id);
                              fetchDocumentPages();
                            }}
                          >
                            Retry Loading
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Fallback element that shows when image fails */}
                    <div 
                      className="flex items-center justify-center h-[600px] w-full bg-gray-100 dark:bg-gray-700 rounded" 
                      style={{ display: 'none' }}
                    >
                      <div className="text-center">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <p className="text-gray-500 dark:text-gray-400 mb-2">Failed to load image</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm">Document ID: {currentDocument.id}</p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Check console for errors</p>
                        <button 
                          className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                          onClick={() => {
                            console.log('🔄 Retrying document page fetch...');
                            fetchDocumentPages();
                          }}
                        >
                          Retry Loading
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[600px] w-full bg-gray-100 dark:bg-gray-700 rounded">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400 mb-2">No pages available</p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm">Document: {currentDocument.name}</p>
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Pages found: {documentPages.length}</p>
                      <button 
                        className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                        onClick={() => {
                          console.log('🔄 Attempting to fetch pages for:', currentDocument.id);
                          fetchDocumentPages();
                        }}
                      >
                        Load Pages
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Page - Extracted Text */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 h-full">
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
                  value={typeof extractedText === 'string' ? extractedText : (extractedText || '').toString()}
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
              {documentPages.map((page, index) => (
                <button
                  key={`page-${index}-${page.id || page.imageUrl || index}`}
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