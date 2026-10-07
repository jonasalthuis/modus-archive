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
    // Baseline security headers. (No strict CSP yet — Firebase Auth popups, reCAPTCHA
    // and three.js make a correct CSP a separate piece of work.)
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "X-Frame-Options", value: "DENY" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
                    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
                ],
            },
        ];
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
