import rss from "@astrojs/rss";
import { getPosts } from "../lib/posts";

export async function GET(context) {
  const posts = await getPosts();
  return rss({
    title: "Theo Zourzouvillys — Writing",
    description: "Longer-form essays on engineering, leadership, and life on the water.",
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/blog/${post.id}/`,
    })),
  });
}
