import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chess Analysis",
    short_name: "Chess",
    description: "Аналіз шахових партій з AI та Stockfish",
    start_url: "/",
    display: "standalone",
    background_color: "#121212",
    theme_color: "#2d5a27",
    orientation: "portrait",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
