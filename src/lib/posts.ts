import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"blog">;

/** Published posts (drafts hidden in production), newest first. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection("blog", ({ data }) =>
    import.meta.env.PROD ? data.draft !== true : true,
  );
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

const fmt = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  // Dates in front matter are bare (e.g. 2026-05-28) and parse as UTC midnight.
  // Format in UTC so they never slip a day in a western timezone.
  timeZone: "UTC",
});

export function formatDate(date: Date): string {
  return fmt.format(date);
}
