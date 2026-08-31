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
 * Runs HOURLY, not daily. The window is 24 hours, and a once-a-day sweep would
 * approve somewhere between 24 and 48 hours after delivery depending on what
 * time the designer happened to press the button — so half the charities would
 * get a different deal from the one the interface promised them.
 *
 * Deliberately does NOT touch REVISION_REQUESTED. That clock is on Zad, not on
 * the charity, and auto-approving there would reward us for missing our own
 * deadline. Those simply show as overdue.
 *
 * Schedule: `0 * * * *` — see vercel.json.
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
