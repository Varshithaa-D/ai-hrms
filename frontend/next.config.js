/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['10.99.67.169', '192.168.43.253'],
  devIndicators: false, // This completely hides the bottom-left 'N'
};

module.exports = nextConfig;