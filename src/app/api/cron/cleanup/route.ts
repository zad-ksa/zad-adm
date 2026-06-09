import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request: Request) {
  try {
    // Optionally secure this route with an authorization header
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

          deletedIds.push(task.id);
        }
      } catch (err: any) {
        console.error(`Failed to delete proof for task ${task.id}:`, err);
        errors.push({ taskId: task.id, error: err.message });
      }
    }

    return NextResponse.json({
      message: `Cleanup completed. Deleted ${deletedIds.length} proofs.`,
      deletedTaskIds: deletedIds,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Cleanup cron error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
