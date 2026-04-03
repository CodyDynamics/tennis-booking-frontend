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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import {
  useLocations,
  useUpdateUser,
  useUsers,
  useVenueMembershipAssignments,
  useCreateLocation,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { AdminFilter, AdminTable, AdminPagination } from "../components";
import type { VenueMembershipAssignmentRow } from "@/lib/api/endpoints/users";
import type { LocationApi } from "@/lib/api/endpoints/locations";
import { hasAdminPermission } from "@/lib/admin-rbac";
import { useDebouncedSearchValue } from "@/lib/hooks/use-debounced-search-value";

const SEARCH_MIN = 2;
const MEMBERSHIP_PAGE_SIZE = 10;
const LOC_PAGE_SIZE = 10;

function LocationsDirectoryTab() {
  const { user } = useAuth();
  const { data: locations = [], isLoading } = useLocations();
  const createLocation = useCreateLocation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  /** Shown when submit is blocked (Select does not support native HTML required). */
  const [formError, setFormError] = useState<string | null>(null);

  const canCreate = hasAdminPermission(user?.permissions, "locations:create", user?.role);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter((l) => {
      const hay = [l.name, l.address ?? "", l.kind ?? "", l.status ?? ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [locations, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * LOC_PAGE_SIZE, page * LOC_PAGE_SIZE),
    [filtered, page],
  );

  const [form, setForm] = useState({
    kind: "root" as "root" | "child",
    parentLocationId: "__none__",
    name: "",
    address: "",
    timezone: "America/Chicago",
    visibility: "public" as "public" | "private",
    status: "active" as "active" | "inactive",
  });

  /** Any existing root can be a parent for a new child (venue). */
  const rootParentOptions = useMemo(
    () => locations.filter((l) => (l.kind ?? "child") === "root"),
    [locations],
  );

  const resetForm = () => {
    setFormError(null);
    setForm({
      kind: "root",
      parentLocationId: "__none__",
      name: "",
      address: "",
      timezone: "America/Chicago",
      visibility: "public",
      status: "active",
    });
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError("Please enter a name.");
      return;
    }
    if (form.kind === "child" && form.parentLocationId === "__none__") {
      setFormError("For a sub-location, select a parent location.");
      return;
    }
    const err = await createLocation
      .mutateAsync({
        kind: form.kind,
        parentLocationId:
          form.kind === "child" && form.parentLocationId !== "__none__"
            ? form.parentLocationId
            : undefined,
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        timezone: form.timezone.trim() || undefined,
        visibility: form.visibility,
        status: form.status,
      })
      .then(() => null)
      .catch((e) => e);
    if (!err) {
      setDialogOpen(false);
      resetForm();
    } else if (err instanceof ApiError) {
      const msg = err.body?.message;
      setFormError(Array.isArray(msg) ? msg.join(", ") : (msg ?? err.message));
    } else {
      setFormError("Could not create location. Try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Locations</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Location directory. You can still use root + sub-location in data when needed; in the UI we refer to everything as a location.
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add location
          </Button>
        )}
      </div>

      <AdminFilter
        title="Filters"
        searchPlaceholder="Search name, address, kind…"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <Card>
        <CardContent className="pt-6">
          <AdminTable<LocationApi>
            data={paginated}
            keyExtractor={(l) => l.id}
            emptyMessage="No locations match your search."
            isLoading={isLoading}
            loadingNode={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
            columns={[
              { key: "name", label: "Name", render: (l) => <span className="font-medium">{l.name}</span> },
              {
                key: "kind",
                label: "Kind",
                render: (l) => <span className="capitalize">{l.kind ?? "—"}</span>,
              },
              { key: "address", label: "Address", render: (l) => l.address ?? "—" },
              {
                key: "visibility",
                label: "Visibility",
                render: (l) => <span className="capitalize">{l.visibility ?? "—"}</span>,
              },
              {
                key: "status",
                label: "Status",
                render: (l) => <span className="capitalize">{l.status ?? "—"}</span>,
              },
            ]}
          />
          {!isLoading && filtered.length > 0 && (
            <AdminPagination
              page={page}
              pageSize={LOC_PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
              className="mt-4 border-t pt-4"
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetForm();
            createLocation.reset();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create location</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-4">
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            {createLocation.isError && createLocation.error instanceof ApiError && !formError && (
              <p className="text-sm text-destructive">
                {Array.isArray(createLocation.error.body?.message)
                  ? createLocation.error.body.message.join(", ")
                  : createLocation.error.body?.message ?? createLocation.error.message}
              </p>
            )}
            <div>
              <Label>Kind</Label>
              <Select
                value={form.kind}
                onValueChange={(v) => {
                  setFormError(null);
                  setForm((f) => ({
                    ...f,
                    kind: v as "root" | "child",
                    parentLocationId: v === "root" ? "__none__" : f.parentLocationId,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root</SelectItem>
                  <SelectItem value="child">Sub-location</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.kind === "child" && (
              <div>
                <Label>Parent (root location)</Label>
                <Select
                  value={form.parentLocationId}
                  onValueChange={(v) => setForm((f) => ({ ...f, parentLocationId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select root parent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select…</SelectItem>
                    {rootParentOptions.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.kind === "child" && rootParentOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No root locations exist yet. Create a <strong>Root</strong> location first, then add
                    a sub-location under it.
                  </p>
                )}
              </div>
            )}
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  setFormError(null);
                  setForm((f) => ({ ...f, name: e.target.value }));
                }}
                required
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div>
              <Label>Timezone</Label>
              <Input
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                placeholder="America/Chicago"
              />
            </div>
            <div>
              <Label>Visibility</Label>
              <Select
                value={form.visibility}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, visibility: v as "public" | "private" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as "active" | "inactive" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLocation.isPending}>
                {createLocation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {createLocation.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminLocationStaffPage() {
  const { user: adminUser } = useAuth();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();

  const activeLocations = useMemo(
    () => locations.filter((l) => (l.status ?? "active") === "active"),
    [locations],
  );

  const childLikeLocations = useMemo(
    () =>
      activeLocations.filter(
        (l) => (l.kind ?? "child") === "child" || Boolean(l.parentLocationId),
      ),
    [activeLocations],
  );

  /** Prefer child venues; if only roots exist, allow those so the dropdown is never empty. */
  const locationsForAssign = useMemo(() => {
    if (childLikeLocations.length > 0) return childLikeLocations;
    return activeLocations;
  }, [activeLocations, childLikeLocations]);

  const locationById = useMemo(() => {
    const m = new Map<string, LocationApi>();
    for (const l of locations) m.set(l.id, l);
    return m;
  }, [locations]);

  const venueAssignOptions = useMemo(() => {
    return locationsForAssign
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((loc) => {
        const isChild =
          (loc.kind ?? "child") === "child" || Boolean(loc.parentLocationId);
        const parentName = loc.parentLocationId
          ? locationById.get(loc.parentLocationId)?.name
          : null;
        const label =
          isChild && parentName
            ? `${loc.name} — ${parentName}`
            : isChild
              ? loc.name
              : `${loc.name} (organization)`;
        return { loc, label };
      });
  }, [locationsForAssign, locationById]);

  const [userSearch, setUserSearch] = useState("");
  const debouncedSearch = useDebouncedSearchValue(userSearch, 300);

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
        <p className="text-muted-foreground">Only super administrators can manage locations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Manage the location directory and attach accounts to venues via membership.
        </p>
      </div>

      <Tabs defaultValue="locations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="venue-users">Venue users & memberships</TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="space-y-6">
          <LocationsDirectoryTab />
        </TabsContent>

        <TabsContent value="venue-users" className="space-y-6">
          <p className="text-muted-foreground text-sm max-w-2xl">
            <strong>1.</strong> Pick a location. <strong>2.</strong> Find the user. <strong>3.</strong>{" "}
            Assign venue membership (one row per user; choosing another location replaces the current
            one).
          </p>

          <Card>
            <CardContent className="pt-6 space-y-5 max-w-xl">
              <div>
                <Label>1. Location</Label>
                <Select
                  value={locationId || "__none__"}
                  onValueChange={(v) => setLocationId(v === "__none__" ? "" : v)}
                  disabled={locationsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select location…</SelectItem>
                    {venueAssignOptions.map(({ loc, label }) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!locationsLoading && venueAssignOptions.length === 0 && (
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-2 rounded-md border border-amber-200/80 bg-amber-50 dark:bg-amber-950/40 px-3 py-2">
                    No locations yet. Create one under the <strong>Locations</strong> tab, then come
                    back here.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="loc-user-search">2. Search user (email or name)</Label>
                <Input
                  id="loc-user-search"
                  placeholder={`At least ${SEARCH_MIN} characters if the checkbox below is off`}
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
                    Only users with <strong>no</strong> venue membership yet
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {onlyNoVenueMembership
                    ? "The list loads automatically for accounts not assigned to any location."
                    : `Use the checkbox above, or type at least ${SEARCH_MIN} characters to search all users.`}
                </p>
              </div>

              <div>
                <Label>3. User</Label>
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
                            ? "Search or turn on “no venue yet”"
                            : "Select user"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select user…</SelectItem>
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
                  "Assign membership at location"
                )}
              </Button>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-lg font-semibold tracking-tight mb-1">Venue memberships</h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
              Every account with a membership at a location — players, coaches, and staff.
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
                {childLikeLocations.map((loc) => (
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
