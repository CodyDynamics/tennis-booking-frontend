"use client";

import { useState } from "react";
import { useOrganizations } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { AdminFilter, AdminTable } from "../components";
import { Loader2 } from "lucide-react";
import type { OrganizationApi } from "@/lib/api/endpoints/organizations";

export default function AdminOrganizationsPage() {
  const [search, setSearch] = useState("");
  const { data: organizations = [], isLoading } = useOrganizations();

  const filtered = organizations.filter(
    (o) =>
      !search.trim() ||
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      (o.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Organizations</h1>

      <AdminFilter
        title="Filters"
        description="Filter by name or description"
        searchPlaceholder="Search by name or description..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      <Card>
        <CardContent className="pt-6">
          <AdminTable<OrganizationApi>
            data={filtered}
            keyExtractor={(o) => o.id}
            emptyMessage="No organizations found."
            isLoading={isLoading}
            loadingNode={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
            columns={[
              { key: "name", label: "Name", render: (o) => <span className="font-medium">{o.name}</span> },
              { key: "description", label: "Description", render: (o) => o.description ?? "—" },
              { key: "status", label: "Status", render: (o) => o.status ?? "—" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
