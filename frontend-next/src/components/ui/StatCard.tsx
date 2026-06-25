"use client";

import * as React from "react";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";

type Accent = "primary" | "secondary" | "tertiary" | "success" | "warning" | "error";

/** Compact metric card: an icon in a tonal container plus a value and label. */
export function StatCard({
  icon,
  label,
  value,
  helper,
  accent = "primary",
  loading = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
  accent?: Accent;
  loading?: boolean;
}) {
  const containerKey =
    accent === "tertiary"
      ? { bg: "tertiaryContainer", fg: "onTertiaryContainer" }
      : accent === "success"
        ? { bg: "successContainer", fg: "onSuccessContainer" }
        : accent === "warning"
          ? { bg: "warningContainer", fg: "onWarningContainer" }
          : accent === "error"
            ? { bg: "errorContainer", fg: "onErrorContainer" }
            : accent === "secondary"
              ? { bg: "secondaryContainer", fg: "onSecondaryContainer" }
              : { bg: "primaryContainer", fg: "onPrimaryContainer" };

  return (
    <Card variant="outlined" sx={{ p: 2.5, borderColor: "outlineVariant", height: "100%" }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          aria-hidden
          sx={{
            width: 48,
            height: 48,
            borderRadius: 3,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            bgcolor: containerKey.bg,
            color: containerKey.fg,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
            {label}
          </Typography>
          {loading ? (
            <Skeleton width={64} height={32} />
          ) : (
            <Typography variant="h5" fontWeight={600} sx={{ lineHeight: 1.2 }}>
              {value}
            </Typography>
          )}
          {helper && (
            <Typography variant="caption" color="text.secondary">
              {helper}
            </Typography>
          )}
        </Box>
      </Stack>
    </Card>
  );
}
