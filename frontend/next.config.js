/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    allowedDevOrigins: ["http://10.10.50.93:3002"],
  },
};

module.exports = nextConfig;
  