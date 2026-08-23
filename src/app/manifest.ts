import type { MetadataRoute } from "next";

/**
 * Turns the site into an installable home-screen app.
 *
 * `start_url` is /portals rather than / on purpose: that route's layout already
 * redirects a signed-in visitor to their own area (charity users to
 * /select-charity, staff to /main) and shows the portal chooser to everyone
 * else. So launching the icon lands each person where they belong without any
 * extra routing.
 *
 * `display: "standalone"` is what removes the browser's address bar and
 * controls. iOS additionally needs the `appleWebApp` metadata in the root
 * layout — the manifest alone does not convince Safari.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "زاد التنموية",
    short_name: "زاد",
    description:
      "منصة زاد الإدارة التنموية — بوابة الجمعيات وبوابة الموظفين",
    start_url: "/portals",
    scope: "/",
    display: "standalone",
    // Orientation is deliberately left to the device. Locking to portrait would
    // stop anyone from turning a tablet sideways to read the wide tables and the
    // Gantt chart, which is exactly when landscape is worth having.
    dir: "rtl",
    lang: "ar",
    background_color: "#f8fafc",
    theme_color: "#0f766e",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops every icon to the launcher's mask; this one keeps the mark
      // inside the safe zone so the crop never clips it.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
