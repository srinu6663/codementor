"use client";

import * as React from "react";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import PolicyOutlinedIcon from "@mui/icons-material/PolicyOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import { BarChart } from "@mui/x-charts/BarChart";
import api from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/States";

interface OverviewRow {
  id: string;
  title: string;
  deadline: string;
  pairs: number;
  avgSim: number;
  maxSim: number;
  lastRan: string | null;
}

function simColor(s: number) {
  if (s >= 90) return "error.main";
  if (s >= 75) return "warning.main";
  if (s > 0) return "primary.main";
  return "text.secondary";
}

export default function FacultyPlagiarismOverviewPage() {
  const [rows, setRows] = React.useState<OverviewRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api
      .get("/api/faculty/plagiarism-overview")
      .then((r) => {
        if (r.data?.success) setRows(r.data.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalPairs = rows.reduce((s, r) => s + r.pairs, 0);
  const scanned = rows.filter((r) => r.lastRan).length;
  const chartRows = rows.filter((r) => r.lastRan);

  return (
    <Box>
      <PageHeader
        title="Plagiarism"
        subtitle="Run JPlag token/structure-based detection on an assignment's submissions and review similarity analytics."
      />

      {loading ? (
        <Stack spacing={2}>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="rounded" height={72} />)}</Stack>
      ) : rows.length === 0 ? (
        <Card variant="outlined" sx={{ borderColor: "outlineVariant" }}>
          <EmptyState icon={<PolicyOutlinedIcon />} title="No assignments yet" description="Create one to run plagiarism checks." />
        </Card>
      ) : (
        <Stack spacing={3}>
          {scanned > 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 2fr" }, gap: 3 }}>
              <Stack spacing={2}>
                <StatCard icon={<PolicyOutlinedIcon />} label="Flagged pairs (all)" value={totalPairs} accent="error" />
                <StatCard icon={<PolicyOutlinedIcon />} label="Assignments scanned" value={`${scanned}/${rows.length}`} accent="primary" />
              </Stack>
              <Card variant="outlined" sx={{ borderColor: "outlineVariant" }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <LocalFireDepartmentIcon sx={{ color: "error.main", fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={600}>Flagged pairs by assignment</Typography>
                  </Stack>
                  {chartRows.length === 0 ? (
                    <EmptyState title="No scans yet" />
                  ) : (
                    <BarChart
                      height={240}
                      xAxis={[{ scaleType: "band", data: chartRows.map((r) => (r.title.length > 14 ? r.title.slice(0, 13) + "…" : r.title)) }]}
                      series={[
                        { data: chartRows.map((r) => r.pairs), label: "Flagged pairs" },
                        { data: chartRows.map((r) => Math.round(r.maxSim)), label: "Max similarity %" },
                      ]}
                      margin={{ top: 10, bottom: 24, left: 40, right: 10 }}
                    />
                  )}
                </CardContent>
              </Card>
            </Box>
          )}

          <Stack spacing={1.5}>
            {rows.map((a) => (
              <Card
                key={a.id}
                variant="outlined"
                component={NextLink}
                href={`/faculty/assignments/${a.id}/plagiarism`}
                sx={{
                  borderColor: "outlineVariant",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "border-color 150ms",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, "&:last-child": { pb: 2 } }}>
                  <PolicyOutlinedIcon sx={{ color: "text.secondary", flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={500} noWrap>{a.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {a.lastRan ? `Last scan ${new Date(a.lastRan).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "Not scanned yet"}
                    </Typography>
                  </Box>
                  {a.lastRan && (
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexShrink: 0 }}>
                      <Typography variant="caption" color="text.secondary">{a.pairs} pair{a.pairs === 1 ? "" : "s"}</Typography>
                      {a.pairs > 0 && (
                        <Chip size="small" label={`${a.maxSim.toFixed(0)}% max`} sx={{ height: 22, fontWeight: 700, color: simColor(a.maxSim), bgcolor: "surfaceContainerHigh" }} />
                      )}
                    </Stack>
                  )}
                  <ChevronRightIcon sx={{ color: "text.secondary", flexShrink: 0 }} />
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Stack>
      )}
    </Box>
  );
}
