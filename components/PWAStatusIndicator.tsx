import React from 'react';

interface PWAStatusIndicatorProps {
  isOffline: boolean;
  updateAvailable: boolean;
  onUpdate: () => void;
}

export const PWAStatusIndicator: React.FC<PWAStatusIndicatorProps> = ({
  isOffline,
  updateAvailable,
  onUpdate
}) => {
  if (!isOffline && !updateAvailable) return null;

  return (
    <div className="fixed top-4 left-4 z-40 max-w-xs">
      {/* Offline Indicator */}
      {isOffline && (
        <div className="glass-status-warning p-3 rounded-lg mb-2 border border-yellow-400/30 shadow-lg">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
              <span className="text-sm animate-pulse">📴</span>
            </div>
            <div>
              <p className="text-yellow-300 font-medium text-sm">You're offline</p>
              <p className="text-yellow-200 text-xs opacity-90">
                Basic features still work
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Update Available Indicator */}
      {updateAvailable && (
        <div className="glass-status-success p-3 rounded-lg border border-green-400/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-sm animate-bounce">🔄</span>
              </div>
              <div className="flex-1">
                <p className="text-green-300 font-medium text-sm">Update ready!</p>
                <p className="text-green-200 text-xs opacity-90">
                  New features available
                </p>
              </div>
            </div>
            <button
              onClick={onUpdate}
              className="ml-2 glass-button px-3 py-1 rounded-lg text-xs font-medium border border-green-400/50 hover:bg-green-500/20 transition-colors flex-shrink-0"
            >
              Update
            </button>
          </div>
        </div>
      )}
    </div>
  );
};