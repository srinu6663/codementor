"use client";

import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

export interface Segment<T extends string> {
  value: T;
  label: string;
}

/**
 * M3 segmented buttons (single-select). Thin wrapper over ToggleButtonGroup so
 * a `null` deselect never clears the value — one option is always active.
 */
export function SegmentedButtons<T extends string>({
  value,
  onChange,
  segments,
  ariaLabel,
  size = "small",
}: {
  value: T;
  onChange: (value: T) => void;
  segments: Segment<T>[];
  ariaLabel: string;
  size?: "small" | "medium" | "large";
}) {
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      size={size}
      onChange={(_, v: T | null) => {
        if (v !== null) onChange(v);
      }}
      aria-label={ariaLabel}
    >
      {segments.map((s) => (
        <ToggleButton key={s.value} value={s.value}>
          {s.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
