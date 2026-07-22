"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AutoRedirectCharitySize({ charityName }: { charityName: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const forceSelect = searchParams.get("change_size");
    const savedSize = localStorage.getItem(`preferredCharitySize_${charityName}`);

    if (savedSize && !forceSelect) {
      router.replace(`/portal/${encodeURIComponent(charityName)}/governance/standards?size=${savedSize}`);
    }
  }, [charityName, router, searchParams]);

  return null;
}
