"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { Mail, X } from "lucide-react";

/**
 * The nudge for the accounts that have not set up email login yet.
 *
 * Email login is optional by decision, so this cannot be a wall — an account
 * without an address still signs in by phone and OTP, indefinitely. What it can
 * do is be visible: one line at the top of every screen, on every visit, until
 * the address is set.
 *
 * Dismissal is per session, not permanent. A permanent dismissal would quietly
 * defeat the whole point on the very accounts this exists for; closing it for
 * the current visit is enough to get it out of the way of a busy afternoon.
 */

const DISMISS_KEY = "zad_email_banner_dismissed";
const EVENT = "zad-email-banner";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function getSnapshot(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // Private windows and blocked site data throw on access. Being seen is the
    // whole point, so an unreadable store means «not dismissed».
    return false;
  }
}

/**
 * The server has no sessionStorage. Rendering «dismissed» there costs a small
 * pop-in after hydration; rendering «visible» would instead flash the banner at
 * everyone who had just closed it, which is the worse of the two.
 */
function getServerSnapshot(): boolean {
  return true;
}

export default function SetEmailBanner({ href }: { href: string }) {
  // External state, read through the store rather than copied into an effect —
  // the effect version renders the wrong answer first and corrects it.
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Not remembering the dismissal is harmless; it returns next visit.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  if (dismissed) return null;

  return (
    <div
      dir="rtl"
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl border
                 bg-amber-50 border-amber-200 text-amber-900
                 dark:bg-amber-500/10 dark:border-amber-500/25 dark:text-amber-200"
    >
      <Mail className="w-4 h-4 shrink-0" />

      <p className="text-[13px] font-bold leading-relaxed min-w-0">
        لم تحدّث بريدك الإلكتروني بعد.{" "}
        <span className="font-medium opacity-90">
          أضِفه مع كلمة مرور لتتمكن من الدخول بهما بدل رمز التحقق.
        </span>
      </p>

      <Link
        href={href}
        className="mr-auto shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-bold
                   bg-amber-600 text-white hover:bg-amber-700 transition-colors
                   dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-amber-950"
      >
        تحديث البريد
      </Link>

      <button
        type="button"
        onClick={dismiss}
        aria-label="إخفاء التنبيه"
        className="shrink-0 p-1 rounded-md hover:bg-amber-900/10 dark:hover:bg-white/10 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
