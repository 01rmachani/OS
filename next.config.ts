import type { NextConfig } from 'next'

// BASE_PATH is read at build time and baked into the bundle.
// Local dev: leave BASE_PATH unset → no sub-path, app at /
// Docker/K8s: pass --build-arg BASE_PATH=/chat-app → app at /chat-app
const basePath = process.env.BASE_PATH ?? ''

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath,
  // Expose basePath to client components so useChat can construct the correct
  // API URL without relying on implicit Next.js basePath injection in fetch.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
}

export default nextConfig
