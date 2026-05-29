// @ts-check
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Posts marked `unlisted: true` in their front matter are share-by-link only:
// they must stay out of the sitemap. Discover them by scanning the blog dir at
// build start, so adding the flag to any post is enough — no config edit.
const blogDir = fileURLToPath(new URL("./src/content/blog", import.meta.url));
const unlistedSlugs = readdirSync(blogDir)
  .filter((f) => /\.mdx?$/.test(f))
  .filter((f) => /^unlisted:\s*true\s*$/m.test(readFileSync(path.join(blogDir, f), "utf8")))
  .map((f) => f.replace(/\.mdx?$/, ""));

// https://astro.build
export default defineConfig({
  site: "https://zrz.io",
  // Custom domain at the apex (zrz.io), so the site is served from the root.
  base: "/",
  trailingSlash: "ignore",
  integrations: [
    sitemap({
      filter: (page) => !unlistedSlugs.some((slug) => page.includes(`/blog/${slug}`)),
    }),
  ],
  build: {
    // Emit clean URLs: /blog/my-post/index.html -> /blog/my-post
    format: "directory",
  },
});
