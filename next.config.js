/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow longer serverless function timeouts for AI agent routes
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

module.exports = nextConfig;
