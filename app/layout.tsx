import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BookfoldAR - Augmented Reality Book Folding Assistant',
  description: 'Professional AR-powered book folding assistant with camera overlay, voice control, and precise measurement tools',
  keywords: ['book folding', 'AR', 'augmented reality', 'crafts', 'DIY'],
  authors: [{ name: 'BookfoldAR Team' }],
  creator: 'BookfoldAR',
  publisher: 'BookfoldAR',
  formatDetection: {
    telephone: false,
  },
  themeColor: '#1e293b',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    userScalable: true,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BookfoldAR',
  },
  openGraph: {
    title: 'BookfoldAR - AR Book Folding Assistant',
    description: 'Professional AR-powered book folding assistant with camera overlay, voice control, and precise measurement tools',
    url: 'https://bookfoldar.com',
    siteName: 'BookfoldAR',
    images: [
      {
        url: '/icons/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BookfoldAR - AR Book Folding Assistant',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BookfoldAR - AR Book Folding Assistant',
    description: 'Professional AR-powered book folding assistant with camera overlay, voice control, and precise measurement tools',
    images: ['/icons/twitter-image.png'],
  },
  icons: {
    icon: [
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-gray-100 font-sans antialiased">
        {/* PWA Splash Screen */}
        <div id="splash-screen" className="splash-screen">
          <div className="splash-logo">📖</div>
          <div className="splash-title">BookfoldAR</div>
          <div className="splash-subtitle">AR Book Folding Assistant</div>
          <div className="splash-loading"></div>
        </div>
        
        {children}
        
        {/* PWA Scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Hide splash screen when app loads
              window.addEventListener('load', () => {
                setTimeout(() => {
                  const splash = document.getElementById('splash-screen');
                  if (splash) {
                    splash.classList.add('hidden');
                    setTimeout(() => {
                      splash.style.display = 'none';
                    }, 500);
                  }
                  document.body.classList.add('app-ready');
                }, 1000);
              });
              
              // Service Worker registration
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                      console.log('✅ SW: Registered successfully');
                    })
                    .catch((error) => {
                      console.log('❌ SW: Registration failed');
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}