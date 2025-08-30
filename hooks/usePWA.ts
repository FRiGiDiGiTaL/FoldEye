import { useState, useEffect, useCallback } from 'react';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  updateAvailable: boolean;
  installPromptEvent: any;
}

interface PWAActions {
  installApp: () => Promise<boolean>;
  updateApp: () => Promise<void>;
  dismissInstallPrompt: () => void;
}

export const usePWA = (): PWAState & PWAActions => {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOffline: !navigator.onLine,
    updateAvailable: false,
    installPromptEvent: null,
  });

  // Check if app is already installed
  const checkIfInstalled = useCallback(() => {
    // Check for various PWA indicators
    const isInstalled = 
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      // @ts-ignore - navigator.standalone is iOS specific
      navigator.standalone === true ||
      document.referrer.includes('android-app://');

    setState(prev => ({ ...prev, isInstalled }));
  }, []);

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('💾 PWA: Install prompt available');
      e.preventDefault();
      
      setState(prev => ({
        ...prev,
        isInstallable: true,
        installPromptEvent: e
      }));
    };

    const handleAppInstalled = () => {
      console.log('✅ PWA: App was installed');
      setState(prev => ({
        ...prev,
        isInstallable: false,
        isInstalled: true,
        installPromptEvent: null
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 PWA: Back online');
      setState(prev => ({ ...prev, isOffline: false }));
    };

    const handleOffline = () => {
      console.log('📴 PWA: Gone offline');
      setState(prev => ({ ...prev, isOffline: true }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle service worker updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleServiceWorkerUpdate = (registration: ServiceWorkerRegistration) => {
        const waitingServiceWorker = registration.waiting;

        if (waitingServiceWorker) {
          console.log('🔄 PWA: Update available');
          setState(prev => ({ ...prev, updateAvailable: true }));

          waitingServiceWorker.addEventListener('statechange', () => {
            if (waitingServiceWorker.state === 'activated') {
              console.log('✅ PWA: Update activated');
              window.location.reload();
            }
          });
        }
      };

      navigator.serviceWorker.ready.then((registration) => {
        // Check for existing update
        handleServiceWorkerUpdate(registration);

        // Listen for future updates
        registration.addEventListener('updatefound', () => {
          handleServiceWorkerUpdate(registration);
        });
      });

      // Listen for controller change (new service worker activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 PWA: New service worker activated');
        window.location.reload();
      });
    }
  }, []);

  // Check installation status on mount
  useEffect(() => {
    checkIfInstalled();
  }, [checkIfInstalled]);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ PWA: Service Worker registered successfully');
          
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute
        })
        .catch((error) => {
          console.error('❌ PWA: Service Worker registration failed:', error);
        });
    }
  }, []);

  // Install the app
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!state.installPromptEvent) {
      console.warn('⚠️ PWA: No install prompt available');
      return false;
    }

    try {
      const result = await state.installPromptEvent.prompt();
      console.log('💾 PWA: Install prompt result:', result.outcome);

      if (result.outcome === 'accepted') {
        setState(prev => ({
          ...prev,
          isInstallable: false,
          installPromptEvent: null
        }));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ PWA: Install failed:', error);
      return false;
    }
  }, [state.installPromptEvent]);

  // Update the app
  const updateApp = useCallback(async (): Promise<void> => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const waitingServiceWorker = registration.waiting;

      if (waitingServiceWorker) {
        console.log('🔄 PWA: Updating app...');
        waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
        setState(prev => ({ ...prev, updateAvailable: false }));
      }
    }
  }, []);

  // Dismiss install prompt
  const dismissInstallPrompt = useCallback(() => {
    console.log('❌ PWA: Install prompt dismissed');
    setState(prev => ({
      ...prev,
      isInstallable: false,
      installPromptEvent: null
    }));
  }, []);

  // Handle URL parameters for shortcuts
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('camera') === 'true') {
      console.log('📷 PWA: Camera shortcut activated');
      // This would trigger camera activation
      // You can dispatch a custom event or use a callback prop
      window.dispatchEvent(new CustomEvent('pwa-camera-shortcut'));
    }
    
    if (urlParams.get('voice') === 'true') {
      console.log('🎤 PWA: Voice shortcut activated');
      // This would trigger voice control activation
      window.dispatchEvent(new CustomEvent('pwa-voice-shortcut'));
    }
  }, []);

  return {
    ...state,
    installApp,
    updateApp,
    dismissInstallPrompt,
  };
};