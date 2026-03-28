"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/lib/auth-store";
import {
  useUsers,
  useLocations,
  useAreas,
  useBookableLocations,
} from "@/lib/queries";
import { AdminFilter, AdminTable, AdminPagination } from "../components";
import type { UserApi } from "@/lib/api/endpoints/users";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const PAGE_SIZE = 10;

export default function AdminUserMembershipPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterLocationId, setFilterLocationId] = useState<string>("all");
  const [filterAreaId, setFilterAreaId] = useState<string>("all");
  const [page, setPage] = useState(1);

  const showScopeFilters =
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "super_user";

  const { data: locations = [] } = useLocations();
  const { data: areas = [] } = useAreas();
  const { data: bookableLocations = [] } = useBookableLocations(
    user?.role === "super_user",
  );

  const locationNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations) m.set(l.id, l.name);
    return m;
  }, [locations]);

  const bookableLocationIds = useMemo(
    () => new Set(bookableLocations.map((l) => l.id)),
    [bookableLocations],
  );

  const locationsForScopeFilter = useMemo(() => {
    if (user?.role === "super_user") return bookableLocations;
    if (user?.role === "super_admin" || user?.role === "admin") return locations;
    return [];
  }, [user?.role, bookableLocations, locations]);

  const areasForScopeFilter = useMemo(() => {
    if (user?.role === "super_user") {
      return areas.filter((a) => bookableLocationIds.has(a.locationId));
    }
    if (user?.role === "super_admin" || user?.role === "admin") return areas;
    return [];
  }, [user?.role, areas, bookableLocationIds]);

  const areasScopedByLocationFilter = useMemo(() => {
    if (filterLocationId === "all") return areasForScopeFilter;
    return areasForScopeFilter.filter((a) => a.locationId === filterLocationId);
  }, [areasForScopeFilter, filterLocationId]);

  useEffect(() => {
    setFilterAreaId("all");
  }, [filterLocationId]);

  useEffect(() => {
    setPage(1);
  }, [search, filterLocationId, filterAreaId]);

  const { data: users = [], isLoading } = useUsers({
    onlyMembership: true,
    search: search || undefined,
    membershipAtLocationId:
      showScopeFilters && filterAreaId === "all" && filterLocationId !== "all"
        ? filterLocationId
        : undefined,
    areaId: showScopeFilters && filterAreaId !== "all" ? filterAreaId : undefined,
  });

  const paginatedUsers = useMemo(
    () => users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [users, page],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">User Membership</h1>

      <AdminFilter
        title="Filters"
        searchPlaceholder="Search by email or name..."
        searchValue={search}
        onSearchChange={setSearch}
      >
        {showScopeFilters && (
          <>
            <Select value={filterLocationId} onValueChange={setFilterLocationId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locationsForScopeFilter.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAreaId} onValueChange={setFilterAreaId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All areas</SelectItem>
                {areasScopedByLocationFilter.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {locationNameById.get(a.locationId) ?? "Location"} — {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </AdminFilter>

      <Card>
        <CardContent className="pt-6">
          <AdminTable<UserApi>
            data={paginatedUsers}
            keyExtractor={(u) => u.id}
            emptyMessage="No membership users found."
            isLoading={isLoading}
            loadingNode={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
            columns={[
              { key: "lastName", label: "Last Name", render: (u) => u.lastName ?? "—" },
              { key: "firstName", label: "First Name", render: (u) => u.firstName ?? "—" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone", render: (u) => u.phone ?? "—" },
              { key: "homeAddress", label: "Address", render: (u) => u.homeAddress ?? "—" },
              {
                key: "role",
                label: "Role",
                render: (u) =>
                  typeof u.role === "object" && u.role?.name ? u.role.name : u.roleId,
              },
              { key: "status", label: "Status" },
            ]}
          />
          {!isLoading && users.length > 0 && (
            <AdminPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={users.length}
              onPageChange={setPage}
              className="mt-4 border-t pt-4"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
