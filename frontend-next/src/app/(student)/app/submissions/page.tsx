"use client";

import * as React from "react";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Link from "@mui/material/Link";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import api from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedButtons } from "@/components/ui/SegmentedButtons";
import { VerdictChip } from "@/components/ui/VerdictChip";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { languageName } from "@/lib/languages";

interface SubmissionRow {
  id: string;
  verdict: string;
  language: string;
  runtime: number | null;
  memory: number | null;
  submitted_at: string;
  problem_title: string;
  problem_id: string;
}

const FILTERS = ["all", "accepted", "failed"] as const;
type Filter = (typeof FILTERS)[number];

function whenLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SubmissionsPage() {
  const [subs, setSubs] = React.useState<SubmissionRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [filter, setFilter] = React.useState<Filter>("all");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get<{ success: boolean; data: SubmissionRow[] }>(
        "/api/submissions",
      );
      if (res.data?.success) setSubs(res.data.data ?? []);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = subs.filter((s) =>
    filter === "all"
      ? true
      : filter === "accepted"
        ? s.verdict === "Accepted"
        : s.verdict !== "Accepted",
  );

  const acCount = subs.filter((s) => s.verdict === "Accepted").length;

  return (
    <Box>
      <PageHeader
        title="My Submissions"
        subtitle={
          loading
            ? "Loading your submission history…"
            : `Your last ${subs.length} submission${subs.length !== 1 ? "s" : ""} · ${acCount} accepted`
        }
      />

      <Box sx={{ mb: 3 }}>
        <SegmentedButtons<Filter>
          value={filter}
          onChange={setFilter}
          segments={FILTERS.map((f) => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) }))}
          ariaLabel="Filter submissions by verdict"
        />
      </Box>

      {error ? (
        <Card variant="outlined" sx={{ borderColor: "outlineVariant" }}>
          <ErrorState
            title="Couldn't load your submissions"
            description="Check your connection and try again."
            onRetry={load}
          />
        </Card>
      ) : (
        <Card variant="outlined" sx={{ borderColor: "outlineVariant", overflow: "hidden" }}>
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table aria-label="Submission history" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow
                  sx={{ "& th": { color: "text.secondary", fontWeight: 600, borderColor: "outlineVariant" } }}
                >
                  <TableCell>Problem</TableCell>
                  <TableCell sx={{ width: 180 }}>Verdict</TableCell>
                  <TableCell sx={{ width: 120 }}>Language</TableCell>
                  <TableCell align="right" sx={{ width: 110 }}>Runtime</TableCell>
                  <TableCell align="right" sx={{ width: 150 }}>When</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton width="60%" /></TableCell>
                      <TableCell><Skeleton width={96} height={28} /></TableCell>
                      <TableCell><Skeleton width={56} /></TableCell>
                      <TableCell align="right"><Skeleton width={48} sx={{ ml: "auto" }} /></TableCell>
                      <TableCell align="right"><Skeleton width={80} sx={{ ml: "auto" }} /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ border: 0 }}>
                      <EmptyState
                        icon={<HistoryOutlinedIcon />}
                        title={
                          filter === "all"
                            ? "No submissions yet"
                            : `No ${filter} submissions`
                        }
                        description={
                          filter === "all"
                            ? "Solve a problem and your attempts will show up here."
                            : "Try a different filter."
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow
                      key={s.id}
                      hover
                      sx={{ "& td": { borderColor: "outlineVariant" }, "&:last-child td": { border: 0 } }}
                    >
                      <TableCell>
                        <Link
                          component={NextLink}
                          href={`/app/problems/${s.problem_id}`}
                          color="text.primary"
                          sx={{ fontWeight: 500, "&:hover": { color: "primary.main" } }}
                        >
                          {s.problem_title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <VerdictChip verdict={s.verdict} />
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary", fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
                        {languageName(s.language)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "text.secondary", fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
                        {s.runtime != null ? `${s.runtime} ms` : "—"}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "text.secondary", fontSize: 13 }}>
                        {whenLabel(s.submitted_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Box>
  );
}
