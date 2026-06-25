"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { getUser, homeForRole } from "@/lib/auth";

export default function RootPage() {
  const router = useRouter();

  React.useEffect(() => {
    const user = getUser();
    router.replace(user ? homeForRole(user.role) : "/login");
  }, [router]);

  return (
    <Box
      sx={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}
      role="status"
      aria-label="Loading"
    >
      <CircularProgress />
    </Box>
  );
}
