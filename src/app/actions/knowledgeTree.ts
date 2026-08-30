"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * One permission gates the whole tree: seeing it, and changing it.
 *
 * Gated on the permission rather than on a list of roles — the meetings page
 * shipped with a hand-written role array, and every role added afterwards from
 * the roles screen fell outside it and broke the page for its holder.
 */
async function requireKnowledgeAccess() {
  const session = await getSession();
  if (!session || session.userType === "CHARITY_USER") throw new Error("غير مصرح");
  if (!hasPermission(session.role, session.permissions || [], "manage_knowledge_tree")) {
    throw new Error("غير مصرح لك بالوصول إلى شجرة المعرفة");
  }
  return session;
}

export type KnowledgeNodeRow = {
  id: string;
  name: string;
  kind: "FOLDER" | "FILE";
  parentId: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  createdAt: string;
  createdByName: string | null;
  /** Folders only: how many things are inside, so the UI can warn before deleting. */
  childCount: number;
};

const NAME_MAX = 120;

function cleanName(raw: string) {
  return raw.trim().replace(/\s+/g, " ").slice(0, NAME_MAX);
}

/**
 * Lists one level of the tree, plus the breadcrumb path to it.
 *
 * One level at a time rather than the whole tree: this is a file browser, and
 * loading every node to render one folder is how it would get slow once anyone
 * actually filled it.
 */
type FolderListing =
  | { ok: true; rows: KnowledgeNodeRow[]; path: { id: string; name: string }[] }
  | { ok: false; error: string };

export async function listKnowledgeFolder(parentId: string | null): Promise<FolderListing> {
  try {
    await requireKnowledgeAccess();

    const [nodes, path] = await Promise.all([
      prisma.knowledgeNode.findMany({
        where: { parentId },
        orderBy: [{ kind: "asc" }, { name: "asc" }],
        include: {
          createdBy: { select: { name: true } },
          _count: { select: { children: true } },
        },
      }),
      buildPath(parentId),
    ]);

    const rows: KnowledgeNodeRow[] = nodes.map((n) => ({
      id: n.id,
      name: n.name,
      // FOLDER sorts before FILE alphabetically, which is also the order a file
      // browser shows them in — so the orderBy above needs no special case.
      kind: n.kind,
      parentId: n.parentId,
      fileUrl: n.fileUrl,
      fileSize: n.fileSize,
      createdAt: n.createdAt.toISOString(),
      createdByName: n.createdBy?.name ?? null,
      childCount: n._count.children,
    }));

    return { ok: true, rows, path };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "تعذّر تحميل المجلد" };
  }
}

/** Walks up from a folder to the root so the UI can render a breadcrumb. */
async function buildPath(id: string | null): Promise<{ id: string; name: string }[]> {
  const path: { id: string; name: string }[] = [];
  let cursor = id;
  // Bounded so a cycle — which the schema should prevent, but a bad move could
  // still create — cannot spin here forever.
  for (let depth = 0; cursor && depth < 50; depth++) {
    const node = await prisma.knowledgeNode.findUnique({
      where: { id: cursor },
      select: { id: true, name: true, parentId: true },
    });
    if (!node) break;
    path.unshift({ id: node.id, name: node.name });
    cursor = node.parentId;
  }
  return path;
}

export async function createKnowledgeFolder(parentId: string | null, name: string) {
  try {
    const session = await requireKnowledgeAccess();

    const clean = cleanName(name);
    if (!clean) return { error: "يرجى إدخال اسم المجلد" };

    if (parentId) {
      const parent = await prisma.knowledgeNode.findUnique({
        where: { id: parentId },
        select: { kind: true },
      });
      if (!parent) return { error: "المجلد غير موجود" };
      // A file cannot contain anything.
      if (parent.kind !== "FOLDER") return { error: "لا يمكن الإنشاء داخل ملف" };
    }

    const clash = await prisma.knowledgeNode.findFirst({
      where: { parentId, name: clean, kind: "FOLDER" },
      select: { id: true },
    });
    if (clash) return { error: "يوجد مجلد بهذا الاسم هنا" };

    await prisma.knowledgeNode.create({
      data: { name: clean, kind: "FOLDER", parentId, createdById: session.id },
    });

    revalidatePath("/main/knowledge-tree");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذّر إنشاء المجلد" };
  }
}

/**
 * Records files the browser has already uploaded to Cloudinary.
 *
 * The bytes never pass through here — see lib/clientUpload — so this only
 * stores what came back.
 */
export async function addKnowledgeFiles(
  parentId: string | null,
  files: { name: string; url: string; publicId: string; resourceType: string; size: number }[]
) {
  try {
    const session = await requireKnowledgeAccess();
    if (!files.length) return { success: true };

    if (parentId) {
      const parent = await prisma.knowledgeNode.findUnique({
        where: { id: parentId },
        select: { kind: true },
      });
      if (!parent) return { error: "المجلد غير موجود" };
      if (parent.kind !== "FOLDER") return { error: "لا يمكن الرفع داخل ملف" };
    }

    await prisma.knowledgeNode.createMany({
      data: files.map((f) => ({
        name: cleanName(f.name) || "ملف",
        kind: "FILE" as const,
        parentId,
        fileUrl: f.url,
        publicId: f.publicId,
        resourceType: f.resourceType,
        fileSize: f.size,
        createdById: session.id,
      })),
    });

    revalidatePath("/main/knowledge-tree");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذّر حفظ الملفات" };
  }
}

export async function renameKnowledgeNode(id: string, name: string) {
  try {
    await requireKnowledgeAccess();

    const clean = cleanName(name);
    if (!clean) return { error: "يرجى إدخال اسم" };

    const node = await prisma.knowledgeNode.findUnique({
      where: { id },
      select: { parentId: true, kind: true },
    });
    if (!node) return { error: "العنصر غير موجود" };

    const clash = await prisma.knowledgeNode.findFirst({
      where: { parentId: node.parentId, name: clean, kind: node.kind, NOT: { id } },
      select: { id: true },
    });
    if (clash) return { error: "يوجد عنصر بهذا الاسم هنا" };

    await prisma.knowledgeNode.update({ where: { id }, data: { name: clean } });

    revalidatePath("/main/knowledge-tree");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذّر إعادة التسمية" };
  }
}

/**
 * Deletes a node and, for a folder, everything beneath it.
 *
 * The database cascade removes the rows, but Cloudinary knows nothing about it,
 * so every descendant file is collected first and its asset destroyed. The old
 * localStorage version skipped this entirely and left every uploaded file
 * stranded in storage forever.
 */
export async function deleteKnowledgeNode(id: string) {
  try {
    await requireKnowledgeAccess();

    const node = await prisma.knowledgeNode.findUnique({
      where: { id },
      select: { id: true, kind: true, publicId: true, resourceType: true },
    });
    if (!node) return { error: "العنصر غير موجود" };

    const files: { publicId: string | null; resourceType: string | null }[] =
      node.kind === "FILE" ? [node] : await collectDescendantFiles(id);

    // Best effort, and before the rows go: if a destroy fails we have still lost
    // nothing recoverable, whereas deleting the rows first would leave an asset
    // no record points at.
    for (const f of files) {
      if (!f.publicId) continue;
      try {
        await cloudinary.uploader.destroy(f.publicId, { resource_type: f.resourceType || "raw" });
      } catch (err) {
        console.error("Failed to delete knowledge file from Cloudinary", f.publicId, err);
      }
    }

    await prisma.knowledgeNode.delete({ where: { id } });

    revalidatePath("/main/knowledge-tree");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذّر الحذف" };
  }
}

/** Every file at any depth under a folder, found breadth-first. */
async function collectDescendantFiles(rootId: string) {
  const files: { publicId: string | null; resourceType: string | null }[] = [];
  let frontier = [rootId];

  for (let depth = 0; frontier.length && depth < 50; depth++) {
    const children = await prisma.knowledgeNode.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true, kind: true, publicId: true, resourceType: true },
    });
    if (!children.length) break;

    for (const c of children) {
      if (c.kind === "FILE") files.push({ publicId: c.publicId, resourceType: c.resourceType });
    }
    frontier = children.filter((c) => c.kind === "FOLDER").map((c) => c.id);
  }

  return files;
}
