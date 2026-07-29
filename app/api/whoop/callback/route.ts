import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/whoop";

export const dynamic = "force-dynamic";

// WHOOP redirects back here with ?code&state after the user authorizes.
export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("whoop_oauth_state")?.value;

  if (!code) {
    return NextResponse.redirect(`${origin}/?whoop=error`);
  }

  if (!state || state !== cookieState) {
    return NextResponse.redirect(`${origin}/?whoop=state_mismatch`);
  }

  try {
    await exchangeCode(code, origin);
    const res = NextResponse.redirect(`${origin}/?whoop=connected`);
    res.cookies.delete("whoop_oauth_state");
    return res;
  } catch {
    return NextResponse.redirect(`${origin}/?whoop=exchange_failed`);
  }
}
