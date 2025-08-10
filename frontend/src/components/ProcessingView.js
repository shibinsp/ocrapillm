import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { FiFile, FiEye, FiType, FiGrid, FiCheck } from 'react-icons/fi';

const ProcessingView = () => {
  const { state } = useApp();
  const { isUploading, uploadProgress, isProcessing, processingStatus, processingProgress } = state;
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Animate progress bar
  useEffect(() => {
    const targetProgress = isUploading ? uploadProgress : processingProgress;
    const timer = setTimeout(() => {
      setAnimatedProgress(targetProgress);
    }, 100);
    return () => clearTimeout(timer);
  }, [uploadProgress, processingProgress, isUploading]);

  const getProcessingSteps = () => {
    const steps = [
      {
        id: 'upload',
        title: 'Uploading Document',
        description: 'Transferring your PDF file to our servers',
        icon: FiFile,
        completed: !isUploading,
        active: isUploading
      },
      {
        id: 'convert',
        title: 'Converting PDF',
        description: 'Converting PDF pages to high-resolution images',
        icon: FiEye,
        completed: processingProgress > 20,
        active: isProcessing && processingProgress <= 20
      },
      {
        id: 'detect',
        title: 'Analyzing Content',
        description: 'Detecting text, tables, and diagrams on each page',
        icon: FiGrid,
        completed: processingProgress > 60,
        active: isProcessing && processingProgress > 20 && processingProgress <= 60
      },
      {
        id: 'extract',
        title: 'Extracting Text',
        description: 'Using AI-powered OCR to extract all text content',
        icon: FiType,
        completed: processingProgress > 90,
        active: isProcessing && processingProgress > 60 && processingProgress <= 90
      },
      {
        id: 'complete',
        title: 'Finalizing',
        description: 'Preparing your document for review and editing',
        icon: FiCheck,
        completed: processingProgress === 100,
        active: isProcessing && processingProgress > 90
      }
    ];

    return steps;
  };

  const steps = getProcessingSteps();
  const currentStep = steps.find(step => step.active) || steps[0];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-4">
          {isUploading ? 'Uploading Document' : 'Processing Document'}
        </h1>
        <p className="text-lg text-secondary-600 dark:text-secondary-400">
          Please wait while we process your document. This may take a few minutes.
        </p>
      </div>

      {/* Main Processing Card */}
      <div className="card p-8 mb-8">
        {/* Current Step Display */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            {React.createElement(currentStep.icon, {
              className: "w-10 h-10 text-primary-600 dark:text-primary-400"
            })}
          </div>
          
          <h2 className="text-2xl font-semibold text-secondary-900 dark:text-white mb-2">
            {currentStep.title}
          </h2>
          
          <p className="text-secondary-600 dark:text-secondary-400 mb-6">
            {processingStatus || currentStep.description}
          </p>
          
          {/* Progress Bar */}
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm text-secondary-600 dark:text-secondary-400 mb-2">
              <span>Progress</span>
              <span>{Math.round(animatedProgress)}%</span>
            </div>
            
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${animatedProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Processing Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`flex items-center space-x-4 p-4 rounded-lg transition-all duration-300 ${
                  step.completed
                    ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800'
                    : step.active
                    ? 'bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800'
                    : 'bg-secondary-50 dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700'
                }`}
              >
                {/* Step Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.completed
                    ? 'bg-green-100 dark:bg-green-900/20'
                    : step.active
                    ? 'bg-primary-100 dark:bg-primary-900/20'
                    : 'bg-secondary-200 dark:bg-secondary-700'
                }`}>
                  {step.completed ? (
                    <FiCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : step.active ? (
                    <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Icon className={`w-5 h-5 ${
                      step.completed
                        ? 'text-green-600 dark:text-green-400'
                        : step.active
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-secondary-400 dark:text-secondary-500'
                    }`} />
                  )}
                </div>
                
                {/* Step Content */}
                <div className="flex-1">
                  <h3 className={`font-medium ${
                    step.completed
                      ? 'text-green-900 dark:text-green-100'
                      : step.active
                      ? 'text-primary-900 dark:text-primary-100'
                      : 'text-secondary-600 dark:text-secondary-400'
                  }`}>
                    {step.title}
                  </h3>
                  
                  <p className={`text-sm ${
                    step.completed
                      ? 'text-green-700 dark:text-green-300'
                      : step.active
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-secondary-500 dark:text-secondary-500'
                  }`}>
                    {step.description}
                  </p>
                </div>
                
                {/* Step Number */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  step.completed
                    ? 'bg-green-600 text-white'
                    : step.active
                    ? 'bg-primary-600 text-white'
                    : 'bg-secondary-300 dark:bg-secondary-600 text-secondary-600 dark:text-secondary-400'
                }`}>
                  {index + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips Card */}
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