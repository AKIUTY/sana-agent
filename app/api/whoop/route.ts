export const dynamic = "force-dynamic";

// WHOOP Developer API v2 — https://api.prod.whoop.com/developer
// Requires an OAuth2 access token in the WHOOP_ACCESS_TOKEN env var.
// Access tokens are short-lived (~1h); if it 401s we degrade gracefully
// instead of inventing data.
const BASE = "https://api.prod.whoop.com/developer";

async function whoopGet(path: string, token: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
}

export async function GET() {
  const token = process.env.WHOOP_ACCESS_TOKEN;

  if (!token) {
    return Response.json({ connected: false, reason: "no_token" });
  }

  try {
    const [rec, cyc, slp] = await Promise.all([
      whoopGet("/v2/recovery?limit=1", token),
      whoopGet("/v2/cycle?limit=1", token),
      whoopGet("/v2/activity/sleep?limit=1", token),
    ]);

    const r = rec?.records?.[0]?.score ?? null;
    const c = cyc?.records?.[0]?.score ?? null;
    const s = slp?.records?.[0]?.score ?? null;

    if (!r && !c && !s) {
      return Response.json({
        connected: false,
        reason: "unauthorized_or_empty",
      });
    }

    const recovery =
      typeof r?.recovery_score === "number" ? r.recovery_score : null;

    let zone = "unknown";
    if (typeof recovery === "number") {
      if (recovery >= 67) zone = "green";
      else if (recovery >= 34) zone = "yellow";
      else zone = "red";
    }

    return Response.json({
      connected: true,
      recovery,
      zone,
      hrv: r?.hrv_rmssd_milli ?? null,
      restingHr: r?.resting_heart_rate ?? null,
      strain: c?.strain ?? null,
      sleepPerformance: s?.sleep_performance_percentage ?? null,
    });
  } catch (error: any) {
    return Response.json({
      connected: false,
      reason: "error",
      error: error?.message || String(error),
    });
  }
}
