"use client";

import { useEffect, useState } from "react";
import { Toast, type ToastMessage } from "./Toast";
import { subscribeToToasts } from "./toastBus";

/**
 * مُضيف التنبيهات — يُركَّب مرةً واحدة في جذر التطبيق.
 *
 * يسمع نداءات `notify()` من أي مكانٍ في الموقع ويعرض آخرها. وواحدةٌ في وقتٍ
 * واحد تكفي: هذه المسارات لا تُنتج رسالتين معاً، وطابورٌ لرسالةٍ واحدة تعقيدٌ
 * بلا سبب.
 *
 * والخطأ يبقى حتى يُغلقه صاحبه، وغيره يختفي بعد أربع ثوانٍ — كما في `useToast`.
 */
export default function ToastHost() {
  const [toast, setToast] = useState<ToastMessage>(null);

  useEffect(() => {
    return subscribeToToasts((request) => setToast({ tone: request.tone, text: request.text }));
  }, []);

  useEffect(() => {
    if (!toast || toast.tone === "error") return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  return <Toast toast={toast} onDismiss={() => setToast(null)} />;
}
