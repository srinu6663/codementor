"use client";

import Chip from "@mui/material/Chip";

type Tone = "success" | "warning" | "error" | "default";

function toneFor(difficulty: string): Tone {
  switch (difficulty?.toLowerCase()) {
    case "easy":
      return "success";
    case "medium":
      return "warning";
    case "hard":
      return "error";
    default:
      return "default";
  }
}

// Palette role keys (resolved to scheme-aware CSS variables by the MUI system).
const TONE_COLORS: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: "successContainer", fg: "onSuccessContainer" },
  warning: { bg: "warningContainer", fg: "onWarningContainer" },
  error: { bg: "errorContainer", fg: "onErrorContainer" },
  default: { bg: "surfaceContainerHigh", fg: "onSurfaceVariant" },
};

/**
 * M3 tonal chip for problem difficulty. Conveys meaning with text (always
 * visible) plus color — never color alone — for WCAG compliance.
 */
export function DifficultyChip({ difficulty, size = "small" }: { difficulty: string; size?: "small" | "medium" }) {
  const { bg, fg } = TONE_COLORS[toneFor(difficulty)];
  return (
    <Chip label={difficulty || "—"} size={size} sx={{ bgcolor: bg, color: fg, fontWeight: 500 }} />
  );
}
