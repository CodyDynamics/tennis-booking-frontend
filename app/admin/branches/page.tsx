"use client";

import { useState, useMemo, useEffect } from "react";
import { useBranches, useOrganizations } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { AdminFilter, AdminTable, AdminPagination } from "../components";

const PAGE_SIZE = 10;
import { Loader2 } from "lucide-react";
import type { BranchApi } from "@/lib/api/endpoints/branches";

export default function AdminBranchesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data: branches = [], isLoading } = useBranches();
  const { data: organizations = [] } = useOrganizations();

  const filtered = useMemo(
    () =>
      branches.filter(
        (b) =>
          !search.trim() ||
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          (b.address ?? "").toLowerCase().includes(search.toLowerCase())
      ),
    [branches, search]
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
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
            data={paginated}
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
          {!isLoading && filtered.length > 0 && (
            <AdminPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
              className="mt-4 border-t pt-4"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
