"use client";

import * as React from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";

/** Full-screen IDE layout — no sidebar, no AppShell padding. */
export default function IDELayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
