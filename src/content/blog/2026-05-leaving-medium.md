---
title: Writing here instead of Medium
description: A short note on why this site now has a blog — and how I publish to it.
date: 2026-05-28
tags: [meta, writing]
draft: false
---

For years my longer pieces lived on Medium. That always felt slightly wrong —
renting space for words I wanted to keep. So they live here now, on my own
domain, in plain files I control.

## How a post becomes a page

Every article is a single Markdown file in `src/content/blog/`. The filename
becomes the URL. This very page is `2026-05-leaving-medium.md`, so it lives at
`/blog/2026-05-leaving-medium`.

Each file starts with a small block of front matter:

```yaml
---
title: The title of the piece
description: One line that shows in the list and as the preview.
date: 2026-05-28
tags: [essays, sailing]
draft: false
---
```

Set `draft: true` while a piece is still cooking — drafts are visible when I run
the site locally but never published. Flip it to `false` (or delete the line)
and the next build puts it live.

## What you can write

Everything Markdown gives you works: **bold**, *italic*, [links](https://zrz.io),
lists, and quotes —

> The sea doesn't care how clever you are. It asks only that you pay attention.

Code blocks are syntax-aware:

```ts
function belongsHere(words: string[]) {
  return words.length > 0;
}
```

That's the whole system. Write a file, commit it, and it's published — no
editor, no paywall, no algorithm deciding who sees it.
