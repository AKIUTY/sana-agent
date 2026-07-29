import { WHOOP_BASE, getValidAccessToken, isAuthorized } from "@/lib/whoop";

export const dynamic = "force-dynamic";

async function whoopGet(path: string, token: string) {
  const res = await fetch(`${WHOOP_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
}

export async function GET() {
  const token = await getValidAccessToken();

  if (!token) {
    return Response.json({
      connected: false,
      authorized: isAuthorized(),
      reason: "no_token",
    });
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
        authorized: isAuthorized(),
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

    // WHOOP's own sleep recommendation, derived from the sleep_needed breakdown.
    let recommendedSleepHours: number | null = null;
    const sn = s?.sleep_needed;
    if (sn) {
      const totalMilli =
        (sn.baseline_milli || 0) +
        (sn.need_from_sleep_debt_milli || 0) +
        (sn.need_from_recent_strain_milli || 0) -
        (sn.need_from_recent_nap_milli || 0);
      if (totalMilli > 0) {
        recommendedSleepHours = Math.round((totalMilli / 3.6e6) * 10) / 10;
      }
    }

    return Response.json({
      connected: true,
      authorized: true,
      recovery,
      zone,
      hrv: r?.hrv_rmssd_milli ?? null,
      restingHr: r?.resting_heart_rate ?? null,
      strain: c?.strain ?? null,
      sleepPerformance: s?.sleep_performance_percentage ?? null,
      recommendedSleepHours,
    });
  } catch (error: any) {
    return Response.json({
      connected: false,
      authorized: isAuthorized(),
      reason: "error",
      error: error?.message || String(error),
    });
  }
}
