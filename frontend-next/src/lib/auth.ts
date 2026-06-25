import type { Role, User } from "./types";

/**
 * Session helpers over the same localStorage contract used by the existing app:
 * `accessToken`, `refreshToken`, and `user` (JSON). No behavior change — purely
 * a typed wrapper so components don't hand-roll JSON.parse everywhere.
 */

const isBrowser = () => typeof window !== "undefined";

export function getUser(): User | null {
  if (!isBrowser()) return null;
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function getRole(): Role | null {
  return getUser()?.role ?? null;
}

export function isAuthenticated(): boolean {
  return getUser() != null;
}

export function setSession(opts: {
  accessToken: string;
  refreshToken: string;
  user: User;
}): void {
  if (!isBrowser()) return;
  localStorage.setItem("accessToken", opts.accessToken);
  localStorage.setItem("refreshToken", opts.refreshToken);
  localStorage.setItem("user", JSON.stringify(opts.user));
}

export function clearSession(): void {
  if (!isBrowser()) return;
  localStorage.clear();
}

/** Default landing route for a role — mirrors the old App.tsx redirects. */
export function homeForRole(role: Role | null | undefined): string {
  return role === "faculty" || role === "admin"
    ? "/faculty/dashboard"
    : "/app/dashboard";
}
