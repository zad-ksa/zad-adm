"use client";

import { useEffect, useState } from "react";
import LandingView from "@/components/landing/LandingView";
import {
  LANDING_PREVIEW_MESSAGE,
  normalizeLandingConfig,
  type LandingConfig,
} from "@/lib/landing";

/**
 * صفحة المعاينة الحية داخل iframe للمحرّر. تبدأ بالإعداد المحفوظ، ثم تستقبل
 * مسودّة المحرّر عبر postMessage (من نفس الأصل فقط) وتعيد الرسم فوراً بلا حفظ.
 */
export default function LandingPreviewClient({ initialConfig }: { initialConfig: LandingConfig }) {
  const [config, setConfig] = useState<LandingConfig>(initialConfig);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const data = e.data;
      if (!data || data.type !== LANDING_PREVIEW_MESSAGE || !data.config) return;
      try {
        setConfig(normalizeLandingConfig(data.config));
      } catch {
        /* تجاهل مسودّة تالفة */
      }
    }
    window.addEventListener("message", onMessage);
    // إعلام المحرّر بأن الإطار جاهز لاستقبال المسودّة الحالية.
    try {
      window.parent?.postMessage({ type: `${LANDING_PREVIEW_MESSAGE}-ready` }, window.location.origin);
    } catch {
      /* ignore */
    }
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return <LandingView config={config} />;
}
