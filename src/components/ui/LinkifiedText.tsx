import type { ReactNode } from "react";

/**
 * Renders free text with any URL turned into a clickable link.
 *
 * Used for notes people type — design revision notes, delivery notes — where a
 * link is often the whole point ("see this reference") and pasting it as dead
 * text means retyping it into the address bar by hand.
 *
 * Plain text, not innerHTML: React still escapes every text node here, so this
 * carries no injection risk from what a charity or staff member typed.
 */

const URL_PATTERN = /(https?:\/\/[^\s<>"'()]+|www\.[^\s<>"'()]+)/gi;

/**
 * A URL at the end of a sentence usually drags its punctuation along —
 * "see this: https://x.com/a." should link to /a, not /a. with the full stop
 * baked into the href.
 */
const TRAILING_PUNCTUATION = /[.,!?;:)\]}»،؛]+$/;

function splitTrailingPunctuation(raw: string): { url: string; trail: string } {
  const trailMatch = raw.match(TRAILING_PUNCTUATION);
  if (!trailMatch) return { url: raw, trail: "" };
  return { url: raw.slice(0, trailMatch.index), trail: trailMatch[0] };
}

export default function LinkifiedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const start = match.index ?? 0;
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));

    const { url, trail } = splitTrailingPunctuation(raw);
    const href = url.startsWith("http") ? url : `https://${url}`;

    nodes.push(
      <a
        key={key++}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-dotted underline-offset-2 break-all hover:text-primary dark:hover:text-teal-400"
      >
        {url}
      </a>
    );
    if (trail) nodes.push(trail);

    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return <span className={className}>{nodes}</span>;
}
