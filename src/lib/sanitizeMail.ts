import sanitizeHtml from "sanitize-html";

const MAX_BODY_LENGTH = 200_000;

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "div", "span", "strong", "b", "em", "i", "u", "s",
    "ul", "ol", "li", "blockquote", "a", "h2", "h3", "hr", "code", "pre",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    "*": ["dir"],
    span: ["style"],
    p: ["style"],
    li: ["style"],
  },
  allowedClasses: {
    div: ["mail-quote"],
    p: ["mail-quote-head"],
  },
  allowedStyles: {
    "*": {
      "font-size": [/^\d+(?:\.\d+)?(px|rem|em)$/],
      "text-align": [/^(left|right|center|justify)$/],
    },
  },
  allowedSchemes: ["http", "https", "mailto"],
  disallowedTagsMode: "discard",
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
  },
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isHtmlBody(body: string): boolean {
  return /<[a-z][\s\S]*>/i.test(body);
}

/**
 * Sanitizes a mail body for safe storage/rendering via dangerouslySetInnerHTML.
 * Legacy rows saved before the rich-text editor was introduced are plain text
 * with literal "\n" line breaks — those are escaped and converted, not parsed as HTML.
 */
export function sanitizeMailHtml(body: string | null | undefined): string {
  if (!body) return "";
  const truncated = body.length > MAX_BODY_LENGTH ? body.slice(0, MAX_BODY_LENGTH) : body;

  if (!isHtmlBody(truncated)) {
    return escapeHtml(truncated).replace(/\n/g, "<br/>");
  }

  return sanitizeHtml(truncated, SANITIZE_OPTIONS);
}
