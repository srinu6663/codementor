"use client";

import * as React from "react";
import SpaceDashboardOutlinedIcon from "@mui/icons-material/SpaceDashboardOutlined";
import CodeOutlinedIcon from "@mui/icons-material/CodeOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import QuizOutlinedIcon from "@mui/icons-material/QuizOutlined";
import PolicyOutlinedIcon from "@mui/icons-material/PolicyOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import MonitorHeartOutlinedIcon from "@mui/icons-material/MonitorHeartOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { getRole } from "@/lib/auth";

const BASE_NAV: NavItem[] = [
  { label: "Dashboard", href: "/faculty/dashboard", icon: <SpaceDashboardOutlinedIcon /> },
  { label: "Problems", href: "/faculty/problems", icon: <CodeOutlinedIcon /> },
  { label: "Classes", href: "/faculty/classes", icon: <SchoolOutlinedIcon /> },
  { label: "MCQ Tests", href: "/faculty/mcq", icon: <QuizOutlinedIcon /> },
  { label: "Plagiarism", href: "/faculty/plagiarism", icon: <PolicyOutlinedIcon /> },
  { label: "Judge Health", href: "/faculty/judge-health", icon: <MonitorHeartOutlinedIcon /> },
  { label: "Permissions", href: "/faculty/permissions", icon: <AdminPanelSettingsOutlinedIcon /> },
];

// Admin-only navigation, appended when the signed-in user is an admin.
const ADMIN_NAV: NavItem[] = [
  { label: "Audit Log", href: "/faculty/audit-logs", icon: <ReceiptLongOutlinedIcon /> },
];

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const [navItems, setNavItems] = React.useState<NavItem[]>(BASE_NAV);

  React.useEffect(() => {
    if (getRole() === "admin") setNavItems([...BASE_NAV, ...ADMIN_NAV]);
  }, []);

  return (
    <AuthGuard roles={["faculty", "admin"]}>
      <AppShell navItems={navItems} profileHref="/app/profile">
        {children}
      </AppShell>
    </AuthGuard>
  );
}
