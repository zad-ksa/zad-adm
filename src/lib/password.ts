import { hash, compare } from "bcryptjs";

/**
 * Passwords and login emails — one place, so hashing, comparison and validation
 * cannot drift between the six screens that touch them.
 */

const BCRYPT_ROUNDS = 10;

export const MIN_PASSWORD_LENGTH = 8;

/**
 * A real bcrypt hash of a random string nobody holds.
 *
 * Compared against when the email is not registered, so a request for an
 * unknown address costs the same ~80ms as one for a known address. Without it
 * the response time alone tells an attacker which emails exist — the generic
 * error message would be undone by the clock.
 */
const DECOY_HASH = "$2b$10$9HKaUMxu2PY7UPUHnPz7nO6amT7Ryc4fi0w3kOBgxIYq68DqrRu3C";

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_ROUNDS);
}

/**
 * Always does the bcrypt work, even when there is no hash to check against, so
 * "no such account" and "wrong password" take the same time.
 */
export async function verifyPassword(plain: string, stored: string | null | undefined): Promise<boolean> {
  const ok = await compare(plain, stored || DECOY_HASH);
  return stored ? ok : false;
}

/** Returns an Arabic message, or null when the password is acceptable. */
export function validatePassword(plain: string): string | null {
  if (!plain || plain.length < MIN_PASSWORD_LENGTH) {
    return `كلمة المرور يجب ألا تقل عن ${MIN_PASSWORD_LENGTH} أحرف`;
  }
  if (plain.length > 72) {
    // bcrypt silently ignores bytes past 72, which would make a long password
    // weaker than its owner believes.
    return "كلمة المرور طويلة جدًا (الحد ٧٢ حرفًا)";
  }
  return null;
}

/** Lower-cased and trimmed — the stored form, and the form to look up by. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/**
 * Email and password are meaningless one without the other: an address with no
 * hash opens nothing, and a hash with no address cannot be reached. Accepting
 * half would leave someone believing they had set up email login.
 *
 * The asymmetry below is deliberate and is a security rule, not a nicety.
 *
 * Twelve staff accounts carry a bcrypt hash from the old phone+password login:
 * set years ago by an administrator, never used to sign in, and remembered by
 * nobody. They are inert only because no address points at them — login looks
 * up by email. So ADDING an address to such an account would quietly arm it
 * with a password its owner does not know and never chose, and whoever typed
 * it back then still might.
 *
 * Therefore: turning email login ON always requires a fresh password. Only an
 * account that already HAS working email login — address and hash together,
 * both set by its owner — may change one half alone.
 *
 * Returns an Arabic message, or null when the pair is coherent.
 */
export function validateCredentialPair(
  email: string | null | undefined,
  password: string | null | undefined,
  { hasExistingEmail = false, hasExistingPassword = false } = {}
): string | null {
  const wantsEmail = !!email?.trim();
  const wantsPassword = !!password?.trim();

  if (wantsEmail && !isValidEmail(normalizeEmail(email!))) {
    return "صيغة البريد الإلكتروني غير صحيحة";
  }
  if (wantsPassword) {
    const problem = validatePassword(password!.trim());
    if (problem) return problem;
  }

  // A stored hash counts only when an address already points at it. See above.
  const emailLoginActive = hasExistingEmail && hasExistingPassword;

  if (wantsEmail && !wantsPassword && !emailLoginActive) {
    return "يرجى إدخال كلمة مرور مع البريد الإلكتروني";
  }
  if (wantsPassword && !wantsEmail && !hasExistingEmail) {
    return "يرجى إدخال البريد الإلكتروني مع كلمة المرور";
  }
  return null;
}
