const backendTarget = process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_PROXY_TARGET || 'http://localhost:5001';
const isDevelopment = process.env.NODE_ENV !== 'production';
const connectSources = [
  "'self'",
  backendTarget,
  'http://localhost:5000',
  'http://localhost:5001',
  'https://accounts.google.com',
  'https://oauth2.googleapis.com'
];
const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  isDevelopment ? "'unsafe-eval'" : '',
  'https://accounts.google.com'
].filter(Boolean);

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src ${scriptSources.join(' ')}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      `connect-src ${connectSources.join(' ')}`,
      "frame-src 'self' https://accounts.google.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders
      }
    ];
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendTarget}/api/:path*` },
      { source: '/admin/graphql', destination: `${backendTarget}/admin/graphql` },
      { source: '/ping', destination: `${backendTarget}/ping` }
    ];
  }
};

export default nextConfig;
