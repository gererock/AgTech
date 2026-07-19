import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/**
 * @param {string} phase
 * @returns {import('next').NextConfig}
 */
const createNextConfig = (phase) => ({
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate"
          },
          {
            key: "Service-Worker-Allowed",
            value: "/"
          }
        ]
      }
    ];
  }
});

export default createNextConfig;
