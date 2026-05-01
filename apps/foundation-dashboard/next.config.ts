import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "swarppay-images-prod.s3.us-east-2.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "swarpfoundation.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
