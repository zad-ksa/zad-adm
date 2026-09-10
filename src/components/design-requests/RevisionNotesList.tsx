import LinkifiedText from "@/components/ui/LinkifiedText";

/**
 * The charity's revision notes, shown as the numbered list they were written as.
 *
 * RequestRevisionModal collects up to three separate notes and joins them with
 * a blank line, precisely so each stays a distinct instruction. Rendering the
 * joined string as one block threw that structure away and left the designer
 * reading a paragraph to work out where one request ended and the next began.
 * Splitting on the same blank line puts it back.
 *
 * Degrades honestly: a single note renders as a single labelled item, and text
 * that was never written in this format still shows in full rather than being
 * reshaped into something it is not.
 */

const ORDINALS = [
  "الأولى",
  "الثانية",
  "الثالثة",
  "الرابعة",
  "الخامسة",
  "السادسة",
  "السابعة",
  "الثامنة",
];

export function splitRevisionNotes(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function RevisionNotesList({
  notes,
  tone = "charity",
}: {
  notes: string;
  /** charity = the charity's notes to Zad; staff = Zad's notes back. */
  tone?: "charity" | "staff";
}) {
  const items = splitRevisionNotes(notes);
  if (items.length === 0) return null;

  const accent =
    tone === "staff"
      ? "text-primary dark:text-teal-400"
      : "text-amber-700 dark:text-amber-400";
  const chip =
    tone === "staff"
      ? "bg-primary/10 text-primary dark:bg-teal-500/15 dark:text-teal-300"
      : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";

  // One note needs no numbering — calling it "الملاحظة الأولى" implies a
  // second one that was never written.
  if (items.length === 1) {
    return (
      <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
        <LinkifiedText text={items[0]} />
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {items.map((note, i) => (
        <li
          key={i}
          className="rounded-xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/60 px-3 py-2.5"
        >
          <span className="flex items-center gap-2 mb-1">
            <span
              className={`shrink-0 w-5 h-5 rounded-md text-[11px] font-black inline-flex items-center justify-center tabular-nums ${chip}`}
            >
              {i + 1}
            </span>
            <span className={`text-[11px] font-black ${accent}`}>
              الملاحظة {ORDINALS[i] ?? i + 1}
            </span>
          </span>
          <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap pr-7">
            <LinkifiedText text={note} />
          </p>
        </li>
      ))}
    </ol>
  );
}
