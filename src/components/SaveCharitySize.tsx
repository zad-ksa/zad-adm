"use client";

import { useEffect } from "react";

export default function SaveCharitySize({ charityName, size }: { charityName: string; size: string }) {
  useEffect(() => {
    localStorage.setItem(`preferredCharitySize_${charityName}`, size);
  }, [charityName, size]);

  return null;
}
