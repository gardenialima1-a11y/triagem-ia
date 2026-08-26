/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "mammoth", "@react-pdf/renderer"],
  },
};

module.exports = nextConfig;
