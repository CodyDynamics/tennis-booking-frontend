"use client";

import { useState, useMemo, useEffect } from "react";
import { useOrganizations } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { AdminFilter, AdminTable, AdminPagination } from "../components";

const PAGE_SIZE = 10;
import { Loader2 } from "lucide-react";
import type { OrganizationApi } from "@/lib/api/endpoints/organizations";

export default function AdminOrganizationsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data: organizations = [], isLoading } = useOrganizations();

  const filtered = useMemo(
    () =>
      organizations.filter(
        (o) =>
          !search.trim() ||
          o.name.toLowerCase().includes(search.toLowerCase()) ||
          (o.description ?? "").toLowerCase().includes(search.toLowerCase())
      ),
    [organizations, search]
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
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
            data={paginated}
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
