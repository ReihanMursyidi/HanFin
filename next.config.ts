import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.172.106.111"],
  devIndicators: {
    position: "bottom-right",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui",
      "date-fns",
      "shadcn",
      "sonner",
      "zod",
    ],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
