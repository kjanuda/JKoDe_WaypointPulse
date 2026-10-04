import { ReactNode } from "react";

import { RoleGuard } from "@/components/auth/RoleGuard";

export default function StoreLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoleGuard
      allowedRoles={["store"]}
    >
      {children}
    </RoleGuard>
  );
}