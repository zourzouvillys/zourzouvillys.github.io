// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build
export default defineConfig({
  site: "https://zrz.io",
  // Custom domain at the apex (zrz.io), so the site is served from the root.
  base: "/",
  trailingSlash: "ignore",
  integrations: [sitemap()],
  build: {
    // Emit clean URLs: /blog/my-post/index.html -> /blog/my-post
    format: "directory",
  },
});
