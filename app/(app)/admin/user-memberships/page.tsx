"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/lib/auth-store";
import {
  useUsers,
  useLocations,
  useAreas,
  useBookableLocations,
  useCreateMembershipPlaceholder,
  useRolesList,
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { ApiError } from "@/lib/api";
import { hasAdminPermission } from "@/lib/admin-rbac";
import { useAdmin } from "../admin-context";
import { UsPhoneField } from "@/components/ui/us-phone-field";
import { formatPhoneDisplay } from "@/lib/us-phone";

const PAGE_SIZE = 10;

export default function AdminUserMembershipPage() {
  const { user } = useAuth();
  const { locationId: adminLocationId } = useAdmin();
  const [search, setSearch] = useState("");
  const [roleId, setRoleId] = useState<string>("all");
  const [filterAreaId, setFilterAreaId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const canCreate = hasAdminPermission(user?.permissions, "users:create", user?.role);

  const showScopeFilters =
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "super_user";

  const { data: locations = [] } = useLocations();
  const { data: areas = [] } = useAreas();
  const { data: bookableLocations = [] } = useBookableLocations(
    user?.role === "super_user",
  );
  const { data: roles = [] } = useRolesList();

  const locationNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations) m.set(l.id, l.name);
    return m;
  }, [locations]);

  const bookableLocationIds = useMemo(
    () => new Set(bookableLocations.map((l) => l.id)),
    [bookableLocations],
  );

  const areasForScopeFilter = useMemo(() => {
    if (user?.role === "super_user") {
      return areas.filter((a) => bookableLocationIds.has(a.locationId));
    }
    if (user?.role === "super_admin" || user?.role === "admin") return areas;
    return [];
  }, [user?.role, areas, bookableLocationIds]);

  const areasScopedByLocationFilter = useMemo(() => {
    if (adminLocationId === "all") return areasForScopeFilter;
    return areasForScopeFilter.filter((a) => a.locationId === adminLocationId);
  }, [areasForScopeFilter, adminLocationId]);

  /** Locations allowed in Add-membership dialog: all for super_admin/admin; scoped for super_user. */
  const locationOptionsForCreate = useMemo(() => {
    if (user?.role === "super_user") {
      return bookableLocations.length > 0
        ? bookableLocations
        : locations.filter((l) => bookableLocationIds.has(l.id));
    }
    return locations;
  }, [user?.role, locations, bookableLocations, bookableLocationIds]);

  const narrowListToVenueMembership =
    showScopeFilters &&
    (filterAreaId !== "all" ||
      (filterAreaId === "all" && adminLocationId !== "all"));

  useEffect(() => {
    setFilterAreaId("all");
  }, [adminLocationId]);

  useEffect(() => {
    setPage(1);
  }, [search, roleId, adminLocationId, filterAreaId]);

  const { data: users = [], isLoading } = useUsers({
    accountType: narrowListToVenueMembership ? undefined : "membership",
    roleId: roleId && roleId !== "all" ? roleId : undefined,
    search: search || undefined,
    membershipAtLocationId:
      showScopeFilters && filterAreaId === "all" && adminLocationId !== "all"
        ? adminLocationId
        : undefined,
    areaId: showScopeFilters && filterAreaId !== "all" ? filterAreaId : undefined,
  });

  const paginatedUsers = useMemo(
    () => users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [users, page],
  );

  const createMembership = useCreateMembershipPlaceholder();

  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    homeAddress: "",
    locationId: "__none__",
  });

  const resetCreateForm = () => {
    setFormError(null);
    setForm({
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      homeAddress: "",
      locationId: "__none__",
    });
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const fullName = `${form.firstName} ${form.lastName}`.trim();
    if (!form.email.trim()) {
      setFormError("Please enter an email.");
      return;
    }
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError("Please enter first and last name.");
      return;
    }
    if (!form.phone?.trim()) {
      setFormError("Please enter a phone number (required for register matching).");
      return;
    }
    const err = await createMembership
      .mutateAsync({
        email: form.email.trim(),
        phone: form.phone,
        fullName,
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        homeAddress: form.homeAddress.trim() || undefined,
        membershipLocationId:
          form.locationId !== "__none__" ? form.locationId : undefined,
      })
      .then(() => null)
      .catch((e) => e);
    if (!err) {
      setModalOpen(false);
      resetCreateForm();
    } else if (err instanceof ApiError) {
      const msg = err.body?.message;
      setFormError(Array.isArray(msg) ? msg.join(", ") : (msg ?? err.message));
    } else {
      setFormError("Could not create membership. Try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">User Membership</h1>
        {canCreate && (
          <Button
            onClick={() => {
              resetCreateForm();
              setModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add membership
          </Button>
        )}
      </div>

      <p className="text-muted-foreground text-sm max-w-2xl -mt-2">
        With <strong>All locations</strong> in the sidebar, this list shows pre-approved placeholders
        (account type <strong>membership</strong>). When you pick a <strong>location</strong> (or area
        below), everyone with a venue membership there is listed—including normal accounts assigned from{" "}
        <strong>Users</strong>.
      </p>

      <AdminFilter
        title="Filters"
        searchPlaceholder="Search by email or name..."
        searchValue={search}
        onSearchChange={setSearch}
      >
        <Select value={roleId} onValueChange={setRoleId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showScopeFilters && (
          <>
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
            emptyMessage={
              narrowListToVenueMembership
                ? "No users with venue membership match your filters."
                : "No membership placeholders match your filters."
            }
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
              {
                key: "phone",
                label: "Phone",
                render: (u) => (
                  <span className="tabular-nums">{formatPhoneDisplay(u.phone)}</span>
                ),
              },
              { key: "homeAddress", label: "Address", render: (u) => u.homeAddress ?? "—" },
              {
                key: "accountType",
                label: "Type",
                render: (u) => (
                  <span className="capitalize text-muted-foreground">{u.accountType ?? "—"}</span>
                ),
              },
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

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            resetCreateForm();
            createMembership.reset();
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add membership</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-4">
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            {createMembership.isError &&
              createMembership.error instanceof ApiError &&
              !formError && (
                <p className="text-sm text-destructive">
                  {Array.isArray(createMembership.error.body?.message)
                    ? createMembership.error.body.message.join(", ")
                    : createMembership.error.body?.message ?? createMembership.error.message}
                </p>
              )}
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => {
                  setFormError(null);
                  setForm((f) => ({ ...f, email: e.target.value }));
                }}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First name</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) => {
                    setFormError(null);
                    setForm((f) => ({ ...f, firstName: e.target.value }));
                  }}
                  required
                />
              </div>
              <div>
                <Label>Last name</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => {
                    setFormError(null);
                    setForm((f) => ({ ...f, lastName: e.target.value }));
                  }}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <p className="text-xs text-muted-foreground mb-1.5">
                10-digit US number; stored as +1…
              </p>
              <UsPhoneField
                variant="compact"
                value={form.phone}
                onChange={(value) => {
                  setFormError(null);
                  setForm((f) => ({ ...f, phone: value }));
                }}
              />
            </div>
            <div>
              <Label>Address (optional)</Label>
              <Input
                value={form.homeAddress}
                onChange={(e) => {
                  setFormError(null);
                  setForm((f) => ({ ...f, homeAddress: e.target.value }));
                }}
              />
            </div>
            <div>
              <Label>Location (optional)</Label>
              <p className="text-muted-foreground text-xs mb-2">
                If you pick a location, a <strong>venue membership</strong> row is created for that
                spot—after the person registers with the same email and phone, they already have access
                tied to that location. Leave <strong>None</strong> to only pre-approve the person
                (no venue row yet).
              </p>
              <Select
                value={form.locationId}
                onValueChange={(v) => {
                  setFormError(null);
                  setForm((f) => ({ ...f, locationId: v }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {locationOptionsForCreate.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {`${loc.name} (${loc.kind ?? "child"})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMembership.isPending}>
                {createMembership.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {createMembership.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
