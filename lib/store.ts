import fs from "fs";
import path from "path";

// Durable key/value storage for the app's small JSON "memory" documents.
// Uses an Upstash-compatible Redis REST API when configured (works on Vercel's
// read-only serverless filesystem); otherwise falls back to local files so
// local development still works. Read falls back to the bundled seed file so
// defaults survive the first run before anything is written.
const KV_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const KV_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export const storeBackend: "kv" | "file" = KV_URL && KV_TOKEN ? "kv" : "file";

function localPath(name: string) {
  return path.join(process.cwd(), "memory", `${name}.json`);
}

async function kv(command: (string | number)[]) {
  const res = await fetch(KV_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`kv ${command[0]} failed: ${res.status}`);
  }

  const data = await res.json();
  return data.result;
}

export async function readDoc<T = any>(name: string, fallback: T): Promise<T> {
  if (storeBackend === "kv") {
    try {
      const raw = await kv(["GET", `sana:${name}`]);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // fall through to seed file
    }
  }

  try {
    return JSON.parse(fs.readFileSync(localPath(name), "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeDoc(name: string, value: any): Promise<void> {
  if (storeBackend === "kv") {
    await kv(["SET", `sana:${name}`, JSON.stringify(value)]);
    return;
  }

  try {
    fs.writeFileSync(localPath(name), JSON.stringify(value, null, 2));
  } catch {
    // read-only filesystem and no KV configured — nothing persists
  }
}
