import fs from "fs";
import path from "path";

// Durable key/value storage for the app's small JSON "memory" documents.
// Uses an Upstash-compatible Redis REST API when configured (works on Vercel's
// read-only serverless filesystem); otherwise falls back to local files so
// local development still works. Read falls back to the bundled seed file so
// defaults survive the first run before anything is written.
// Find a KV credential by suffix, tolerating any prefix Vercel's storage
// integration adds (e.g. STORAGE_KV_REST_API_URL, UPSTASH_REDIS_REST_URL).
function findEnv(suffixes: string[]): string {
  for (const suffix of suffixes) {
    if (process.env[suffix]) return process.env[suffix] as string;
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (!value) continue;
    if (suffixes.some((s) => key.endsWith(`_${s}`))) return value;
  }
  return "";
}

// Upstash exposes both a REST API (url + token) and a redis:// connection
// string. Vercel's integration may inject only the latter (REDIS_URL / KV_URL),
// so derive the REST credentials from it: the REST host is the same host over
// https, and the REST token is the connection password.
function deriveFromRedisUrl(): { url: string; token: string } | null {
  for (const value of Object.values(process.env)) {
    if (!value) continue;
    if (value.startsWith("rediss://") || value.startsWith("redis://")) {
      try {
        const u = new URL(value);
        const token = decodeURIComponent(u.password || "");
        if (u.hostname && token) return { url: `https://${u.hostname}`, token };
      } catch {
        // ignore malformed values
      }
    }
  }
  return null;
}

let KV_URL = findEnv(["KV_REST_API_URL", "UPSTASH_REDIS_REST_URL"]);
let KV_TOKEN = findEnv(["KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN"]);

if (!KV_URL || !KV_TOKEN) {
  const derived = deriveFromRedisUrl();
  if (derived) {
    KV_URL = KV_URL || derived.url;
    KV_TOKEN = KV_TOKEN || derived.token;
  }
}

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
