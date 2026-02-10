/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Playwright must not be bundled by webpack; it needs native binaries at runtime
    serverComponentsExternalPackages: ["playwright"],
  },
};

export default nextConfig;
