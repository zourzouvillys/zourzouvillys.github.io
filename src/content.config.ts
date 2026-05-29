import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Longer-form articles. Write one Markdown file per post in src/content/blog/.
const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    // Unlisted: the post still builds at its URL, but is hidden from the
    // blog index and the RSS feed (shareable-by-link only).
    unlisted: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { blog };
