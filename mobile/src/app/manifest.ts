import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const icons = [192, 512].flatMap((s) =>
    (["any", "maskable"] as const).map((purpose) => ({ src: `/pwa-icon/${s}`, sizes: `${s}x${s}`, type: "image/png", purpose })),
  );
  return {
    name: "CampusConnect",
    short_name: "Campus",
    description: "Campus-Karte, Kalender und Chats für Studierende",
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#e9edf5",
    theme_color: "#e9edf5",
    icons,
  };
}
