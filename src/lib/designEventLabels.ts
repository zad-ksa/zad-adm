/**
 * The vocabulary of the design-request history — and nothing else.
 *
 * Split out from designRequestLog.ts because that module imports the Prisma
 * client, and the timeline that renders these labels is a client component.
 * Importing the writer to reach the labels dragged the database driver into the
 * browser bundle, where `pg` fails to resolve `dns` and the build stops.
 *
 * Kept free of any server import for that reason. Both sides may read it.
 */

export type DesignEventKind =
  | "CREATED"
  | "APPROVED"
  | "REJECTED"
  | "RESUBMITTED"
  | "EDITED"
  | "RESCHEDULED"
  | "QUEUE_REORDERED"
  | "EXTENDED"
  | "STARTED"
  | "DELIVERED"
  | "REVISION_REQUESTED"
  | "CHARITY_APPROVED"
  | "AUTO_APPROVED"
  | "COMPLETED";

/** Arabic label per event, used by both dashboards. */
export const DESIGN_EVENT_LABEL: Record<DesignEventKind, string> = {
  CREATED: "رُفع الطلب",
  APPROVED: "اعتُمد الطلب ودخل الطابور",
  REJECTED: "رُفض الطلب",
  RESUBMITTED: "أُعيد رفع الطلب بعد الرفض",
  EDITED: "عُدِّل الطلب",
  RESCHEDULED: "أُعيدت جدولة الطلب",
  QUEUE_REORDERED: "أُعيد ترتيب طابور الجمعية",
  EXTENDED: "مُددت المدة",
  STARTED: "بدأ التنفيذ",
  DELIVERED: "سُلّم بانتظار ردّ الجمعية",
  REVISION_REQUESTED: "أعادته الجمعية بملاحظات",
  CHARITY_APPROVED: "اعتمدته الجمعية",
  AUTO_APPROVED: "اعتُمد تلقائياً بعد ٢٤ ساعة",
  COMPLETED: "أُغلق نهائياً",
};
