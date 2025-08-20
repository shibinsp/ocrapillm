import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { FiSend, FiTrash2, FiUser, FiMessageCircle, FiCopy, FiRefreshCw } from 'react-icons/fi';

const ChatInterface = ({ isPanel = false }) => {
  const { state, actions } = useApp();
  const { currentDocument, chatMessages, isChatLoading } = state;
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Load general chat history on component mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Save chat history to localStorage whenever chatMessages change
  useEffect(() => {
    if (chatMessages.length > 0) {
      localStorage.setItem('globalChatHistory', JSON.stringify(chatMessages));
    }
  }, [chatMessages]);

  const loadChatHistory = async () => {
    try {
      // Load chat history from localStorage for persistence across page navigation
      const savedChatHistory = localStorage.getItem('globalChatHistory');
      if (savedChatHistory) {
        const parsedHistory = JSON.parse(savedChatHistory);
        actions.setChatMessages(parsedHistory);
      } else {
        // Start with empty chat for new sessions
        actions.setChatMessages([]);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      // Fallback to empty chat if there's an error
      actions.setChatMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isChatLoading) return;
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString()
    };
    
    // Add user message
    actions.addChatMessage(userMessage);
    setMessage('');
    actions.setChatLoading(true);
    setIsTyping(true);
    
    try {
      // Call the global chat API that searches across all documents
      const response = await apiService.chatWithAllDocuments(
        userMessage.content,
        chatMessages
      );
      
      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.response || generateMockResponse(userMessage.content),
        timestamp: new Date().toISOString()
      };
      
      actions.addChatMessage(aiResponse);
      
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      actions.addChatMessage(errorMessage);
      actions.showError('Failed to get AI response');
    } finally {
      actions.setChatLoading(false);
      setIsTyping(false);
    }
  };

  const generateMockResponse = (userMessage) => {
    const responses = {
      'summary': 'I can provide summaries of all your uploaded documents. Your document library contains various types of files including lease agreements, contracts, and other important documents. Each has been processed and is available for analysis.',
      'documents': 'You have several documents in your library that I can help you analyze. I can search across all of them to find specific information, compare content, or provide summaries of individual documents.',
      'search': 'I can search across all your uploaded documents to find specific information. Just tell me what you\'re looking for and I\'ll scan through all your files to find relevant content.',
      'compare': 'I can compare information across multiple documents in your library. This is useful for finding differences in terms, dates, amounts, or other details between similar documents.',
      'default': 'I can help you with questions about all your uploaded documents. I can search across your entire document library, provide summaries, compare information between documents, or help you find specific details. What would you like to know?'
    };
    
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('summary') || lowerMessage.includes('summarize')) {
      return responses.summary;
    } else if (lowerMessage.includes('key') || lowerMessage.includes('main') || lowerMessage.includes('important')) {
      return responses['key points'];
    } else if (lowerMessage.includes('rent') || lowerMessage.includes('payment') || lowerMessage.includes('money')) {
      return responses.rent;
    } else {
      return responses.default;
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const copyMessage = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      actions.showSuccess('Message copied to clipboard');
    } catch (error) {
      actions.showError('Failed to copy message');
    }
  };

  const clearChat = () => {
    actions.clearChat();
    // Also clear from localStorage
    localStorage.removeItem('globalChatHistory');
    actions.showInfo('Chat history cleared');
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Chat is now always available - can chat with all documents or specific document

  return (
    <div className={`h-full flex flex-col ${isPanel ? 'border-l border-secondary-200 dark:border-secondary-700' : ''}`}>
      {/* Header */}
      <div className="p-4 border-b border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white flex items-center">
              <FiMessageCircle className="w-5 h-5 mr-2 text-primary-600" />
              AI Assistant
            </h2>
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              Ask questions about all your documents
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={clearChat}
              className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
              title="Clear chat history"
            >
              <FiTrash2 className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary-50 dark:bg-secondary-900">
        {chatMessages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiMessageCircle className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-2">
              Start a conversation
            </h3>
            <p className="text-secondary-600 dark:text-secondary-400 text-sm mb-4">
              Ask me anything about your documents. I can help with:
            </p>
            
            <div className="grid gap-2 max-w-sm mx-auto">
              {[
                'Show me all my documents',
                'Search across all files',
                'Compare documents',
                'Summarize my library'
              ].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setMessage(suggestion)}
                  className="text-left p-3 bg-white dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors text-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-3 max-w-[80%] ${msg.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.type === 'user'
                    ? 'bg-primary-600'
                    : msg.isError
                    ? 'bg-red-100 dark:bg-red-900/20'
                    : 'bg-secondary-200 dark:bg-secondary-700'
                }`}>
                  {msg.type === 'user' ? (
                    <FiUser className="w-4 h-4 text-white" />
                  ) : (
                    <FiMessageCircle className={`w-4 h-4 ${
                      msg.isError
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-secondary-600 dark:text-secondary-400'
                    }`} />
                  )}
                </div>
                
                {/* Message */}
                <div className={`group relative ${
                  msg.type === 'user'
                    ? 'bg-primary-600 text-white'
                    : msg.isError
                    ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800'
                    : 'bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700'
                } rounded-lg px-4 py-3 shadow-sm`}>
                  <div className={`text-sm leading-relaxed ${
                    msg.type === 'user'
                      ? 'text-white'
                      : msg.isError
                      ? 'text-red-900 dark:text-red-100'
                      : 'text-secondary-900 dark:text-white'
                  }`}>
                    {msg.content}
                  </div>
                  
                  <div className={`flex items-center justify-between mt-2 text-xs ${
                    msg.type === 'user'
                      ? 'text-primary-100'
                      : 'text-secondary-500 dark:text-secondary-400'
                  }`}>
                    <span>{formatTimestamp(msg.timestamp)}</span>
                    
                    <button
                      onClick={() => copyMessage(msg.content)}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/10 ${
                        msg.type === 'user' ? 'text-white' : 'text-secondary-600 dark:text-secondary-400'
                      }`}
                      title="Copy message"
                    >
                      <FiCopy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-secondary-200 dark:bg-secondary-700 flex items-center justify-center flex-shrink-0">
                <FiMessageCircle className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
              </div>
              
              <div className="bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg px-4 py-3 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="p-4 border-t border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about this document..."
              className="w-full px-4 py-3 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={1}
              style={{
                minHeight: '44px',
                maxHeight: '120px',
                height: 'auto'
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isChatLoading}
            className="btn-primary p-3 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send message (Enter)"
          >
            {isChatLoading ? (
              <FiRefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <FiSend className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-secondary-500 dark:text-secondary-400">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>{message.length}/1000</span>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;