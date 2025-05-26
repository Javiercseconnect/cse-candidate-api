/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No basePath or assetPrefix needed for an API-only Vercel deployment
  // No output: 'export' as this will run as serverless functions

  // Add CORS headers for all API routes
  async headers() {
    return [
      {
        // Matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "https://cseconnect.ie" }, // Your frontend domain
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
