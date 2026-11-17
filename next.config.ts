import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
    ]},{source:'/',headers:[{key:'Cache-Control',value:'private, no-store'}]},{source:'/v2',headers:[{key:'Cache-Control',value:'private, no-store'}]}];
  }
};
export default nextConfig;
