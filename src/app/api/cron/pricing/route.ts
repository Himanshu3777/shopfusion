import { NextRequest, NextResponse } from "next/server";
import { runPricingCycle } from "@/lib/dynamic-pricing";

/**
 * GET /api/cron/pricing — daily dynamic pricing cycle (Vercel Cron).
 * Protected: requires Authorization: Bearer <CRON_SECRET> in production.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { changes, festival } = await runPricingCycle();
    const drops = changes.filter((c) => c.newPrice < c.oldPrice).length;
    const hikes = changes.filter((c) => c.newPrice > c.oldPrice).length;
    return NextResponse.json({
      ok: true,
      festival: festival?.name ?? null,
      changed: changes.length,
      drops,
      hikes,
    });
  } catch (e) {
    console.error("[cron/pricing] failed", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "pricing cycle failed" },
      { status: 500 }
    );
  }
}
