import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useApp } from '../context/AppContext';
import { apiService, validateFile } from '../services/api';
import { FiUpload, FiFile, FiX, FiCheck } from 'react-icons/fi';

const UploadSection = () => {
  const { state, actions } = useApp();
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setDragActive(false);
    
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      let errorMessage = 'Invalid file';
      
      if (error.code === 'file-invalid-type') {
        errorMessage = '❌ Only PDF files are allowed. Please select a .pdf file.';
      } else if (error.code === 'file-too-large') {
        const maxSizeMB = (50 * 1024 * 1024) / (1024 * 1024);
        errorMessage = `❌ File size must be less than ${maxSizeMB}MB. Your file is too large.`;
      } else if (error.code === 'too-many-files') {
        errorMessage = '❌ Please select only one PDF file at a time.';
      } else {
        errorMessage = `❌ Invalid file: ${error.message}`;
      }
      
      actions.showError(errorMessage);
      return;
    }
    
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      try {
        validateFile(file);
        setSelectedFile(file);
        actions.showSuccess('✅ File selected successfully! Click "Process Document" to begin.');
      } catch (error) {
        actions.showError(`❌ ${error.message}`);
      }
    }
  }, [actions]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      actions.setUploading(true);
      actions.setUploadProgress(0);
      
      // Upload file
      const response = await apiService.uploadDocument(
        selectedFile,
        (progress) => actions.setUploadProgress(progress)
      );
      
      // Start processing
      actions.setProcessing({
        isProcessing: true,
        status: 'Starting OCR processing...',
        progress: 10
      });
      
      // Poll for task completion and get real extracted text
      const result = await apiService.pollTaskStatus(
        response.task_id,
        (status) => {
          // Update processing status based on real backend progress
          let progressPercent = status.progress || 0;
          let statusMessage = 'Processing document...';
          
          if (status.status === 'processing') {
            if (progressPercent < 25) {
              statusMessage = 'Analyzing document structure...';
            } else if (progressPercent < 50) {
              statusMessage = 'Separating diagrams...';
            } else if (progressPercent < 75) {
              statusMessage = 'Extracting text with OCR...';
            } else {
              statusMessage = 'Finalizing processing...';
            }
          } else if (status.status === 'completed') {
            progressPercent = 100;
            statusMessage = 'Processing complete!';
          }
          
          actions.setProcessing({
            isProcessing: status.status !== 'completed',
            status: statusMessage,
            progress: progressPercent
          });
        }
      );
      
      // Create document object with real extracted text
      const newDocument = {
        id: result.document_id,
        name: selectedFile.name,
        size: selectedFile.size,
        status: 'completed',
        created_at: new Date().toISOString(),
        pages: result.pages || 1,
        extracted_text: result.extracted_text || ''
      };
      
      // Add to documents and set as current
      actions.addDocument(newDocument);
      actions.setCurrentDocument(newDocument);
      actions.setExtractedText(newDocument.extracted_text);
      
      // Refresh documents list from backend to ensure consistency
      try {
        const documents = await apiService.getDocuments();
        actions.setDocuments(documents.data || documents);
      } catch (error) {
        console.warn('Failed to refresh documents list:', error);
      }
      
      // Reset states
      actions.setUploading(false);
      actions.setProcessing({ isProcessing: false, status: '', progress: 0 });
      actions.resetUploadState();
      
      // Clear selected file and switch to editor
      setSelectedFile(null);
      actions.setActiveTab('editor');
      actions.showSuccess('Document processed successfully!');
      
    } catch (error) {
      console.error('Upload error:', error);
      
      // Reset states
      actions.setUploading(false);
      actions.setProcessing({ isProcessing: false, status: '', progress: 0 });
      
      // Show more specific error messages
      let errorMessage = 'Failed to upload document';
      
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.detail || 
                      error.response.data?.message || 
                      `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error: Please check your connection and ensure the backend server is running on port 8000';
      } else {
        // Other error
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      actions.showError(errorMessage);
      
      // Clear selected file on error
      setSelectedFile(null);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-4">
          Upload PDF Document
        </h1>
        <p className="text-lg text-secondary-600 dark:text-secondary-400 max-w-2xl mx-auto">
          Upload your PDF document to extract text, analyze content, and chat with our AI assistant about your document.
        </p>
      </div>
      
      {/* Upload Area */}
      <div className="card p-8 mb-6">
        {!selectedFile ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer ${
              isDragActive || dragActive
                ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/10'
                : 'border-secondary-300 dark:border-secondary-600 hover:border-primary-400 hover:bg-secondary-50 dark:hover:bg-secondary-700/50'
            }`}
          >
            <input {...getInputProps()} />
            
            <div className="flex flex-col items-center space-y-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                isDragActive || dragActive
                  ? 'bg-primary-100 dark:bg-primary-900/20'
                  : 'bg-secondary-100 dark:bg-secondary-700'
              }`}>
                <FiUpload className={`w-8 h-8 ${
                  isDragActive || dragActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-secondary-600 dark:text-secondary-400'
                }`} />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-2">
                  {isDragActive ? 'Drop your PDF here' : 'Drag & drop your PDF here'}
                </h3>
                <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                  or click to browse files
                </p>
                
                <div className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
                  <FiFile className="w-4 h-4 mr-2" />
                  Choose PDF File
                </div>
              </div>
              
              <div className="text-sm text-secondary-500 dark:text-secondary-400">
                <p>Supported format: PDF</p>
                <p>Maximum file size: 50MB</p>
              </div>
            </div>
          </div>
        ) : (
          /* Selected File Display */
          <div className="border border-secondary-200 dark:border-secondary-600 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Selected File
              </h3>
              <button
                onClick={removeSelectedFile}
                className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                title="Remove file"
              >
                <FiX className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              </button>
            </div>
            
            <div className="flex items-center space-x-4 p-4 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <FiFile className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-secondary-900 dark:text-white truncate">
                  {selectedFile.name}
                </h4>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              
              <div className="flex items-center text-green-600 dark:text-green-400">
                <FiCheck className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Upload Button */}
      {selectedFile && (
        <div className="text-center">
          <button
            onClick={handleUpload}
            disabled={state.isUploading || state.isProcessing}
            className="btn-primary px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.isUploading || state.isProcessing ? (
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>
                  {state.isUploading ? 'Uploading...' : 'Processing...'}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <FiUpload className="w-5 h-5" />
                <span>Process Document</span>
              </div>
            )}
          </button>
          
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-3">
            This may take a few minutes depending on document size and complexity
          </p>
        </div>
      )}
      
      {/* Features */}
      <div className="mt-12 grid md:grid-cols-3 gap-6">
        <div className="text-center p-6">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
            Smart OCR
          </h3>
          <p className="text-secondary-600 dark:text-secondary-400">
            Advanced text extraction with table and diagram recognition
          </p>
        </div>
        
        <div className="text-center p-6">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
            Text Validation
          </h3>
          <p className="text-secondary-600 dark:text-secondary-400">
            Review and correct extracted text with our intuitive editor
          </p>
        </div>
        
        <div className="text-center p-6">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
            AI Assistant
          </h3>
          <p className="text-secondary-600 dark:text-secondary-400">
            Ask questions and get insights about your document content
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadSection;