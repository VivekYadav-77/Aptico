const backendTarget = process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_PROXY_TARGET || 'http://localhost:5000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendTarget}/api/:path*` },
      { source: '/admin/graphql', destination: `${backendTarget}/admin/graphql` },
      { source: '/ping', destination: `${backendTarget}/ping` }
    ];
  }
};

export default nextConfig;
