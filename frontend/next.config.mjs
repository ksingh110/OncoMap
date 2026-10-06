import { fileURLToPath } from "node:url"

/** @type {import('next').NextConfig} */
const api = process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL) : null
if (api && (api.username || api.password || api.search || api.hash || api.pathname !== '/' ||
    (api.protocol !== 'https:' && !(api.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname))))) {
  throw new Error('NEXT_PUBLIC_API_URL must be an HTTPS origin (HTTP only on localhost)')
}
const policy = [
  "default-src 'self'",
  // Next.js hydration and Plotly require inline scripts/styles. No third-party script origins.
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${api ? ` ${api.origin}` : ''}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ')

const nextConfig = {
  turbopack: { root: fileURLToPath(new URL("..", import.meta.url)) },
  outputFileTracingRoot: fileURLToPath(new URL("..", import.meta.url)),
  poweredByHeader: false,
  images: { unoptimized: true },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'Content-Security-Policy', value: policy },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }, { source: '/model', headers: [
      { key: 'Cache-Control', value: 'no-store, max-age=0' },
    ] }, { source: '/sw.js', headers: [
      { key: 'Cache-Control', value: 'no-store, max-age=0' },
    ] }]
  },
}
export default nextConfig
