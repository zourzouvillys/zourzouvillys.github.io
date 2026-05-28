# zrz.io

Personal site of Theo Zourzouvillys — a single long-form essay, a Markdown blog,
and a photo gallery synced from Instagram. Built with [Astro](https://astro.build)
and deployed to GitHub Pages at [zrz.io](https://zrz.io).

It's deliberately simple: pure static HTML, one serif (EB Garamond), one accent
colour, no client-side JavaScript framework.

## Develop

This project uses [pnpm](https://pnpm.io).

```sh
pnpm install
pnpm dev           # http://localhost:4321
pnpm build         # static output → dist/
pnpm preview       # serve the built site locally
```

## Writing a blog post

Each article is one Markdown file in `src/content/blog/`. The filename becomes the
URL (`my-post.md` → `/blog/my-post`). Start the file with front matter:

```yaml
---
title: The title of the piece
description: One line shown in the list and as the link preview.
date: 2026-05-28
tags: [essays, sailing]
draft: false        # true = visible locally, never published
---
```

Then write Markdown below it. Commit the file and the next deploy publishes it.
An RSS feed is generated automatically at `/rss.xml`.

## Photos (Instagram sync)

The `/photos` gallery and the homepage strip read from `src/data/instagram.json`.
A scheduled GitHub Action (`.github/workflows/instagram.yml`) refreshes this daily:
it fetches the latest media from `@zourzouvillys`, downloads the images into
`public/instagram/`, and commits them.

**Manual fallback:** edit `src/data/instagram.json` by hand — add entries to
`items` (`{ "image": "/instagram/x.jpg", "permalink": "...", "caption": "..." }`)
and drop the matching images into `public/instagram/`.

### One-time token setup

The sync needs an Instagram **long-lived access token** (Instagram API with
Instagram Login — requires a Professional/Creator account linked to a Meta app).
Once you have it:

1. Repo → **Settings → Secrets and variables → Actions**.
2. Add secret `INSTAGRAM_TOKEN` = the long-lived token.
3. (Optional, to auto-rotate the token before it expires) add secret `GH_PAT` =
   a fine-grained PAT with **Secrets: write** on this repo. Without it the token
   still works for ~60 days and can be refreshed by re-running the workflow.

Run **Actions → Sync Instagram photos → Run workflow** to test. With no token the
job exits cleanly and the site still builds (photos pages link to the profile).

## Deploy

`.github/workflows/deploy.yml` builds the site and publishes `dist/` to GitHub
Pages on every push to `main`. The custom domain is set via `public/CNAME`.

## Structure

```
src/
  pages/
    index.astro          the personal essay (homepage)
    photos.astro         photo gallery
    blog/index.astro     list of posts
    blog/[...slug].astro  renders a post
    rss.xml.js           RSS feed
  content/blog/*.md      ← your articles
  layouts/Base.astro     <head>, header, footer shell
  components/            SiteHeader, SiteFooter, PhotoStrip
  data/instagram.json    synced photo metadata
  styles/global.css      the whole design system
scripts/sync-instagram.mjs
public/                  static assets + CNAME (copied verbatim)
```
