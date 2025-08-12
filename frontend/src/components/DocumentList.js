import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiService, formatFileSize } from '../services/api';
import { FiFile, FiTrash2, FiDownload, FiEye, FiSearch, FiFilter, FiCalendar, FiCheck, FiClock, FiAlertCircle, FiEdit3, FiX } from 'react-icons/fi';

const DocumentList = () => {
  const { state, actions } = useApp();
  const { documents, currentDocument } = state;
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date'); // date, name, size, status
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [filterStatus, setFilterStatus] = useState('all'); // all, completed, processing, error
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Filter and sort documents
  const filteredAndSortedDocuments = React.useMemo(() => {
    let filtered = documents.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'size':
          aValue = a.size || 0;
          bValue = b.size || 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'date':
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [documents, searchTerm, sortBy, sortOrder, filterStatus]);

  const handleDocumentSelect = (document) => {
    actions.setCurrentDocument(document);
    actions.setActiveTab('editor');
    // Load document content
    loadDocumentContent(document.id);
  };

  const loadDocumentContent = async (documentId) => {
    try {
      const content = await apiService.getDocumentContent(documentId);
      actions.setExtractedText(content.text);
    } catch (error) {
      console.error('Failed to load document content:', error);
      actions.showError('Failed to load document content');
    }
  };

  const handleDeleteSelected = async () => {
    try {
      for (const docId of selectedDocuments) {
        await apiService.deleteDocument(docId);
        actions.deleteDocument(docId);
      }
      
      setSelectedDocuments([]);
      setShowDeleteConfirm(false);
      actions.showSuccess(`${selectedDocuments.length} document(s) deleted successfully`);
    } catch (error) {
      actions.showError('Failed to delete documents');
    }
  };

  const handleExportDocument = async (doc, format = 'txt') => {
    try {
      const blob = await apiService.exportDocument(doc.id, format);
      const filename = `${doc.name.replace('.pdf', '')}.${format}`;
      
      // Use the downloadFile utility from api service
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      actions.showSuccess(`Document exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      actions.showError(`Failed to export document: ${error.message || 'Unknown error'}`);
    }
  };

  const toggleDocumentSelection = (docId) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const selectAllDocuments = () => {
    if (selectedDocuments.length === filteredAndSortedDocuments.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(filteredAndSortedDocuments.map(doc => doc.id));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FiCheck className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />;
      case 'error':
        return <FiAlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FiClock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      error: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
          Document Library
        </h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Manage your processed documents, view history, and access previous OCR results.
        </p>
      </div>

      {/* Controls */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full sm:w-64"
              />
            </div>
            
            {/* Status Filter */}
            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-8 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="error">Error</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
          
          {/* Sort and Actions */}
          <div className="flex items-center space-x-4">
            {/* Sort */}
            <div className="flex items-center space-x-2">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="size-desc">Largest First</option>
                <option value="size-asc">Smallest First</option>
              </select>
            </div>
            
            {/* Bulk Actions */}
            {selectedDocuments.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-secondary-600 dark:text-secondary-400">
                  {selectedDocuments.length} selected
                </span>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn-danger px-3 py-1 text-sm"
                >
                  Delete Selected
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Grid/List */}
      {filteredAndSortedDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FiFile className="w-16 h-16 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
            {searchTerm || filterStatus !== 'all' ? 'No documents found' : 'No documents yet'}
          </h3>
          <p className="text-secondary-600 dark:text-secondary-400 mb-4">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Upload your first PDF document to get started'
            }
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <button
              onClick={() => actions.setActiveTab('upload')}
              className="btn-primary"
            >
              Upload Document
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Select All */}
          <div className="flex items-center space-x-3 px-4">
            <input
              type="checkbox"
              checked={selectedDocuments.length === filteredAndSortedDocuments.length}
              onChange={selectAllDocuments}
              className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              Select all ({filteredAndSortedDocuments.length} documents)
            </span>
          </div>
          
          {/* Document Cards */}
          <div className="grid gap-4">
            {filteredAndSortedDocuments.map((document) => (
              <div
                key={document.id}
                className={`card p-4 transition-all duration-200 hover:shadow-md ${
                  currentDocument?.id === document.id
                    ? 'ring-2 ring-primary-500 border-primary-200 dark:border-primary-800'
                    : selectedDocuments.includes(document.id)
                    ? 'ring-2 ring-secondary-300 dark:ring-secondary-600'
                    : ''
                }`}
              >
                <div className="flex items-center space-x-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedDocuments.includes(document.id)}
                    onChange={() => toggleDocumentSelection(document.id)}
                    className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                  />
                  
                  {/* Document Icon */}
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FiFile className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  
                  {/* Document Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="text-lg font-medium text-secondary-900 dark:text-white truncate">
                        {document.name}
                      </h3>
                      {getStatusBadge(document.status)}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-secondary-500 dark:text-secondary-400">
                      <span className="flex items-center space-x-1">
                        <FiCalendar className="w-4 h-4" />
                        <span>{formatDate(document.created_at)}</span>
                      </span>
                      
                      {document.size && (
                        <span>{formatFileSize(document.size)}</span>
                      )}
                      
                      {document.pages && (
                        <span>{document.pages} pages</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {getStatusIcon(document.status)}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDocumentSelect(document)}
                      className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                      title="View document"
                    >
                      <FiEye className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
                    </button>
                    
                    {document.status === 'completed' && (
                      <button
                        onClick={() => actions.startValidation(document.id)}
                        className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
                        title="Validate document"
                      >
                        <FiEdit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                    )}
                    
                    <div className="relative group">
                      <button className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
                        <FiDownload className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
                      </button>
                      
                      {/* Export Dropdown */}
                      <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                        <button
                          onClick={() => handleExportDocument(document, 'txt')}
                          className="w-full text-left px-3 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 first:rounded-t-lg"
                        >
                          Export as TXT
                        </button>
                        <button
                          onClick={() => handleExportDocument(document, 'docx')}
                          className="w-full text-left px-3 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 last:rounded-b-lg"
                        >
                          Export as DOCX
                        </button>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedDocuments([document.id]);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete document"
                    >
                      <FiTrash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
              Confirm Deletion
            </h3>
            <p className="text-secondary-600 dark:text-secondary-400 mb-6">
              Are you sure you want to delete {selectedDocuments.length} document(s)? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleDeleteSelected}
                className="btn-danger flex-1"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedDocuments([]);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentList;