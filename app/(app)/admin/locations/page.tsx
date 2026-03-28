"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import {
  useLocations,
  useUpdateUser,
  useUsers,
  useVenueMembershipAssignments,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { AdminFilter, AdminTable, AdminPagination } from "../components";
import type { VenueMembershipAssignmentRow } from "@/lib/api/endpoints/users";

const SEARCH_MIN = 2;
const MEMBERSHIP_PAGE_SIZE = 10;

export default function AdminLocationStaffPage() {
  const { user: adminUser } = useAuth();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const locationChildren = useMemo(
    () => locations.filter((l) => (l.kind ?? "child") === "child"),
    [locations],
  );

  const [userSearch, setUserSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(userSearch), 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  const [onlyNoVenueMembership, setOnlyNoVenueMembership] = useState(true);

  const assignUsersQueryEnabled =
    adminUser?.role === "super_admin" &&
    (onlyNoVenueMembership || debouncedSearch.trim().length >= SEARCH_MIN);

  const { data: assignUserCandidates = [], isLoading: assignUsersLoading } = useUsers({
    search: debouncedSearch.trim() || undefined,
    noMembershipAnywhere: onlyNoVenueMembership,
    enabled: assignUsersQueryEnabled,
  });

  const {
    data: assignments = [],
    isLoading: assignmentsLoading,
  } = useVenueMembershipAssignments(adminUser?.role === "super_admin");
  const updateUser = useUpdateUser();

  const [locationId, setLocationId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const [membershipSearch, setMembershipSearch] = useState("");
  const [membershipLocationFilter, setMembershipLocationFilter] = useState<string>("all");
  const [membershipPage, setMembershipPage] = useState(1);

  const filteredMemberships = useMemo(() => {
    let rows = assignments;
    if (membershipLocationFilter !== "all") {
      rows = rows.filter((r) => r.locationId === membershipLocationFilter);
    }
    const q = membershipSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.email,
        r.firstName,
        r.lastName,
        r.locationName,
        r.roleName ?? "",
        r.status,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [assignments, membershipSearch, membershipLocationFilter]);

  const paginatedMemberships = useMemo(
    () =>
      filteredMemberships.slice(
        (membershipPage - 1) * MEMBERSHIP_PAGE_SIZE,
        membershipPage * MEMBERSHIP_PAGE_SIZE,
      ),
    [filteredMemberships, membershipPage],
  );

  useEffect(() => {
    setMembershipPage(1);
  }, [membershipSearch, membershipLocationFilter]);

  const onAssign = async () => {
    if (!locationId || !userId) return;
    setError(null);
    const err = await updateUser
      .mutateAsync({
        id: userId,
        body: { membershipLocationId: locationId },
      })
      .then(() => null)
      .catch((e) => e);
    if (err instanceof ApiError) {
      const msg = err.body?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : (msg ?? err.message));
    } else if (err) {
      setError("Could not assign membership.");
    } else {
      setUserId("");
    }
  };

  const onRemove = async (row: VenueMembershipAssignmentRow) => {
    if (
      !window.confirm(
        `Remove venue access for ${row.email} at ${row.locationName || row.locationId}?`,
      )
    ) {
      return;
    }
    setRemovingUserId(row.userId);
    const err = await updateUser
      .mutateAsync({
        id: row.userId,
        body: { membershipLocationId: null },
      })
      .then(() => null)
      .catch((e) => e);
    setRemovingUserId(null);
    if (err instanceof ApiError) {
      const msg = err.body?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : (msg ?? err.message));
    } else if (err) {
      setError("Could not remove membership.");
    }
  };

  if (adminUser?.role !== "super_admin") {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
        <p className="text-muted-foreground">Only super administrators can manage location staff.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Attach any account to a venue (location child) via membership. One membership row per user;
          choosing a new location replaces the previous one. Use search to find anyone, or limit to
          people who are not on any venue yet.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4 max-w-xl">
          <div>
            <Label>Location (venue)</Label>
            <Select
              value={locationId || "__none__"}
              onValueChange={(v) => setLocationId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location child" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select…</SelectItem>
                {locationChildren.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="loc-user-search">Search users</Label>
            <Input
              id="loc-user-search"
              placeholder={`Email or name (min ${SEARCH_MIN} characters if not using filter below)`}
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="only-no-venue"
                checked={onlyNoVenueMembership}
                onCheckedChange={(v) => setOnlyNoVenueMembership(Boolean(v))}
              />
              <Label htmlFor="only-no-venue" className="text-sm font-normal cursor-pointer">
                Only users with <strong>no</strong> venue / location membership yet (e.g. just
                registered)
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              {onlyNoVenueMembership
                ? "List loads automatically for accounts that have never been assigned to any location."
                : `Turn on the filter above, or type at least ${SEARCH_MIN} characters to search all users.`}
            </p>
          </div>

          <div>
            <Label>User</Label>
            <Select
              value={userId || "__none__"}
              onValueChange={(v) => setUserId(v === "__none__" ? "" : v)}
              disabled={!assignUsersQueryEnabled || assignUsersLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    assignUsersLoading
                      ? "Loading…"
                      : !assignUsersQueryEnabled
                        ? "Search or enable filter…"
                        : "Select user"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select…</SelectItem>
                {assignUserCandidates.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.email} ({[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                    {u.role?.name ? ` · ${u.role.name}` : ""})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="button"
            onClick={onAssign}
            disabled={!locationId || !userId || updateUser.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {updateUser.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Assign to location"
            )}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-1">Venue memberships</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
          Every account with a membership at a child (venue) location — players, coaches, and staff.
          Remove clears that venue membership (the account remains).
        </p>
      </div>

      <AdminFilter
        title="Filters"
        description="Search and narrow the membership list."
        searchPlaceholder="Search email, name, location, role…"
        searchValue={membershipSearch}
        onSearchChange={setMembershipSearch}
      >
        <Select
          value={membershipLocationFilter}
          onValueChange={setMembershipLocationFilter}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All venues" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All venues</SelectItem>
            {locationChildren.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminFilter>

      <Card>
        <CardContent className="pt-6">
          <AdminTable<VenueMembershipAssignmentRow>
            data={paginatedMemberships}
            keyExtractor={(r) => r.membershipId}
            emptyMessage="No venue memberships match your filters."
            isLoading={assignmentsLoading || locationsLoading}
            loadingNode={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
            columns={[
              {
                key: "location",
                label: "Location",
                render: (r) => (
                  <span className="font-medium">{r.locationName || r.locationId}</span>
                ),
              },
              { key: "email", label: "Email", render: (r) => r.email },
              {
                key: "name",
                label: "Name",
                render: (r) =>
                  `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "—",
              },
              {
                key: "role",
                label: "Role",
                render: (r) => r.roleName ?? "—",
              },
              { key: "status", label: "Membership status", render: (r) => r.status },
              {
                key: "actions",
                label: "Actions",
                className: "text-right",
                headClassName: "text-right",
                render: (r) => (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    disabled={removingUserId === r.userId || updateUser.isPending}
                    onClick={() => onRemove(r)}
                    aria-label={`Remove ${r.email}`}
                  >
                    {removingUserId === r.userId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                ),
              },
            ]}
          />
          {!assignmentsLoading && !locationsLoading && filteredMemberships.length > 0 && (
            <AdminPagination
              page={membershipPage}
              pageSize={MEMBERSHIP_PAGE_SIZE}
              total={filteredMemberships.length}
              onPageChange={setMembershipPage}
              className="mt-4 border-t pt-4"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
