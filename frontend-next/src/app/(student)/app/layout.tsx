"use client";

import * as React from "react";
import SpaceDashboardOutlinedIcon from "@mui/icons-material/SpaceDashboardOutlined";
import CodeOutlinedIcon from "@mui/icons-material/CodeOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import LeaderboardOutlinedIcon from "@mui/icons-material/LeaderboardOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppShell, type NavItem } from "@/components/shell/AppShell";

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/app/dashboard", icon: <SpaceDashboardOutlinedIcon /> },
  { label: "Problems", href: "/app/problems", icon: <CodeOutlinedIcon /> },
  { label: "Contests", href: "/app/contests", icon: <EmojiEventsOutlinedIcon /> },
  { label: "Assignments", href: "/app/assignments", icon: <AssignmentOutlinedIcon /> },
  { label: "Aptitude", href: "/app/aptitude", icon: <PsychologyOutlinedIcon /> },
  { label: "My Classes", href: "/app/classes", icon: <SchoolOutlinedIcon /> },
  { label: "Coding Profiles", href: "/app/coding-profiles", icon: <HubOutlinedIcon /> },
  { label: "Placement", href: "/app/placement", icon: <WorkOutlineOutlinedIcon /> },
  { label: "Leaderboard", href: "/app/leaderboard", icon: <LeaderboardOutlinedIcon /> },
  { label: "Submissions", href: "/app/submissions", icon: <HistoryOutlinedIcon /> },
  { label: "AI Tutor", href: "/app/ai-tutor", icon: <SmartToyOutlinedIcon /> },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell navItems={NAV_ITEMS} profileHref="/app/profile">
        {children}
      </AppShell>
    </AuthGuard>
  );
}
