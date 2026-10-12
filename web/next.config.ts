import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents desactivado: las rutas /api usan runtime/maxDuration (config de segmento)
  // y necesitan ser dinámicas en cada petición.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
