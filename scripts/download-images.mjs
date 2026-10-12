import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Map seeded vacation destinations to their source photograph IDs.
const sources = {
    "rome": "photo-1552832230-c0197dd311b5",
    "kyoto": "photo-1493976040374-85c8e12f0c0e",
    "paris": "photo-1502602898657-3e91760cbb34",
    "santorini": "photo-1613395877344-13d4a8e0d49e",
    "bali": "photo-1537996194471-e657df975ab4",
    "madrid": "photo-1539037116277-4db20889f2d4",
    "maldives": "photo-1514282401047-d79a71a590e8",
    "new-york": "photo-1485871981521-5b1fd3805eee",
    "cape-town": "photo-1580060839134-75a5edca2e99",
    "iceland": "photo-1504829857797-ddff29c27927",
    "porto": "photo-1555881400-74d7acaacd8b",
    "sydney": "photo-1506973035872-a4ec16b8e8d9"
};
const images = path.join(root, "Backend/assets/images");
await fs.mkdir(images, { recursive: true });
const entries = Object.entries(sources);
const credits = {};
// Download in small batches and retain images that are already on disk.
for (let offset = 0; offset < entries.length; offset += 3) {
    await Promise.all(entries.slice(offset, offset + 3).map(async ([name, id]) => {
        const url = "https://images.unsplash.com/" + id + "?auto=format&fit=crop&w=1200&q=85&fm=jpg";
        const destination = path.join(images, name + ".jpg");
        credits[name + ".jpg"] = { source: url, provider: "Unsplash" };
        try { await fs.access(destination); console.log("Kept " + name); return; } catch {}
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
            throw new Error(name + ": image download failed (" + response.status + ")");
        }
        await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
        console.log("Saved " + name);
    }));
}
// Keep image credits and the public sign-in photograph alongside the assets.
await fs.writeFile(path.join(root, "Backend/assets/image-sources.json"), JSON.stringify(credits, null, 2) + "\n");
await fs.mkdir(path.join(root, "Frontend/public/images"), { recursive: true });
await fs.copyFile(path.join(images, "santorini.jpg"), path.join(root, "Frontend/public/images/escape.jpg"));
console.log("Vacation images and login photograph ready.");
