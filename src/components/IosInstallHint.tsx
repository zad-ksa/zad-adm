"use client";

import { useSyncExternalStore } from "react";
import { Share, Plus, X } from "lucide-react";

const DISMISS_KEY = "zad_ios_install_hint_dismissed";

/**
 * Tells iPhone and iPad visitors how to add the site to their home screen.
 *
 * Android shows its own install prompt from the manifest, and Chrome fires
 * `beforeinstallprompt` so a button can trigger it. Safari does neither — Apple
 * gives sites no way to ask — so on iOS the only route is telling the person
 * which two taps to make. That makes this hint part of the install path rather
 * than a nag, which is also why it only ever renders on iOS Safari.
 *
 * Visibility is read through useSyncExternalStore rather than set from an
 * effect: every input (user agent, display mode, localStorage) exists only in
 * the browser, and the server snapshot of `false` keeps the markup identical on
 * both sides so hydration stays quiet.
 */

let listeners: (() => void)[] = [];

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  return () => {
    listeners = listeners.filter((l) => l !== onChange);
  };
}

function emit() {
  for (const l of listeners) l();
}

function shouldShow(): boolean {
  if (localStorage.getItem(DISMISS_KEY) === "1") return false;

  const ua = navigator.userAgent;

  // iPadOS 13+ reports a Mac user agent, so touch points are what separate an
  // iPad from a desktop Safari.
  const isIos =
    /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (!isIos) return false;

  // Chrome, Firefox and Edge on iOS cannot add to the home screen at all —
  // showing them Safari's steps would just be wrong.
  if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return false;

  const installed =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return !installed;
}

function serverSnapshot(): boolean {
  return false;
}

export default function IosInstallHint() {
  const show = useSyncExternalStore(subscribe, shouldShow, serverSnapshot);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    emit();
  }

  return (
    <div
      dir="rtl"
      className="relative z-10 mx-auto mt-10 max-w-lg rounded-2xl border border-slate-200 bg-white/80 p-4 text-right shadow-lg backdrop-blur-xl dark:border-white/15 dark:bg-white/10"
    >
      <button
        onClick={dismiss}
        aria-label="إخفاء الإرشاد"
        className="absolute left-3 top-3 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="mb-2 pl-8 text-sm font-bold text-slate-800 dark:text-white">
        ثبّت زاد على شاشتك الرئيسية
      </p>
      <p className="mb-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        يفتح حينها كتطبيق كامل، بلا شريط عنوان المتصفح.
      </p>

      <ol className="flex flex-col gap-2 text-xs text-slate-700 dark:text-slate-200">
        <li className="flex items-center gap-2">
          <Share className="h-4 w-4 shrink-0 text-primary dark:text-teal-400" />
          <span>
            اضغط زر <b>المشاركة</b> في شريط Safari بالأسفل
          </span>
        </li>
        <li className="flex items-center gap-2">
          <Plus className="h-4 w-4 shrink-0 text-primary dark:text-teal-400" />
          <span>
            ثم اختر <b>إضافة إلى الشاشة الرئيسية</b>
          </span>
        </li>
      </ol>
    </div>
  );
}
