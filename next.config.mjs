/** @type {import('next').NextConfig} */
const nextConfig = {
  // Playwright is only used for local scripts/tests, never in the Next.js app bundle
  serverExternalPackages: ["playwright"],
};

export default nextConfig;