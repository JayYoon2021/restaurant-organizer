/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: "standalone",
    async rewrites() {
        return [
            {
                source: '/api/analyze',
                destination: '/api/analyze.py',
            },
        ];
    },
};

export default nextConfig;
