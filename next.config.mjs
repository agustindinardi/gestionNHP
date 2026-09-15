/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // images.unoptimized se quitó: con la optimización activada, next/image
  // redimensiona y sirve en WebP según el width/height declarado. El logo
  // (640x640, 551 KB) se mostraba crudo a 40/80 px en cada página; ahora Next
  // genera variantes chicas (unos pocos KB) automáticamente.
}

export default nextConfig
