import { ReactNode } from "react";

import { RoleGuard } from "@/components/auth/RoleGuard";

export default function DriverLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard
      allowedRoles={["driver"]}
    >
      {children}
    </RoleGuard>
  );
}