/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    allowedDevOrigins: ["http://10.10.50.93:3002"],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
  