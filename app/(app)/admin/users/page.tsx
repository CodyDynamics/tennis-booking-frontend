"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
import PhoneInput from "react-phone-number-input";
import { ApiError } from "@/lib/api";
import type { UserApi } from "@/lib/api/endpoints/users";
import { AdminFilter, AdminTable, AdminPagination } from "../components";
import { hasAdminPermission } from "@/lib/admin-rbac";

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [roleId, setRoleId] = useState<string>("all");
  const [onlyMembership, setOnlyMembership] = useState(false);
  const [filterLocationId, setFilterLocationId] = useState<string>("all");
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
    search: search || undefined,
    onlyMembership,
    membershipAtLocationId:
      showScopeFilters && filterAreaId === "all" && filterLocationId !== "all"
        ? filterLocationId
        : undefined,
    areaId: showScopeFilters && filterAreaId !== "all" ? filterAreaId : undefined,
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

  const targetMembershipLocationIds = useMemo(() => {
    if (!editUserDetail?.memberships?.length) return [];
    return Array.from(new Set(editUserDetail.memberships.map((m) => m.locationId)));
  }, [editUserDetail]);

  /** Areas allowed in membership dropdown: target user’s venue(s), or bookable venues for super_user, or all for super_admin. */
  const areasForMembershipDropdown = useMemo(() => {
    if (editingUser && targetMembershipLocationIds.length > 0) {
      return areas.filter((a) => targetMembershipLocationIds.includes(a.locationId));
    }
    if (!editingUser) {
      if (user?.role === "super_admin") return areas;
      if (user?.role === "super_user") {
        return areas.filter((a) => bookableLocationIds.has(a.locationId));
      }
      return areas;
    }
    if (user?.role === "super_admin") return areas;
    if (user?.role === "super_user") {
      return areas.filter((a) => bookableLocationIds.has(a.locationId));
    }
    return areas;
  }, [areas, editingUser, targetMembershipLocationIds, user?.role, bookableLocationIds]);

  const membershipSyncedRef = useRef<string | null>(null);

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  useEffect(() => {
    setFilterAreaId("all");
  }, [filterLocationId]);

  useEffect(() => {
    setPage(1);
  }, [search, roleId, onlyMembership, filterLocationId, filterAreaId]);

  const paginatedUsers = useMemo(
    () => users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [users, page],
  );

  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    homeAddress: "",
    roleId: "",
    status: "active" as "active" | "inactive",
    mustChangePasswordOnFirstLogin: false,
    membershipAreaId: "",
    password: "",
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
      membershipAreaId: "",
      password: "",
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
      membershipAreaId: "",
      password: "",
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
      setForm((f) => ({ ...f, membershipAreaId: "" }));
      return;
    }
    const candidates = areasForMembershipDropdown.filter((a) => a.locationId === locId);
    const picked = [...candidates].sort((a, b) => a.name.localeCompare(b.name))[0];
    setForm((f) => ({ ...f, membershipAreaId: picked?.id ?? "" }));
  }, [editingUser?.id, modalOpen, editUserDetail, areasForMembershipDropdown]);

  const fullName = `${form.firstName} ${form.lastName}`.trim();
  const phoneValid = true;

  const resolveMembershipLocationId = (): string | undefined => {
    if (!form.membershipAreaId || form.membershipAreaId === "__none__") return undefined;
    return areas.find((a) => a.id === form.membershipAreaId)?.locationId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneValid) return;
    if (editingUser && editUserDetailLoading) return;

    if (editingUser) {
      const locId = resolveMembershipLocationId();
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
            membershipLocationId:
              !form.membershipAreaId || form.membershipAreaId === "__none__" ? null : locId ?? null,
            ...(form.password ? { password: form.password } : {}),
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
          membershipLocationId: resolveMembershipLocationId(),
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
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 px-2">
          <Checkbox
            id="onlyMembership"
            checked={onlyMembership}
            onCheckedChange={(v) => setOnlyMembership(Boolean(v))}
          />
          <Label htmlFor="onlyMembership">Only membership users</Label>
        </div>
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
            emptyMessage="No users found."
            isLoading={isLoading}
            loadingNode={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
            columns={[
              {
                key: "lastName",
                label: "Last Name",
                render: (u) => <span className="font-medium">{u.lastName ?? "—"}</span>,
              },
              {
                key: "firstName",
                label: "First Name",
                render: (u) => <span className="font-medium">{u.firstName ?? "—"}</span>,
              },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone", render: (u) => u.phone ?? "—" },
              { key: "homeAddress", label: "Address", render: (u) => u.homeAddress ?? "—" },
              {
                key: "role",
                label: "Role",
                render: (u) =>
                  typeof u.role === "object" && u.role?.name ? u.role.name : u.roleId,
              },
              {
                key: "status",
                label: "Status",
                render: (u) => (
                  <span className={u.status === "active" ? "text-green-600" : "text-amber-600"}>
                    {u.status}
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && (
              <p className="text-sm text-destructive">
                {Array.isArray(submitError.body?.message)
                  ? submitError.body.message.join(", ")
                  : submitError.body?.message ?? submitError.message}
              </p>
            )}
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                disabled={!!editingUser}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <PhoneInput
                international
                defaultCountry="US"
                countryCallingCodeEditable={false}
                placeholder="Enter phone number"
                value={form.phone || ""}
                onChange={(value) =>
                  setForm((f) => ({ ...f, phone: value || "" }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={form.homeAddress}
                onChange={(e) => setForm((f) => ({ ...f, homeAddress: e.target.value }))}
              />
            </div>
            <div>
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
            <div>
              <Label>Area membership (optional)</Label>
              <p className="text-muted-foreground mb-2 text-xs">
                {targetMembershipLocationIds.length > 0
                  ? "Only areas under this user’s assigned location(s) are listed. Membership is stored per location; picking an area sets that location."
                  : user?.role === "super_admin"
                    ? "Choose an area to set membership location, or None. For venue staff, assign a location on Locations first if you need a restricted list."
                    : "Only areas at locations you operate (or the user’s assigned venue when editing) are listed. Membership is stored per location."}
              </p>
              <Select
                value={form.membershipAreaId || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    membershipAreaId: v === "__none__" ? "" : v,
                  }))
                }
                disabled={!!editingUser && editUserDetailLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={editUserDetailLoading ? "Loading…" : "None"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {areasForMembershipDropdown.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {locationNameById.get(a.locationId) ?? "Location"} — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editingUser && (
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as "active" | "inactive" }))}
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
                  setForm((f) => ({ ...f, mustChangePasswordOnFirstLogin: Boolean(v) }))
                }
              />
              <Label htmlFor="mustChangePwd">Require password change on first login</Label>
            </div>
            <div>
              <Label>{editingUser ? "New password (optional)" : "Password"}</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
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
            <DialogFooter>
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
