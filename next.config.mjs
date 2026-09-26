/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Default is 1 MB; auction Excel files can be larger (Faz 3 upload).
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
