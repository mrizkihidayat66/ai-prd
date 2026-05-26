import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['mermaid'],
  devIndicators: { position: 'bottom-right' },
};

export default nextConfig;
