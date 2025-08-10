import React, { useState, useEffect } from 'react';
import { FiSave, FiArrowLeft, FiCheck, FiX, FiZoomIn, FiZoomOut } from 'react-icons/fi';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';

const ValidationPage = ({ documentId, onClose }) => {
  const { actions } = useApp();
  const [document, setDocument] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchDocumentData();
  }, [documentId]);

  useEffect(() => {
    if (pages.length > 0 && currentPageIndex < pages.length) {
      const currentPage = pages[currentPageIndex];
      setExtractedText(currentPage.extractedText || '');
      setOriginalText(currentPage.extractedText || '');
      setHasChanges(false);
    }
  }, [currentPageIndex, pages]);

  const fetchDocumentData = async () => {
    try {
      setLoading(true);
      
      // Fetch document details
      const docResponse = await apiService.getDocumentContent(documentId);
      setDocument(docResponse);
      
      // Fetch document pages with images and text
      const pagesResponse = await apiService.getDocumentPages(documentId);
      setPages(pagesResponse);
      
    } catch (error) {
      console.error('Error fetching document data:', error);
      alert('Failed to load document data');
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (value) => {
    setExtractedText(value);
    setHasChanges(value !== originalText);
  };

  const handleSavePage = async () => {
    if (!hasChanges) return;
    
    try {
      setSaving(true);
      
      await apiService.validatePage(documentId, pages[currentPageIndex].id, extractedText);
      
      // Update the page data
      const updatedPages = [...pages];
      updatedPages[currentPageIndex].extractedText = extractedText;
      updatedPages[currentPageIndex].validated = true;
      setPages(updatedPages);
      setOriginalText(extractedText);
      setHasChanges(false);
      
      alert('Page validated and saved successfully!');
    } catch (error) {
      console.error('Error saving validation:', error);
      alert('Failed to save validation');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAllPages = async () => {
    try {
      setSaving(true);
      
      // Combine all page texts
      const completeText = pages.map(page => page.extractedText || '').join('\n\n');
      
      await apiService.validateDocument(documentId, completeText);
      
      alert('All pages validated and saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving all validations:', error);
      alert('Failed to save all validations');
    } finally {
      setSaving(false);
    }
  };

  const nextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const prevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const goToPage = (index) => {
    setCurrentPageIndex(index);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading document for validation...</p>
        </div>
      </div>
    );
  }

  if (!document || pages.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FiX className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Document not found or has no pages</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

  const currentPage = pages[currentPageIndex];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <FiArrowLeft className="h-5 w-5" />
                <span>Back to Documents</span>
              </button>
              <div className="h-6 border-l border-gray-300 dark:border-gray-600"></div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Validate: {document.name}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {currentPageIndex + 1} of {pages.length}
              </span>
              <button
                onClick={handleSavePage}
                disabled={!hasChanges || saving}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  hasChanges && !saving
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <FiSave className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Page'}</span>
              </button>
              <button
                onClick={handleSaveAllPages}
                disabled={saving}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <FiCheck className="h-4 w-4" />
                <span>Save All & Complete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* Left Side - Original Image */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Original Page Image
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setImageZoom(Math.max(0.5, imageZoom - 0.25))}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <FiZoomOut className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {Math.round(imageZoom * 100)}%
                  </span>
                  <button
                    onClick={() => setImageZoom(Math.min(3, imageZoom + 0.25))}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <FiZoomIn className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 h-full overflow-auto">
              {currentPage.imageUrl ? (
                <div className="flex justify-center">
                  <img
                    src={currentPage.imageUrl}
                    alt={`Page ${currentPageIndex + 1}`}
                    style={{ transform: `scale(${imageZoom})` }}
                    className="max-w-full h-auto border border-gray-300 dark:border-gray-600 rounded"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-700 rounded">
                  <p className="text-gray-500 dark:text-gray-400">No image available</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Extracted Text */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Extracted Text
                </h2>
                <div className="flex items-center space-x-2">
                  {hasChanges && (
                    <span className="text-sm text-orange-600 dark:text-orange-400">
                      Unsaved changes
                    </span>
                  )}
                  {currentPage.validated && (
                    <span className="flex items-center space-x-1 text-sm text-green-600 dark:text-green-400">
                      <FiCheck className="h-4 w-4" />
                      <span>Validated</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 h-full flex justify-center">
              <div className="w-full max-w-2xl">
                <textarea
                  value={extractedText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  className="w-full h-[600px] resize-none border border-gray-300 dark:border-gray-600 rounded-lg p-4 text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg"
                  style={{ minHeight: '600px', aspectRatio: '210/297' }}
                  placeholder="Extracted text will appear here..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Page Navigation */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={prevPage}
              disabled={currentPageIndex === 0}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous Page
            </button>
            
            <div className="flex items-center space-x-2">
              {pages.map((page, index) => (
                <button
                  key={index}
                  onClick={() => goToPage(index)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium ${
                    index === currentPageIndex
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  } ${page.validated ? 'ring-2 ring-green-500' : ''}`}
                >
                  {index + 1}
                  {page.validated && (
                    <FiCheck className="h-3 w-3 absolute -top-1 -right-1 text-green-500" />
                  )}
                </button>
              ))}
            </div>
            
            <button
              onClick={nextPage}
              disabled={currentPageIndex === pages.length - 1}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationPage;