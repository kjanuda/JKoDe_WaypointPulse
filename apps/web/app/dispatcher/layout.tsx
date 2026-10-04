import { ReactNode } from "react";

import { RoleGuard } from "@/components/auth/RoleGuard";

export default function DispatcherLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard
      allowedRoles={["dispatcher"]}
    >
      {children}
    </RoleGuard>
  );
}