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
async function requireLibraryAccess() {
  const session = await getSession();
  if (!session || session.userType === "CHARITY_USER") throw new Error("غير مصرح");
  if (!hasPermission(session.role, session.permissions || [], "manage_knowledge_tree")) {
    throw new Error("غير مصرح لك بالوصول إلى مكتبة النماذج");
  }
  return session;
}

/**
 * Reading the library, which charities may do and staff may do with the
 * permission.
 *
 * Kept separate from requireLibraryAccess rather than made into a flag on it:
 * the four mutations below must never be reachable by a charity account, and a
 * boolean parameter is one wrong default away from making them so. Two named
 * guards cannot be got wrong by omission — a mutation that forgets to say which
 * it wants does not compile.
 *
 * A charity member needs no permission of their own. The library is read-only
 * reference material shared with every charity, and gating it behind a checkbox
 * that every membership would then be given describes a distinction nobody is
 * making.
 */
async function requireLibraryRead() {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح");
  if (session.userType === "CHARITY_USER") return session;
  if (!hasPermission(session.role, session.permissions || [], "manage_knowledge_tree")) {
    throw new Error("غير مصرح لك بالوصول إلى مكتبة النماذج");
  }
  return session;
}

export type TemplateNodeRow = {
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
  | { ok: true; rows: TemplateNodeRow[]; path: { id: string; name: string }[] }
  | { ok: false; error: string };

export async function listTemplateFolder(parentId: string | null): Promise<FolderListing> {
  try {
    await requireLibraryRead();

    const [nodes, path] = await Promise.all([
      prisma.templateNode.findMany({
        where: { parentId },
        orderBy: [{ kind: "asc" }, { name: "asc" }],
        include: {
          createdBy: { select: { name: true } },
          _count: { select: { children: true } },
        },
      }),
      buildPath(parentId),
    ]);

    const rows: TemplateNodeRow[] = nodes.map((n) => ({
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

export type TemplateSearchRow = TemplateNodeRow & {
  /** Folder containing the hit — a result is useless without knowing where it lives. */
  parentName: string | null;
};

/**
 * Searches the folder you are standing in and everything beneath it.
 *
 * One recursive CTE rather than a query per level. The iterative version would
 * cost a round trip for every level of depth, on every keystroke — and depth is
 * exactly what the user cannot see or predict when they type.
 *
 * Scope is the current folder: at the root that is the whole tree, inside a
 * folder it is that subtree only. Searching globally from inside a folder would
 * answer a question nobody asked.
 */
export async function searchTemplateLibrary(scopeId: string | null, query: string) {
  try {
    await requireLibraryRead();

    const q = query.trim();
    if (q.length < 2) return { ok: true as const, rows: [] as TemplateSearchRow[] };

    // Escaped so a name containing % or _ is searched literally rather than as
    // a wildcard — otherwise typing "%" lists the entire subtree.
    const pattern = `%${q.replace(/[\%_]/g, (c) => "\\" + c)}%`;

    const rows = await prisma.$queryRaw<
      {
        id: string;
        name: string;
        kind: "FOLDER" | "FILE";
        parentId: string | null;
        fileUrl: string | null;
        fileSize: number | null;
        createdAt: Date;
        parentName: string | null;
        createdByName: string | null;
        childCount: number;
      }[]
    >`
      WITH RECURSIVE subtree AS (
        SELECT n.* FROM "KnowledgeNode" n
         WHERE (${scopeId}::text IS NULL AND n."parentId" IS NULL)
            OR n."parentId" = ${scopeId}::text
        UNION ALL
        SELECT c.* FROM "KnowledgeNode" c
          JOIN subtree s ON c."parentId" = s.id
      )
      SELECT s.id, s.name, s.kind::text AS kind, s."parentId",
             s."fileUrl", s."fileSize", s."createdAt",
             p.name AS "parentName",
             e.name AS "createdByName",
             (SELECT COUNT(*)::int FROM "KnowledgeNode" k WHERE k."parentId" = s.id) AS "childCount"
        FROM subtree s
        LEFT JOIN "KnowledgeNode" p ON p.id = s."parentId"
        LEFT JOIN "Employee" e ON e.id = s."createdById"
       WHERE s.name ILIKE ${pattern} ESCAPE '\'
       ORDER BY s.kind ASC, s.name ASC
       LIMIT 200
    `;

    return {
      ok: true as const,
      rows: rows.map((r) => ({
        id: r.id,
        name: r.name,
        kind: r.kind,
        parentId: r.parentId,
        fileUrl: r.fileUrl,
        fileSize: r.fileSize,
        createdAt: r.createdAt.toISOString(),
        createdByName: r.createdByName,
        childCount: r.childCount,
        parentName: r.parentName,
      })),
    };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "تعذّر البحث" };
  }
}

/** Walks up from a folder to the root so the UI can render a breadcrumb. */
async function buildPath(id: string | null): Promise<{ id: string; name: string }[]> {
  const path: { id: string; name: string }[] = [];
  let cursor = id;
  // Bounded so a cycle — which the schema should prevent, but a bad move could
  // still create — cannot spin here forever.
  for (let depth = 0; cursor && depth < 50; depth++) {
    const node = await prisma.templateNode.findUnique({
      where: { id: cursor },
      select: { id: true, name: true, parentId: true },
    });
    if (!node) break;
    path.unshift({ id: node.id, name: node.name });
    cursor = node.parentId;
  }
  return path;
}

export async function createTemplateFolder(parentId: string | null, name: string) {
  try {
    const session = await requireLibraryAccess();

    const clean = cleanName(name);
    if (!clean) return { error: "يرجى إدخال اسم المجلد" };

    if (parentId) {
      const parent = await prisma.templateNode.findUnique({
        where: { id: parentId },
        select: { kind: true },
      });
      if (!parent) return { error: "المجلد غير موجود" };
      // A file cannot contain anything.
      if (parent.kind !== "FOLDER") return { error: "لا يمكن الإنشاء داخل ملف" };
    }

    const clash = await prisma.templateNode.findFirst({
      where: { parentId, name: clean, kind: "FOLDER" },
      select: { id: true },
    });
    if (clash) return { error: "يوجد مجلد بهذا الاسم هنا" };

    await prisma.templateNode.create({
      data: { name: clean, kind: "FOLDER", parentId, createdById: session.id },
    });

    revalidatePath("/main/template-library");
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
export async function addTemplateFiles(
  parentId: string | null,
  files: { name: string; url: string; publicId: string; resourceType: string; size: number }[]
) {
  try {
    const session = await requireLibraryAccess();
    if (!files.length) return { success: true };

    if (parentId) {
      const parent = await prisma.templateNode.findUnique({
        where: { id: parentId },
        select: { kind: true },
      });
      if (!parent) return { error: "المجلد غير موجود" };
      if (parent.kind !== "FOLDER") return { error: "لا يمكن الرفع داخل ملف" };
    }

    await prisma.templateNode.createMany({
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

    revalidatePath("/main/template-library");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذّر حفظ الملفات" };
  }
}

export async function renameTemplateNode(id: string, name: string) {
  try {
    await requireLibraryAccess();

    const clean = cleanName(name);
    if (!clean) return { error: "يرجى إدخال اسم" };

    const node = await prisma.templateNode.findUnique({
      where: { id },
      select: { parentId: true, kind: true },
    });
    if (!node) return { error: "العنصر غير موجود" };

    const clash = await prisma.templateNode.findFirst({
      where: { parentId: node.parentId, name: clean, kind: node.kind, NOT: { id } },
      select: { id: true },
    });
    if (clash) return { error: "يوجد عنصر بهذا الاسم هنا" };

    await prisma.templateNode.update({ where: { id }, data: { name: clean } });

    revalidatePath("/main/template-library");
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
export async function deleteTemplateNode(id: string) {
  try {
    await requireLibraryAccess();

    const node = await prisma.templateNode.findUnique({
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
        console.error("Failed to delete template file from Cloudinary", f.publicId, err);
      }
    }

    await prisma.templateNode.delete({ where: { id } });

    revalidatePath("/main/template-library");
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
    const children = await prisma.templateNode.findMany({
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

/**
 * Moves things into a folder — one item or a whole selection, in one call.
 *
 * The hard part is not the update, it is the two ways a move can corrupt the
 * tree, both of which the database will happily accept:
 *
 *   1. A folder moved into itself, or into one of its own descendants. The rows
 *      survive, but that subtree is then unreachable from the root and cannot be
 *      navigated back to — it exists and cannot be opened or deleted from the
 *      UI. buildPath carries a depth bound for exactly this shape of damage;
 *      this guard is what stops a move from causing it in the first place, and
 *      the bound stays as the second line of defence.
 *   2. Two folders with the same name in the same parent. create and rename both
 *      refuse that, so a move that allowed it would be the one door left open.
 *      Files are exempt: duplicate file names are already permitted by upload,
 *      and refusing the move would be a stricter rule than the one that put
 *      them there.
 *
 * A clash renames rather than fails: dragging twenty files onto a folder must
 * not be rejected whole because one name is taken — which is what Explorer's
 * "(2)" suffix is for.
 *
 * Everything moves in one transaction, so a selection either lands together or
 * not at all.
 */
export async function moveTemplateNodes(ids: string[], targetId: string | null) {
  try {
    await requireLibraryAccess();

    const unique = [...new Set(ids)].filter(Boolean);
    if (!unique.length) return { success: true as const, moved: 0, renamed: 0 };

    if (targetId) {
      if (unique.includes(targetId)) {
        return { error: "لا يمكن نقل مجلد إلى داخل نفسه" };
      }
      const target = await prisma.templateNode.findUnique({
        where: { id: targetId },
        select: { kind: true },
      });
      if (!target) return { error: "المجلد المقصود غير موجود" };
      if (target.kind !== "FOLDER") return { error: "لا يمكن النقل داخل ملف" };

      // من المقصد صعوداً إلى الجذر: إن كان أحد المنقولين في الطريق، فالمقصد
      // داخل ما ننقله — وهي الحالة التي تقطع الفرع عن الجذر.
      const moving = new Set(unique);
      let cursor: string | null = targetId;
      for (let depth = 0; cursor && depth < 100; depth++) {
        const node: { parentId: string | null } | null = await prisma.templateNode.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
        if (!node) break;
        if (node.parentId && moving.has(node.parentId)) {
          return { error: "لا يمكن نقل مجلد إلى داخل أحد مجلداته" };
        }
        cursor = node.parentId;
      }
    }

    const nodes = await prisma.templateNode.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true, kind: true, parentId: true },
    });
    if (!nodes.length) return { error: "العناصر غير موجودة" };

    // ما هو في المقصد أصلاً ليس نقلاً. استثناؤه يجعل إفلات تحديد نصفه هنا
    // ونصفه هناك عملاً صحيحاً بدل خطأ.
    const toMove = nodes.filter((n) => n.parentId !== targetId);
    if (!toMove.length) return { success: true as const, moved: 0, renamed: 0 };

    const taken = new Set(
      (
        await prisma.templateNode.findMany({
          where: { parentId: targetId, kind: "FOLDER" },
          select: { name: true },
        })
      ).map((r) => r.name)
    );

    const plan = toMove.map((n) => {
      if (n.kind !== "FOLDER") return { id: n.id, name: null as string | null };
      if (!taken.has(n.name)) {
        // يُحجَز فوراً: مجلدان منقولان بالاسم نفسه من مجلدين مختلفين يصطدمان
        // في المقصد، ولا يظهر ذلك في الأسماء المأخوذة قبل النقل.
        taken.add(n.name);
        return { id: n.id, name: null as string | null };
      }
      let candidate = "";
      for (let i = 2; i < 1000; i++) {
        // الأساس يُقلَّم ليتّسع للّاحقة، لا اللاحقة لتُقلَّم مع الاسم: اسمٌ
        // بطول الحدّ الأقصى كان يخرج من cleanName بلا «(2)» أصلاً، فيبقى
        // مساوياً للاسم المأخوذ ويمرّ التكرار الذي أردنا منعه.
        const suffix = ` (${i})`;
        candidate = cleanName(n.name.slice(0, NAME_MAX - suffix.length) + suffix);
        if (!taken.has(candidate)) break;
      }
      taken.add(candidate);
      return { id: n.id, name: candidate };
    });

    await prisma.$transaction(
      async (tx) => {
        for (const item of plan) {
          await tx.templateNode.update({
            where: { id: item.id },
            data: item.name ? { parentId: targetId, name: item.name } : { parentId: targetId },
          });
        }
      },
      // مهلة الافتراض ثانيتان، وقاعدتنا في ap-southeast-2 — تحديد كبير على
      // اتصال بارد يتجاوزها فيفشل النقل كله بـP2028.
      { timeout: 20_000, maxWait: 15_000 }
    );

    revalidatePath("/main/template-library");
    // المسار فيه مقطع ديناميكي، والوسيط "page" شرطٌ لإبطال كل نسخه —
    // "/portal" وحده لا يصيب /portal/<جمعية>/templates بشيء.
    revalidatePath("/portal/[name]/templates", "page");
    return {
      success: true as const,
      moved: plan.length,
      renamed: plan.filter((p) => p.name).length,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذّر النقل" };
  }
}
