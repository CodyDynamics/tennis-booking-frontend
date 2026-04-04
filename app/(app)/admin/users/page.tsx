"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-store";
import {
  useUsers,
  useRolesList,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useLocations,
  useAreas,
  useAdminUserDetail,
  useBookableLocations,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import type { UserApi } from "@/lib/api/endpoints/users";
import { AdminFilter, AdminTable, AdminPagination } from "../components";
import { hasAdminPermission } from "@/lib/admin-rbac";
import { useAdmin } from "../admin-context";
import { UsPhoneField } from "@/components/ui/us-phone-field";
import { formatPhoneDisplay } from "@/lib/us-phone";
import { titleCaseFilterLabel } from "@/lib/format";
import { useDebouncedSearchValue } from "@/lib/hooks/use-debounced-search-value";

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { locationId: adminLocationId } = useAdmin();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedSearchValue(search);
  const [roleId, setRoleId] = useState<string>("all");
  /** This page never lists `membership` placeholders — those are on Memberships. */
  const [accountTypeScope, setAccountTypeScope] = useState<"all" | "system" | "normal">("all");
  const [filterAreaId, setFilterAreaId] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserApi | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const canCreate = hasAdminPermission(user?.permissions, "users:create", user?.role);
  const canUpdate = hasAdminPermission(user?.permissions, "users:update", user?.role);
  const canDelete = hasAdminPermission(user?.permissions, "users:delete", user?.role);

  const showScopeFilters =
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "super_user";

  const { data: users = [], isLoading } = useUsers({
    roleId: roleId && roleId !== "all" ? roleId : undefined,
    search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
    accountType:
      accountTypeScope === "system" || accountTypeScope === "normal"
        ? accountTypeScope
        : undefined,
    excludeAccountType: accountTypeScope === "all" ? "membership" : undefined,
    membershipAtLocationId:
      showScopeFilters && filterAreaId === "all" && adminLocationId !== "all"
        ? adminLocationId
        : undefined,
    areaId: showScopeFilters && filterAreaId !== "all" ? filterAreaId : undefined,
    includeMemberships: true,
  });
  const { data: roles = [] } = useRolesList();
  const { data: locations = [] } = useLocations();
  const { data: areas = [] } = useAreas();
  const { data: bookableLocations = [] } = useBookableLocations(user?.role === "super_user");
  const { data: editUserDetail, isLoading: editUserDetailLoading } = useAdminUserDetail(
    editingUser?.id,
    modalOpen && !!editingUser,
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

  const listScopedLocationId =
    showScopeFilters && filterAreaId === "all" && adminLocationId !== "all"
      ? adminLocationId
      : undefined;

  /** Venue locations assignable from Edit/Create user (membership row uses locationId). */
  const locationsForMembershipPick = useMemo(() => {
    if (user?.role === "super_user") {
      return bookableLocations.length > 0
        ? bookableLocations
        : locations.filter((l) => bookableLocationIds.has(l.id));
    }
    if (user?.role === "super_admin" || user?.role === "admin") return locations;
    return [];
  }, [user?.role, locations, bookableLocations, bookableLocationIds]);

  const membershipSyncedRef = useRef<string | null>(null);

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  useEffect(() => {
    setFilterAreaId("all");
  }, [adminLocationId]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleId, accountTypeScope, adminLocationId, filterAreaId]);

  const [sortState, setSortState] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  useEffect(() => {
    setPage(1);
  }, [sortState]);

  function cmpLocale(a: string, b: string, dir: "asc" | "desc"): number {
    const x = a.localeCompare(b, undefined, { sensitivity: "base" });
    return dir === "asc" ? x : -x;
  }

  const locationSortLabel = useCallback(
    (u: UserApi) => {
      const ids = Array.from(new Set((u.memberships ?? []).map((m) => m.locationId)));
      if (ids.length > 0) {
        return ids.map((id) => locationNameById.get(id) ?? id).join(", ");
      }
      if (listScopedLocationId) {
        return locationNameById.get(listScopedLocationId) ?? listScopedLocationId;
      }
      return "";
    },
    [locationNameById, listScopedLocationId],
  );

  const sortedUsers = useMemo(() => {
    if (!sortState) return users;
    const { key, dir } = sortState;
    return [...users].sort((u1, u2) => {
      switch (key) {
        case "lastName":
          return cmpLocale(u1.lastName ?? "", u2.lastName ?? "", dir);
        case "firstName":
          return cmpLocale(u1.firstName ?? "", u2.firstName ?? "", dir);
        case "email":
          return cmpLocale(u1.email, u2.email, dir);
        case "location":
          return cmpLocale(locationSortLabel(u1), locationSortLabel(u2), dir);
        case "status":
          return cmpLocale(u1.status, u2.status, dir);
        case "role":
          return cmpLocale(
            typeof u1.role === "object" && u1.role?.name ? u1.role.name : u1.roleId,
            typeof u2.role === "object" && u2.role?.name ? u2.role.name : u2.roleId,
            dir,
          );
        default:
          return 0;
      }
    });
  }, [users, sortState, locationSortLabel]);

  const paginatedUsers = useMemo(
    () => sortedUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedUsers, page],
  );

  const toggleColumnSort = (key: string) => {
    setSortState((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    homeAddress: "",
    roleId: "",
    status: "active" as "active" | "inactive",
    mustChangePasswordOnFirstLogin: false,
    membershipLocationId: "__none__",
    password: "",
    /** Editable for normal/membership; system for staff rows */
    accountType: "normal" as "normal" | "membership" | "system",
  });

  const resetForm = () => {
    setEditingUser(null);
    setForm({
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      homeAddress: "",
      roleId: roles[0]?.id ?? "",
      status: "active",
      mustChangePasswordOnFirstLogin: false,
      membershipLocationId: "__none__",
      password: "",
      accountType: "normal",
    });
  };

  const openCreate = () => {
    membershipSyncedRef.current = null;
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (u: UserApi) => {
    membershipSyncedRef.current = null;
    setEditingUser(u);
    setForm({
      email: u.email,
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      phone: u.phone ?? "",
      homeAddress: u.homeAddress ?? "",
      roleId: u.roleId,
      status: u.status as "active" | "inactive",
      mustChangePasswordOnFirstLogin: u.mustChangePasswordOnFirstLogin ?? false,
      membershipLocationId: "__none__",
      password: "",
      accountType:
        u.accountType === "membership"
          ? "membership"
          : u.accountType === "system"
            ? "system"
            : "normal",
    });
    setModalOpen(true);
  };

  useEffect(() => {
    if (!modalOpen) {
      membershipSyncedRef.current = null;
    }
  }, [modalOpen]);

  useEffect(() => {
    if (!editingUser || !modalOpen || !editUserDetail) return;
    const locId = editUserDetail.memberships?.[0]?.locationId;
    const syncKey = `${editingUser.id}-${locId ?? "none"}`;
    if (membershipSyncedRef.current === syncKey) return;
    membershipSyncedRef.current = syncKey;
    if (!locId) {
      setForm((f) => ({ ...f, membershipLocationId: "__none__" }));
      return;
    }
    const allowed = new Set(locationsForMembershipPick.map((l) => l.id));
    setForm((f) => ({
      ...f,
      membershipLocationId: allowed.has(locId) ? locId : "__none__",
    }));
  }, [editingUser?.id, modalOpen, editUserDetail, locationsForMembershipPick]);

  const fullName = `${form.firstName} ${form.lastName}`.trim();
  const phoneValid = true;

  const resolvedMembershipLocationPayload = (): string | null | undefined => {
    if (!form.membershipLocationId || form.membershipLocationId === "__none__") {
      return editingUser ? null : undefined;
    }
    return form.membershipLocationId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneValid) return;
    if (editingUser && editUserDetailLoading) return;

    if (editingUser) {
      const accountTypeBody =
        (editingUser.accountType === "normal" ||
          editingUser.accountType === "membership") &&
        form.accountType !== editingUser.accountType &&
        (form.accountType === "normal" || form.accountType === "membership")
          ? { accountType: form.accountType }
          : {};
      const err = await updateUser
        .mutateAsync({
          id: editingUser.id,
          body: {
            email: form.email,
            fullName,
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone,
            homeAddress: form.homeAddress || undefined,
            roleId: form.roleId,
            status: form.status,
            mustChangePasswordOnFirstLogin: form.mustChangePasswordOnFirstLogin,
            membershipLocationId: resolvedMembershipLocationPayload() ?? null,
            ...(form.password ? { password: form.password } : {}),
            ...accountTypeBody,
          },
        })
        .then(() => null)
        .catch((err) => err);
      if (err) return;
    } else {
      if (!form.password) return;
      const err = await createUser
        .mutateAsync({
          email: form.email,
          password: form.password,
          fullName,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          homeAddress: form.homeAddress || undefined,
          roleId: form.roleId,
          mustChangePasswordOnFirstLogin: form.mustChangePasswordOnFirstLogin,
          membershipLocationId:
            resolvedMembershipLocationPayload() ?? undefined,
        })
        .then(() => null)
        .catch((err) => err);
      if (err) return;
    }

    setModalOpen(false);
    resetForm();
  };

  const submitError =
    createUser.error instanceof ApiError
      ? createUser.error
      : updateUser.error instanceof ApiError
        ? updateUser.error
        : null;

  const handleDelete = async (id: string) => {
    await deleteUser.mutateAsync(id).catch(() => {});
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Users</h1>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

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
                {titleCaseFilterLabel(r.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={accountTypeScope} onValueChange={(v) => setAccountTypeScope(v as typeof accountTypeScope)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Account type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All (excludes membership placeholders)</SelectItem>
            <SelectItem value="system">System only</SelectItem>
            <SelectItem value="normal">Normal only</SelectItem>
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
            emptyMessage="No users found."
            isLoading={isLoading}
            sortKey={sortState?.key ?? null}
            sortDir={sortState?.dir ?? "asc"}
            onColumnSort={toggleColumnSort}
            loadingNode={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
            columns={[
              {
                key: "lastName",
                label: "Last name",
                sortable: true,
                render: (u) => <span className="font-medium">{u.lastName ?? "—"}</span>,
              },
              {
                key: "firstName",
                label: "First name",
                sortable: true,
                render: (u) => <span className="font-medium">{u.firstName ?? "—"}</span>,
              },
              { key: "email", label: "Email", sortable: true },
              {
                key: "location",
                label: "Location",
                sortable: true,
                render: (u) => {
                  const ids = Array.from(
                    new Set((u.memberships ?? []).map((m) => m.locationId)),
                  );
                  if (ids.length > 0) {
                    return ids
                      .map((id) => locationNameById.get(id) ?? id)
                      .join(", ");
                  }
                  if (listScopedLocationId) {
                    return (
                      locationNameById.get(listScopedLocationId) ??
                      listScopedLocationId
                    );
                  }
                  return "—";
                },
              },
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
                  <span className="capitalize text-muted-foreground">
                    {u.accountType ?? "—"}
                  </span>
                ),
              },
              {
                key: "role",
                label: "Role",
                sortable: true,
                render: (u) =>
                  typeof u.role === "object" && u.role?.name
                    ? titleCaseFilterLabel(u.role.name)
                    : titleCaseFilterLabel(u.roleId),
              },
              {
                key: "status",
                label: "Status",
                sortable: true,
                render: (u) => (
                  <span className={u.status === "active" ? "text-green-600" : "text-amber-600"}>
                    {titleCaseFilterLabel(u.status)}
                  </span>
                ),
              },
              ...(canUpdate || canDelete
                ? [
                    {
                      key: "actions",
                      label: "Actions",
                      headClassName: "text-right",
                      className: "text-right",
                      render: (row: UserApi) => (
                        <>
                          {canUpdate && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setDeleteConfirmId(row.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      ),
                    } as {
                      key: string;
                      label: string;
                      headClassName?: string;
                      className?: string;
                      render: (row: UserApi) => React.ReactNode;
                    },
                  ]
                : []),
            ]}
          />
          {!isLoading && sortedUsers.length > 0 && (
            <AdminPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={sortedUsers.length}
              onPageChange={setPage}
              className="mt-4 border-t pt-4"
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="min-h-0 flex flex-col gap-4">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-2 pr-3">
              {submitError && (
                <p className="text-sm text-destructive">
                  {Array.isArray(submitError.body?.message)
                    ? submitError.body.message.join(", ")
                    : submitError.body?.message ?? submitError.message}
                </p>
              )}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                  disabled={!!editingUser}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0 space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, firstName: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lastName: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <p className="text-xs text-muted-foreground">
                  10-digit US number; stored as +1…
                </p>
                <UsPhoneField
                  variant="compact"
                  value={form.phone}
                  onChange={(value) => setForm((f) => ({ ...f, phone: value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={form.homeAddress}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, homeAddress: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.roleId}
                  onValueChange={(v) => setForm((f) => ({ ...f, roleId: v }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editingUser &&
                (editingUser.accountType === "normal" ||
                  editingUser.accountType === "membership") && (
                  <div className="space-y-2">
                    <Label>Account type</Label>
                    <p className="text-muted-foreground text-xs">
                      <strong>Normal</strong> = regular app user (stays on this list).{" "}
                      <strong>Membership (pre-approved)</strong> = also appears under{" "}
                      <strong>Memberships</strong>. Venue access is separate — use{" "}
                      <strong>Venue membership</strong> below or Locations → Venue users.
                    </p>
                    <Select
                      value={form.accountType === "membership" ? "membership" : "normal"}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          accountType: v as "normal" | "membership",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal (app user)</SelectItem>
                        <SelectItem value="membership">
                          Membership (pre-approved)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              {editingUser && editingUser.accountType === "system" && (
                <p className="text-xs text-muted-foreground rounded-md border bg-muted/40 px-3 py-2">
                  Account type is <strong>System</strong> (staff). To manage venue access, use{" "}
                  <strong>Venue membership</strong> below.
                </p>
              )}
              <div className="space-y-2">
                <Label>Venue membership (optional)</Label>
                <p className="text-muted-foreground text-xs">
                  Attach this user to a <strong>location</strong> for booking access (membership row).
                  <strong> None</strong> removes all venue memberships (super_admin; venue staff have
                  limits). This does not change account type — use <strong>Account type</strong> above
                  for the Memberships list.
                </p>
                <Select
                  value={form.membershipLocationId || "__none__"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      membershipLocationId: v === "__none__" ? "__none__" : v,
                    }))
                  }
                  disabled={!!editingUser && editUserDetailLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={editUserDetailLoading ? "Loading…" : "None"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {locationsForMembershipPick.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                        {loc.kind ? ` (${loc.kind})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editingUser && (
                <div className="space-y-2">
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
              )}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="mustChangePwd"
                  checked={form.mustChangePasswordOnFirstLogin}
                  onCheckedChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      mustChangePasswordOnFirstLogin: Boolean(v),
                    }))
                  }
                />
                <Label htmlFor="mustChangePwd">
                  Require password change on first login
                </Label>
              </div>
              <div className="space-y-2">
                <Label>{editingUser ? "New password (optional)" : "Password"}</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                    required={!editingUser}
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const chars =
                        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
                      let next = "";
                      for (let i = 0; i < 12; i += 1) {
                        next += chars[Math.floor(Math.random() * chars.length)];
                      }
                      setForm((f) => ({ ...f, password: next }));
                    }}
                  >
                    Generate
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={createUser.isPending || updateUser.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createUser.isPending ||
                  updateUser.isPending ||
                  !phoneValid ||
                  (!!editingUser && editUserDetailLoading)
                }
                aria-busy={createUser.isPending || updateUser.isPending}
              >
                {(createUser.isPending || updateUser.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {createUser.isPending
                  ? "Creating…"
                  : updateUser.isPending
                    ? "Saving…"
                    : editingUser
                      ? "Save"
                      : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this user? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteUser.isPending}
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              aria-busy={deleteUser.isPending}
            >
              {deleteUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteUser.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
