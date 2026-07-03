import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: 'standalone',
    // Three.js/R3F creates WebGL contexts in effects; Strict Mode's double-invoke
    // tears them down and recreates them in a tight loop in dev, causing context loss.
    reactStrictMode: false,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
            },
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
        ],
    },
    // Allow importing Markdown files as raw strings (used by the in-app Knowledge Center)
    webpack: (config) => {
        config.module.rules.push({
            test: /\.md$/,
            type: 'asset/source',
        });
        return config;
    },
};

export default nextConfig;
