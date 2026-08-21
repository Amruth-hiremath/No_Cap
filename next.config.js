/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  turbopack: {},
};

module.exports = nextConfig;
