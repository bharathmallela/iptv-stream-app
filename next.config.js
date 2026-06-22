/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Allow fetching from iptv-org CDN
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ]
  },
}
module.exports = nextConfig
