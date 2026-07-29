import { NextResponse } from "next/server";
import {
  WHOOP_AUTH_URL,
  WHOOP_SCOPE,
  redirectUri,
} from "@/lib/whoop";

export const dynamic = "force-dynamic";

// Kicks off the WHOOP OAuth2 authorization-code flow.
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;

  if (!process.env.WHOOP_CLIENT_ID) {
    return NextResponse.redirect(`${origin}/?whoop=missing_client`);
  }

  const state = crypto.randomUUID();

  const url = new URL(WHOOP_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.WHOOP_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri(origin));
  url.searchParams.set("scope", WHOOP_SCOPE);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("whoop_oauth_state", state, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 600,
  });
  return res;
}
