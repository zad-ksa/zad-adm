"use client";

import { useEffect } from "react";

export default function SaveCharitySize({ charityName, size }: { charityName: string; size: string }) {
  useEffect(() => {
    localStorage.setItem(`preferredCharitySize_${charityName}`, size);
    document.cookie = `preferredCharitySize_${encodeURIComponent(charityName)}=${size}; path=/; max-age=31536000`;
  }, [charityName, size]);

  return null;
}
