import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "LiftLog",
        short_name: "LiftLog",
        description: "Personal workout logger, routine builder and progress tracker.",
        theme_color: "#111214",
        background_color: "#111214",
        display: "standalone",
        orientation: "portrait",
        start_url: ".",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App shell, exercise data and the 8.5 MB of thumbnails are precached so the
        // library works fully offline. GIFs (~120 MB) are cached as you view them.
        globPatterns: ["**/*.{js,css,html,svg,png,json}", "media/images/*.jpg"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/media\/videos\/.*\.gif$/,
            handler: "CacheFirst",
            options: {
              cacheName: "exercise-gifs",
              expiration: { maxEntries: 1500 },
            },
          },
        ],
      },
    }),
  ],
});