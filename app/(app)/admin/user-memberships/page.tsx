"use client";

import { useUsers } from "@/lib/queries";
import { AdminTable } from "../components";
import type { UserApi } from "@/lib/api/endpoints/users";

export default function AdminUserMembershipPage() {
  const { data: users = [], isLoading } = useUsers({ onlyMembership: true });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">User Membership</h1>
      <AdminTable<UserApi>
        data={users}
        keyExtractor={(u) => u.id}
        emptyMessage="No membership users found."
        isLoading={isLoading}
        columns={[
          { key: "lastName", label: "Last Name", render: (u) => u.lastName ?? "—" },
          { key: "firstName", label: "First Name", render: (u) => u.firstName ?? "—" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone", render: (u) => u.phone ?? "—" },
          { key: "homeAddress", label: "Address", render: (u) => u.homeAddress ?? "—" },
          { key: "status", label: "Status" },
        ]}
      />
    </div>
  );
}
