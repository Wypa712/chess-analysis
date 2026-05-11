import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chess Analysis",
    short_name: "Chess",
    description: "Аналіз шахових партій з AI та Stockfish",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1210",
    theme_color: "#17352e",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192-v2.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-v2.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable-v2.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
