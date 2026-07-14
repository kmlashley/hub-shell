/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow longer serverless function timeouts for AI agent routes
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  // The Post Scorer reads docs/Michele_Lashley_Voice_DNA.md from disk at
  // request time (see lib/voice-dna.ts). Next.js file tracing doesn't detect
  // fs reads, so without this the file gets dropped from the Vercel
  // serverless bundle and the route fails at runtime in production.
  outputFileTracingIncludes: {
    "/api/content/post-scorer/**/*": ["./docs/Michele_Lashley_Voice_DNA.md"],
  },
};

module.exports = nextConfig;
