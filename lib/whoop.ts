import { readDoc, writeDoc } from "@/lib/store";

// WHOOP Developer API v2 + OAuth2.
// Docs: https://developer.whoop.com/docs/developing/oauth/
export const WHOOP_BASE = "https://api.prod.whoop.com/developer";
export const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
export const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";

// `offline` is required to receive a refresh token.
export const WHOOP_SCOPE =
  "read:profile read:body_measurement read:cycles read:recovery read:sleep read:workout offline";

type Store = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number; // epoch ms
  scope?: string;
};

async function readStore(): Promise<Store> {
  return readDoc<Store>("whoop", {});
}

export function redirectUri(origin: string) {
  return process.env.WHOOP_REDIRECT_URI || `${origin}/api/whoop/callback`;
}

async function persist(data: any) {
  const store = await readStore();
  store.access_token = data.access_token;
  // WHOOP rotates refresh tokens on every refresh — always keep the newest.
  if (data.refresh_token) store.refresh_token = data.refresh_token;
  if (data.scope) store.scope = data.scope;
  const ttl = Number(data.expires_in || 3600);
  // Refresh 60s early to avoid racing expiry.
  store.expires_at = Date.now() + (ttl - 60) * 1000;
  await writeDoc("whoop", store);
}

export async function exchangeCode(code: string, origin: string) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: process.env.WHOOP_CLIENT_ID || "",
    client_secret: process.env.WHOOP_CLIENT_SECRET || "",
    redirect_uri: redirectUri(origin),
  });

  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!res.ok) {
    throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  await persist(data);
  return data;
}

async function refresh(refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.WHOOP_CLIENT_ID || "",
    client_secret: process.env.WHOOP_CLIENT_SECRET || "",
    scope: "offline",
  });

  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!res.ok) {
    throw new Error(`token refresh failed: ${res.status}`);
  }

  const data = await res.json();
  await persist(data);
  return data.access_token as string;
}

// Returns a usable access token, refreshing if needed. Falls back to a
// manually-provided WHOOP_ACCESS_TOKEN env var, and null if nothing works.
export async function getValidAccessToken(): Promise<string | null> {
  const store = await readStore();

  if (store.access_token && store.expires_at && store.expires_at > Date.now()) {
    return store.access_token;
  }

  if (store.refresh_token) {
    try {
      return await refresh(store.refresh_token);
    } catch {
      // fall through to manual token
    }
  }

  if (process.env.WHOOP_ACCESS_TOKEN) {
    return process.env.WHOOP_ACCESS_TOKEN;
  }

  return null;
}

export async function isAuthorized(): Promise<boolean> {
  const store = await readStore();
  return Boolean(
    store.refresh_token || store.access_token || process.env.WHOOP_ACCESS_TOKEN
  );
}
