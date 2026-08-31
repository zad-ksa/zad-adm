import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { finalizeExpiredDeliveries } from "@/app/actions/designRequests";

/**
 * Approves deliveries the charity never answered.
 *
 * A delivered request waits 24 hours for the charity to either sign off or send
 * it back with notes. Silence is treated as acceptance — otherwise a request
 * sits delivered forever, its brief attachments never released from storage and
 * its status never settling.
 *
 * Runs once a day, at 01:00 Riyadh.
 *
 * Hourly would be the honest match for a 24-hour window: a daily sweep
 * finalises somewhere between 24 and 48 hours after delivery, depending on
 * what time the designer pressed the button. It is daily because Vercel's
 * Hobby plan permits one cron run per day, and an hourly schedule makes the
 * whole deployment fail — the feature working late beats the site not
 * deploying at all.
 *
 * The lateness only ever favours the charity: it keeps the request open
 * longer, and approving or returning it stays possible right up to the sweep.
 * If the schedule ever matters more than the plan, raise the plan or call
 * this route from an external scheduler with the same CRON_SECRET.
 *
 * Deliberately does NOT touch REVISION_REQUESTED. That clock is on Zad, not on
 * the charity, and auto-approving there would reward us for missing our own
 * deadline. Those simply show as overdue.
 *
 * Schedule: `0 22 * * *` — see vercel.json.
 */
export async function GET(request: Request) {
  try {
    // Fail closed: a missing secret must block the route rather than leave it
    // open to anyone who finds the path.
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("Design auto-approve cron blocked: CRON_SECRET is not configured.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await finalizeExpiredDeliveries();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Design auto-approve cron failed:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
