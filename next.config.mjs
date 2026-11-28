/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["mongoose", "pdf-lib"],
  turbopack: { root: process.cwd() },
  images: {
    minimumCacheTTL: 604800,
  },
  async headers() {
    return [
      {
        // Legacy .jfif files are JPEG data; serve them with the right MIME type.
        source: "/:path*.jfif",
        headers: [{ key: "Content-Type", value: "image/jpeg" }],
      },
    ];
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
