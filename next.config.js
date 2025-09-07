/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true,
  },
  
  // Image optimization
  images: {
    domains: ['localhost'],
    // Add common domains you might use for images
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  // Webpack configuration for custom modules
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle Three.js and other large libraries
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    
    // Optimize for client-side only components (like your AR features)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },

  // Redirects to ensure proper routing
  async redirects() {
    return [
      // Redirect any common variations to the proper landing page
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/landing',
        destination: '/',
        permanent: true,
      },
      {
        source: '/trial',
        destination: '/',
        permanent: true,
      },
      // Redirect signup variations to landing
      {
        source: '/signup',
        destination: '/',
        permanent: true,
      },
      {
        source: '/register',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // Headers for PWA and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Add camera permissions header for better mobile support
          {
            key: 'Permissions-Policy',
            value: 'camera=*, microphone=*',
          },
        ],
      },
      // Special headers for the app route (AR features)
      {
        source: '/app',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },

  // Rewrites for API routes (if needed)
  async rewrites() {
    return [
      // Keep existing rewrites or add any needed for your API
    ];
  },

  // Configure build output for better performance
  output: 'standalone',
  
  // Optimize for production
  compress: true,
  
  // Configure trailing slash behavior
  trailingSlash: false,
  
  // Configure TypeScript and ESLint
  typescript: {
    // Skip type checking during build if needed (not recommended for production)
    ignoreBuildErrors: false,
  },
  
  eslint: {
    // Skip ESLint during build if needed (not recommended for production)
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;