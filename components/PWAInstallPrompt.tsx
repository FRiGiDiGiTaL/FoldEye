import React from 'react';

interface PWAInstallPromptProps {
  isVisible: boolean;
  onInstall: () => void;
  onDismiss: () => void;
  isInstalling?: boolean;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  isVisible,
  onInstall,
  onDismiss,
  isInstalling = false
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onDismiss}
      />
      
      {/* Install Prompt Card */}
      <div className="relative w-full max-w-md glass-card rounded-t-2xl md:rounded-2xl border-2 border-blue-500/50 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">📖</span>
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-xs">✨</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-2">
              Install BookfoldAR
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Get the full app experience! Install BookfoldAR for:
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center text-sm text-gray-200">
              <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-xs">📱</span>
              </div>
              <span>Quick access from your home screen</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-200">
              <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-xs">🎯</span>
              </div>
              <span>Full-screen AR camera experience</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-200">
              <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-xs">⚡</span>
              </div>
              <span>Faster loading and offline support</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-200">
              <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-xs">🔄</span>
              </div>
              <span>Automatic updates in the background</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={onInstall}
              disabled={isInstalling}
              className="w-full glass-button border-blue-400/50 hover:glass-status-success py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center"
            >
              {isInstalling ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full mr-2" />
                  Installing...
                </>
              ) : (
                <>
                  <span className="mr-2">📥</span>
                  Install BookfoldAR
                </>
              )}
            </button>
            
            <button
              onClick={onDismiss}
              className="w-full glass-panel px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors duration-200"
            >
              Maybe later
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 w-8 h-8 glass-button rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};