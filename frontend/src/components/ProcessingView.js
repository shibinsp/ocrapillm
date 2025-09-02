import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { FiUpload, FiCpu, FiEye, FiFileText, FiCheck, FiAlertCircle, FiClock } from 'react-icons/fi';

const ProcessingView = () => {
  const { state } = useApp();
  const { uploadProgress, isUploading, processingProgress, processingStatus, isProcessing, taskId } = state;

  const getProgressSteps = () => {
    const steps = [
      { id: 'upload', label: 'Uploading File', icon: FiUpload, threshold: 0, range: [0, 5] },
      { id: 'database_save', label: 'Saving to Database', icon: FiCpu, threshold: 5, range: [5, 10] },
      { id: 'analysis', label: 'Analyzing Document', icon: FiEye, threshold: 10, range: [10, 25] },
      { id: 'separation', label: 'Separating Arc Diagrams', icon: FiCpu, threshold: 25, range: [25, 35] },
      { id: 'ocr_processing', label: 'OCR Text Extraction', icon: FiFileText, threshold: 35, range: [35, 65] },
      { id: 'vision_processing', label: 'Processing Diagrams', icon: FiEye, threshold: 65, range: [65, 85] },
      { id: 'combining', label: 'Combining Results', icon: FiCpu, threshold: 85, range: [85, 95] },
      { id: 'finalizing', label: 'Finalizing Processing', icon: FiCheck, threshold: 95, range: [95, 100] }
    ];

    const currentProgress = isUploading ? uploadProgress : processingProgress;
    
    return steps.map(step => {
      const isActive = currentProgress >= step.threshold && currentProgress < (step.range[1] || 100);
      const isComplete = currentProgress >= step.range[1];
      
      return {
        ...step,
        status: isComplete ? 'complete' : (isActive ? 'active' : 'pending'),
        progress: isActive ? Math.min(100, ((currentProgress - step.threshold) / (step.range[1] - step.threshold)) * 100) : 0
      };
    });
  };

  const getCurrentStep = () => {
    const progress = isUploading ? uploadProgress : processingProgress;
    const steps = getProgressSteps();
    return steps.findIndex(step => step.status === 'active');
  };

  const formatTimeEstimate = (progress) => {
    if (progress === 0) return 'Calculating...';
    if (progress < 10) return '3-4 minutes remaining';
    if (progress < 25) return '2-3 minutes remaining';
    if (progress < 50) return '1-2 minutes remaining';
    if (progress < 75) return '30-60 seconds remaining';
    if (progress < 95) return 'Almost done...';
    if (progress >= 100) return 'Complete!';
    return 'Processing...';
  };

  const getStageMessage = () => {
    if (processingStatus) return processingStatus;
    
    const progress = isUploading ? uploadProgress : processingProgress;
    if (progress < 5) return 'Uploading document...';
    if (progress < 10) return 'Saving to database...';
    if (progress < 25) return 'Analyzing document structure...';
    if (progress < 35) return 'Separating arc diagrams...';
    if (progress < 65) return 'Extracting text from pages...';
    if (progress < 85) return 'Processing diagrams...';
    if (progress < 95) return 'Combining results...';
    if (progress < 100) return 'Finalizing processing...';
    return 'Processing complete!';
  };

  const steps = getProgressSteps();
  const currentStep = getCurrentStep();
  const currentProgress = isUploading ? uploadProgress : processingProgress;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">
          {isUploading ? 'Uploading Document' : 'Processing Document'}
        </h2>
        <p className="text-secondary-600 dark:text-secondary-400">
          {getStageMessage()}
        </p>
      </div>

      {/* Progress Card */}
      <div className="card p-6 mb-6">
        {/* Overall Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
              Overall Progress
            </span>
            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
              {Math.round(currentProgress)}%
            </span>
          </div>
          <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-secondary-500 dark:text-secondary-400 mt-1">
            <span>Started</span>
            <span>{formatTimeEstimate(currentProgress)}</span>
          </div>
        </div>

        {/* Step Progress */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCurrentStep = index === currentStep;
            return (
              <div key={step.id} className="flex items-center space-x-4">
                {/* Step Icon */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative
                  ${
                    step.status === 'complete' ? 'bg-green-100 dark:bg-green-900/20' :
                    step.status === 'active' ? 'bg-primary-100 dark:bg-primary-900/20' :
                    'bg-secondary-100 dark:bg-secondary-700'
                  }
                `}>
                  {step.status === 'complete' ? (
                    <FiCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : step.status === 'active' ? (
                    <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5 text-secondary-400" />
                  )}
                  
                  {/* Mini progress ring for active step */}
                  {step.status === 'active' && step.progress > 0 && (
                    <svg className="absolute inset-0 w-10 h-10 transform -rotate-90">
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="transparent"
                        className="text-secondary-200 dark:text-secondary-600"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 18}`}
                        strokeDashoffset={`${2 * Math.PI * 18 * (1 - step.progress / 100)}`}
                        className="text-primary-600 transition-all duration-300"
                      />
                    </svg>
                  )}
                </div>

                {/* Step Info */}
                <div className="flex-1">
                  <div className={`
                    font-medium transition-colors text-sm
                    ${
                      step.status === 'complete' ? 'text-green-600 dark:text-green-400' :
                      step.status === 'active' ? 'text-primary-600 dark:text-primary-400' :
                      'text-secondary-500 dark:text-secondary-400'
                    }
                  `}>
                    {step.label}
                  </div>
                  
                  {/* Progress details */}
                  {step.status === 'active' && (
                    <div className="text-xs text-secondary-600 dark:text-secondary-400 mt-1">
                      {step.progress > 0 ? `${Math.round(step.progress)}% complete` : 'Starting...'}
                    </div>
                  )}
                  {step.status === 'complete' && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ✓ Completed
                    </div>
                  )}
                  {step.status === 'pending' && (
                    <div className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                      Waiting...
                    </div>
                  )}
                </div>

                {/* Step Status */}
                <div className="text-right min-w-[60px]">
                  {step.status === 'complete' && (
                    <FiCheck className="w-5 h-5 text-green-600 dark:text-green-400 ml-auto" />
                  )}
                  {step.status === 'active' && (
                    <div className="flex items-center space-x-2">
                      <FiClock className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <span className="text-xs text-primary-600 dark:text-primary-400">
                        {step.range[0]}-{step.range[1]}%
                      </span>
                    </div>
                  )}
                  {step.status === 'pending' && (
                    <span className="text-xs text-secondary-400">
                      {step.range[0]}-{step.range[1]}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
          💡 Processing Tips
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <p className="text-secondary-900 dark:text-white font-medium mb-1">
                High-Quality OCR
              </p>
              <p className="text-secondary-600 dark:text-secondary-400">
                Our AI can extract text from complex layouts, handwriting, and low-quality scans.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <p className="text-secondary-900 dark:text-white font-medium mb-1">
                Table Recognition
              </p>
              <p className="text-secondary-600 dark:text-secondary-400">
                Tables are automatically detected and converted to editable format.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <p className="text-secondary-900 dark:text-white font-medium mb-1">
                Diagram Analysis
              </p>
              <p className="text-secondary-600 dark:text-secondary-400">
                Charts, diagrams, and images are preserved with extracted text annotations.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <p className="text-secondary-900 dark:text-white font-medium mb-1">
                AI Chat Ready
              </p>
              <p className="text-secondary-600 dark:text-secondary-400">
                Once processed, you can ask our AI questions about your document content.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Cancel Button */}
      <div className="text-center mt-6">
        <button
          onClick={() => {
            // Handle cancel - this would stop the processing
            window.location.reload();
          }}
          className="text-secondary-600 dark:text-secondary-400 hover:text-secondary-800 dark:hover:text-secondary-200 transition-colors"
        >
          Cancel Processing
        </button>
      </div>
    </div>
  );
};

export default ProcessingView;