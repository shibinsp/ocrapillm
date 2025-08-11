import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function for retry logic
const retryRequest = async (requestFn, retries = MAX_RETRIES) => {
  try {
    return await requestFn();
  } catch (error) {
    if (retries > 0 && (error.code === 'ECONNABORTED' || error.message.includes('ERR_ABORTED') || !error.response)) {
      console.log(`Retrying request... ${MAX_RETRIES - retries + 1}/${MAX_RETRIES}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return retryRequest(requestFn, retries - 1);
    }
    throw error;
  }
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    
    // Handle common errors
    if (error.response?.status === 404) {
      throw new Error('Resource not found');
    } else if (error.response?.status === 500) {
      throw new Error('Server error occurred');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - please try again');
    } else if (!error.response) {
      throw new Error('Network error - please check your connection');
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const apiService = {
  // Document upload and processing
  uploadDocument: async (file, onProgress) => {
    return await retryRequest(async () => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes for file uploads
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });
      
      return response.data;
    });
  },
  
  // Get task processing status
  getTaskStatus: async (taskId) => {
    return await retryRequest(async () => {
      const response = await api.get(`/task-status/${taskId}`);
      return response.data;
    });
  },

  // Poll task status until completion
  pollTaskStatus: async (taskId, onProgress) => {
    const pollInterval = 2000; // 2 seconds
    const maxAttempts = 150; // 5 minutes max (150 * 2s)
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          attempts++;
          const status = await apiService.getTaskStatus(taskId);
          
          if (onProgress) {
            onProgress(status);
          }

          if (status.status === 'completed') {
            resolve(status.result);
          } else if (status.status === 'failed') {
            reject(new Error(status.error || 'Task failed'));
          } else if (attempts >= maxAttempts) {
            reject(new Error('Task timeout - processing took too long'));
          } else {
            // Continue polling
            setTimeout(poll, pollInterval);
          }
        } catch (error) {
          reject(error);
        }
      };
      
      poll();
    });
  },
  
  // Get processed document content
  getDocumentContent: async (documentId) => {
    const response = await api.get(`/documents/${documentId}/content`);
    return response.data;
  },
  
  // Validate/update document text
  validateDocument: async (documentId, text) => {
    const response = await api.post(`/validate/${documentId}`, {
      validated_text: text,
    });
    return response.data;
  },
  
  // Get all documents
  getDocuments: async () => {
    try {
      return await retryRequest(async () => {
        const response = await api.get('/documents/');
        return response.data;
      });
    } catch (error) {
      console.warn('Failed to fetch documents from backend, using fallback data:', error.message);
      // Return fallback data when backend is not available
      return [
        {
          id: 'fallback-doc-1',
          name: 'Sample Document.pdf',
          filename: 'sample.pdf',
          size: 1024000,
          status: 'completed',
          pages: 3,
          created_at: new Date().toISOString()
        }
      ];
    }
  },
  
  // Delete document
  deleteDocument: async (documentId) => {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
  },
  
  // Chat with AI about document
  chatWithDocument: async (documentId, message, chatHistory = []) => {
    const response = await api.post(`/chat/${documentId}`, {
      message,
      chat_history: chatHistory,
    });
    return response.data;
  },
  
  // Get chat history for document
  getChatHistory: async (documentId) => {
    const response = await api.get(`/documents/${documentId}/chat`);
    return response.data;
  },

  // Chat with AI about all documents
  chatWithAllDocuments: async (message, chatHistory = []) => {
    const response = await api.post('/chat/all', {
      message,
      chat_history: chatHistory,
    });
    return response.data;
  },

  // Get document pages with images for validation
  getDocumentPages: async (documentId) => {
    const response = await api.get(`/documents/${documentId}/pages`);
    return response.data;
  },

  // Validate a specific page
  validatePage: async (documentId, pageId, validatedText) => {
    const response = await api.post(`/documents/${documentId}/pages/${pageId}/validate`, {
      validated_text: validatedText
    });
    return response.data;
  },
  
  // Export document
  exportDocument: async (documentId, format = 'txt') => {
    const response = await api.get(`/documents/${documentId}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },
  
  // Search within document
  searchDocument: async (documentId, query) => {
    const response = await api.post(`/documents/${documentId}/search`, {
      query,
    });
    return response.data;
  },
  
  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

// Utility functions
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const validateFile = (file) => {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = ['application/pdf'];
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only PDF files are allowed');
  }
  
  if (file.size > maxSize) {
    throw new Error('File size must be less than 50MB');
  }
  
  return true;
};

export default api;