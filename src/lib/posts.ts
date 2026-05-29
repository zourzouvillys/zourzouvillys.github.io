import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"blog">;

/** Every publishable post (drafts hidden in production), newest first.
 *  Includes unlisted posts — used for routing so their URLs still build. */
export async function getAllPosts(): Promise<Post[]> {
  const posts = await getCollection("blog", ({ data }) =>
    import.meta.env.PROD ? data.draft !== true : true,
  );
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** Listed posts — excludes unlisted. Drives the blog index and RSS feed. */
export async function getPosts(): Promise<Post[]> {
  return (await getAllPosts()).filter((p) => p.data.unlisted !== true);
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
