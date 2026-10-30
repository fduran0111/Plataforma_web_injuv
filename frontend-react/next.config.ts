import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Next bloquea HMR cross-origin por defecto; permite abrir el dev server en 127.0.0.1. */
  allowedDevOrigins: ["127.0.0.1", "192.168.56.1"],
  /** Evita que Next tome como raíz un package-lock.json de una carpeta superior. */
  turbopack: { root: __dirname },
};

/** `npm run analyze` (o ANALYZE=true) genera el reporte de bundle en .next/analyze/. */
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true" || process.env.npm_lifecycle_event === "analyze",
});

export default withBundleAnalyzer(nextConfig);
