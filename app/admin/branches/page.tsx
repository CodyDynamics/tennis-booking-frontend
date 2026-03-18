"use client";

import { useState } from "react";
import { useBranches, useOrganizations } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { AdminFilter, AdminTable } from "../components";
import { Loader2 } from "lucide-react";
import type { BranchApi } from "@/lib/api/endpoints/branches";

export default function AdminBranchesPage() {
  const [search, setSearch] = useState("");
  const { data: branches = [], isLoading } = useBranches();
  const { data: organizations = [] } = useOrganizations();

  const filtered = branches.filter(
    (b) =>
      !search.trim() ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.address ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const orgMap = new Map(organizations.map((o) => [o.id, o.name]));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Branches</h1>

      <AdminFilter
        title="Filters"
        description="Filter by name or address"
        searchPlaceholder="Search by name or address..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      <Card>
        <CardContent className="pt-6">
          <AdminTable<BranchApi>
            data={filtered}
            keyExtractor={(b) => b.id}
            emptyMessage="No branches found."
            isLoading={isLoading}
            loadingNode={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
            columns={[
              { key: "name", label: "Name", render: (b) => <span className="font-medium">{b.name}</span> },
              { key: "address", label: "Address", render: (b) => b.address ?? "—" },
              {
                key: "organizationId",
                label: "Organization",
                render: (b) => (b.organizationId ? orgMap.get(b.organizationId) ?? b.organizationId : "—"),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
