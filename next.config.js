/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No basePath or assetPrefix needed for an API-only Vercel deployment
  // No output: 'export' as this will run as serverless functions
};

module.exports = nextConfig;
