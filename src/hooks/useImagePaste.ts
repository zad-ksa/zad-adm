"use client";

import { useEffect } from "react";

export function useImagePaste(
  onPaste: (file: File) => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            onPaste(file);
            return;
          }
        }
      }
    };

    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [onPaste, enabled]);
}
