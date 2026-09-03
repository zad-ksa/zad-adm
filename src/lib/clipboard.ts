/**
 * Copy text to the clipboard, with a fallback for insecure contexts.
 *
 * The async Clipboard API needs a secure context — true in production and on
 * localhost, false on a plain-http staging host. Without the fallback the
 * button would be silently dead in exactly the place it gets tested.
 *
 * Returns whether the copy actually happened, so the caller can say so rather
 * than claim success it cannot verify.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Denied or unavailable — fall through to the legacy path.
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
