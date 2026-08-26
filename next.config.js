/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "mammoth", "@react-pdf/renderer"],
    outputFileTracingIncludes: {
      "/api/candidatos/[id]/pdf": ["./node_modules/pdfkit/**/*", "./node_modules/@react-pdf/**/*"],
      "/api/vagas/[id]/pdf": ["./node_modules/pdfkit/**/*", "./node_modules/@react-pdf/**/*"],
    },
  },
};

module.exports = nextConfig;
