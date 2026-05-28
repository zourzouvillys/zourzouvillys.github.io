#!/usr/bin/env node
/**
 * Sync the latest Instagram media into the repo for the static build.
 *
 * What it does:
 *   1. (optional) refresh the long-lived token so it never expires
 *   2. fetch the latest media via the Instagram Graph API (Instagram Login)
 *   3. download each image into public/instagram/<id>.jpg
 *   4. prune images that are no longer in the latest set
 *   5. write src/data/instagram.json (consumed at build time)
 *
 * Env:
 *   INSTAGRAM_TOKEN   long-lived Instagram access token (required for a real sync)
 *   INSTAGRAM_ACCOUNT handle to display/link (default: zourzouvillys)
 *   INSTAGRAM_LIMIT   max items to keep (default: 24)
 *   GITHUB_OUTPUT     if set, the refreshed token is written here as `token=...`
 *
 * No token? It logs a notice and exits 0 so the build/Action never fails.
 */
import { writeFile, mkdir, readdir, unlink, appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMAGES_DIR = path.join(ROOT, "public", "instagram");
const DATA_FILE = path.join(ROOT, "src", "data", "instagram.json");

const TOKEN = process.env.INSTAGRAM_TOKEN?.trim();
const ACCOUNT = (process.env.INSTAGRAM_ACCOUNT || "zourzouvillys").trim();
const LIMIT = Number(process.env.INSTAGRAM_LIMIT || 24);
const GRAPH = "https://graph.instagram.com";

async function main() {
  if (!TOKEN) {
    console.log(
      "ℹ️  No INSTAGRAM_TOKEN set — skipping sync. " +
        "The site builds fine; photos pages link to the profile until a token is configured.",
    );
    return;
  }

  const token = await refreshToken(TOKEN);

  const fields = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";
  const url = `${GRAPH}/me/media?fields=${fields}&limit=${LIMIT}&access_token=${token}`;
  const media = await fetchJson(url);
  const all = media?.data ?? [];

  await mkdir(IMAGES_DIR, { recursive: true });

  const items = [];
  for (const m of all) {
    const src = m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url;
    if (!src) continue;
    const file = `${m.id}.jpg`;
    await downloadImage(src, path.join(IMAGES_DIR, file));
    items.push({
      id: m.id,
      image: `/instagram/${file}`,
      permalink: m.permalink,
      caption: cleanCaption(m.caption),
      timestamp: m.timestamp,
      type: m.media_type,
    });
    if (items.length >= LIMIT) break;
  }

  await pruneImages(items.map((i) => `${i.id}.jpg`));

  const payload = {
    account: ACCOUNT,
    updatedAt: new Date().toISOString(),
    items,
  };
  await writeFile(DATA_FILE, JSON.stringify(payload, null, 2) + "\n");
  console.log(`✅ Synced ${items.length} photo(s) from @${ACCOUNT}.`);
}

/** Refresh the long-lived token (extends it 60 days). Non-fatal on failure. */
async function refreshToken(current) {
  try {
    const res = await fetch(
      `${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${current}`,
    );
    if (!res.ok) {
      console.warn(`⚠️  Token refresh skipped (HTTP ${res.status}) — using existing token.`);
      return current;
    }
    const data = await res.json();
    const next = data.access_token || current;
    if (next !== current && process.env.GITHUB_OUTPUT) {
      console.log("::add-mask::" + next);
      await appendFile(process.env.GITHUB_OUTPUT, `token=${next}\n`);
      console.log("🔑 Token refreshed; new token exported for secret rotation.");
    }
    return next;
  } catch (err) {
    console.warn("⚠️  Token refresh errored — using existing token:", err.message);
    return current;
  }
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Instagram API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function downloadImage(src, dest) {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Image download failed (${res.status}) for ${dest}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
}

/** Remove previously-downloaded images that are no longer in the latest set. */
async function pruneImages(keep) {
  const keepSet = new Set(keep);
  let existing = [];
  try {
    existing = await readdir(IMAGES_DIR);
  } catch {
    return;
  }
  for (const f of existing) {
    if (f.endsWith(".jpg") && !keepSet.has(f)) {
      await unlink(path.join(IMAGES_DIR, f));
    }
  }
}

function cleanCaption(caption) {
  if (!caption) return undefined;
  const oneLine = caption.replace(/\s+/g, " ").trim();
  return oneLine.length > 140 ? oneLine.slice(0, 137) + "…" : oneLine;
}

main().catch((err) => {
  console.error("❌ Instagram sync failed:", err.message);
  process.exit(1);
});
