import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request: Request) {
  try {
    // Fail closed: this route permanently deletes files from Cloudinary, so a
    // missing CRON_SECRET must block the request rather than skip the check.
    // (The previous `process.env.CRON_SECRET && ...` form disabled the guard
    // entirely whenever the variable was unset, leaving the route public.)
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("Cleanup cron blocked: CRON_SECRET is not configured.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Calculate the date 60 days ago
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Find all completed tasks that have a proof older than 60 days
    const oldTasks = await prisma.task.findMany({
      where: {
        isCompleted: true,
        completedAt: {
          lt: sixtyDaysAgo,
        },
        proofPublicId: {
          not: null,
        },
      },
    });

    if (oldTasks.length === 0) {
      return NextResponse.json({ message: "No old proofs found to delete." });
    }

    const deletedIds: string[] = [];
    const errors: any[] = [];

    // Loop through and delete from Cloudinary, then update DB
    for (const task of oldTasks) {
      try {
        if (task.proofPublicId) {
          // 1. Delete from Cloudinary
          await cloudinary.uploader.destroy(task.proofPublicId);

          // 2. Remove the proof references from the database
          await prisma.task.update({
            where: { id: task.id },
            data: {
              proofUrl: null,
              proofPublicId: null,
            },
          });

          deletedIds.push(`task-${task.id}`);
        }
      } catch (err: any) {
        console.error(`Failed to delete proof for task ${task.id}:`, err);
        errors.push({ taskId: task.id, error: err.message });
      }
    }

    // --- Cleanup Request Attachments (2 days after approval) ---
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const oldRequests = await prisma.request.findMany({
      where: {
        status: "APPROVED",
        reviewedAt: {
          lt: twoDaysAgo,
        },
        attachments: {
          not: Prisma.DbNull,
        },
      },
    });

    for (const req of oldRequests) {
      if (!req.attachments) continue;
      
      try {
        let attachments: any[] = [];
        if (typeof req.attachments === 'string') {
          attachments = JSON.parse(req.attachments);
        } else if (Array.isArray(req.attachments)) {
          attachments = req.attachments;
        }

        let hasDeleted = false;
        for (const att of attachments) {
          if (att.publicId) {
            await cloudinary.uploader.destroy(att.publicId);
            hasDeleted = true;
          }
        }

        if (hasDeleted) {
          await prisma.request.update({
            where: { id: req.id },
            data: {
              attachments: Prisma.DbNull,
            },
          });
          deletedIds.push(`request-${req.id}`);
        }
      } catch (err: any) {
        console.error(`Failed to delete attachments for request ${req.id}:`, err);
        errors.push({ requestId: req.id, error: err.message });
      }
    }

    return NextResponse.json({
      message: `Cleanup completed. Deleted ${deletedIds.length} items.`,
      deletedIds,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Cleanup cron error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
