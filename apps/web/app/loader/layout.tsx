import { ReactNode } from "react";

import { RoleGuard } from "@/components/auth/RoleGuard";

export default function LoaderLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard
      allowedRoles={["loader"]}
    >
      {children}
    </RoleGuard>
  );
}