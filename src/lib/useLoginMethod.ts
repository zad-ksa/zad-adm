"use client";

import { useSyncExternalStore, useCallback } from "react";

/**
 * Which door the person used last, remembered per DEVICE.
 *
 * Not stored on the account, for two reasons. It is read BEFORE anyone signs
 * in, when there is no account to read it from; and someone who uses OTP on
 * their phone and a password on their desktop should find each device the way
 * they left it, rather than have the two fight over one stored value.
 *
 * useSyncExternalStore rather than an effect: the value is external state, and
 * reading it in an effect would render the wrong tab first and then correct it.
 */

const STORAGE_KEY = "zad_login_method";

export type LoginMethod = "email" | "otp";

function subscribe(onChange: () => void) {
  // Also fires when the other tab changes it, so two open tabs agree.
  window.addEventListener("storage", onChange);
  window.addEventListener("zad-login-method", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("zad-login-method", onChange);
  };
}

function getSnapshot(): LoginMethod {
  try {
    return localStorage.getItem(STORAGE_KEY) === "email" ? "email" : "otp";
  } catch {
    // Private windows and blocked site data throw on access rather than
    // returning null. OTP is the safe default: it works for every account,
    // while email login only works once someone has set one up.
    return "otp";
  }
}

/** The server has no localStorage, so it always renders the default door. */
function getServerSnapshot(): LoginMethod {
  return "otp";
}

export function useLoginMethod(): [LoginMethod, (next: LoginMethod) => void] {
  const method = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setMethod = useCallback((next: LoginMethod) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Remembering is a convenience; failing to remember must not block login.
    }
    window.dispatchEvent(new Event("zad-login-method"));
  }, []);

  return [method, setMethod];
}
