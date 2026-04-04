"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-store";
import {
  useUsers,
  useLocations,
  useAreas,
  useBookableLocations,
  useCreateMembershipPlaceholder,
  useRolesList,
  useAdminUserDetail,
  useUpdateUser,
} from "@/lib/queries";
import { AdminFilter, AdminTable, AdminPagination } from "../components";
import type { UserApi, UpdateUserBody } from "@/lib/api/endpoints/users";
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
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil, Plus } from "lucide-react";
import { ApiError } from "@/lib/api";
import { hasAdminPermission } from "@/lib/admin-rbac";
import { useAdmin } from "../admin-context";
import { UsPhoneField } from "@/components/ui/us-phone-field";
import { formatPhoneDisplay } from "@/lib/us-phone";
import { titleCaseFilterLabel } from "@/lib/format";
import { useDebouncedSearchValue } from "@/lib/hooks/use-debounced-search-value";

const PAGE_SIZE = 10;

export default function AdminUserMembershipPage() {
  const { user } = useAuth();
  const { locationId: adminLocationId } = useAdmin();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedSearchValue(search);
  const [roleId, setRoleId] = useState<string>("all");
  const [filterAreaId, setFilterAreaId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserApi | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const membershipSyncedRef = useRef<string | null>(null);

  const canCreate = hasAdminPermission(user?.permissions, "users:create", user?.role);
  const canUpdate = hasAdminPermission(user?.permissions, "users:update", user?.role);

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

  /** When sidebar filters by one location, list rows are scoped to that venue; used as fallback label. */
  const listScopedLocationId =
    showScopeFilters && filterAreaId === "all" && adminLocationId !== "all"
      ? adminLocationId
      : undefined;

  useEffect(() => {
    setFilterAreaId("all");
  }, [adminLocationId]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleId, adminLocationId, filterAreaId]);

  const [sortState, setSortState] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  useEffect(() => {
    setPage(1);
  }, [sortState]);

  const { data: users = [], isLoading } = useUsers({
    accountType: "membership",
    roleId: roleId && roleId !== "all" ? roleId : undefined,
    search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
    membershipAtLocationId:
      showScopeFilters && filterAreaId === "all" && adminLocationId !== "all"
        ? adminLocationId
        : undefined,
    areaId: showScopeFilters && filterAreaId !== "all" ? filterAreaId : undefined,
    includeMemberships: true,
  });

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

  function cmpLocale(a: string, b: string, dir: "asc" | "desc"): number {
    const x = a.localeCompare(b, undefined, { sensitivity: "base" });
    return dir === "asc" ? x : -x;
  }

  const sortedUsers = useMemo(() => {
    if (!sortState) return users;
    const { key, dir } = sortState;
    return [...users].sort((u1, u2) => {
      switch (key) {
        case "lastName":
          return cmpLocale(u1.lastName ?? "", u2.lastName ?? "", dir);
        case "email":
          return cmpLocale(u1.email, u2.email, dir);
        case "location":
          return cmpLocale(locationSortLabel(u1), locationSortLabel(u2), dir);
        case "joinDate":
          return cmpLocale(
            u1.memberships?.[0]?.joinDate ?? "",
            u2.memberships?.[0]?.joinDate ?? "",
            dir,
          );
        case "endDate":
          return cmpLocale(
            u1.memberships?.[0]?.endDate ?? "",
            u2.memberships?.[0]?.endDate ?? "",
            dir,
          );
        case "status":
          return cmpLocale(u1.status, u2.status, dir);
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

  const createMembership = useCreateMembershipPlaceholder();
  const updateUser = useUpdateUser();
  const {
    data: editUserDetail,
    isLoading: editUserDetailLoading,
    isError: editUserDetailError,
  } = useAdminUserDetail(editingUser?.id, editModalOpen && !!editingUser);

  const editFormReady =
    !!editingUser &&
    !!editUserDetail &&
    editUserDetail.id === editingUser.id &&
    !editUserDetailLoading;

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    homeAddress: "",
    membershipLocationId: "__none__" as string,
    accountType: "membership" as "membership" | "normal",
    membershipJoinDate: "",
    membershipEndDate: "",
  });

  useEffect(() => {
    if (!editModalOpen) {
      membershipSyncedRef.current = null;
    }
  }, [editModalOpen]);

  useEffect(() => {
    if (!editingUser || !editModalOpen || !editUserDetail) return;
    const m0 = editUserDetail.memberships?.[0];
    const locId = m0?.locationId;
    const syncKey = `${editingUser.id}-${locId ?? "none"}`;
    if (membershipSyncedRef.current === syncKey) return;
    membershipSyncedRef.current = syncKey;
    const allowed = new Set(locationOptionsForCreate.map((l) => l.id));
    setEditForm((f) => ({
      ...f,
      membershipLocationId:
        locId && allowed.has(locId) ? locId : "__none__",
      accountType:
        editingUser.accountType === "membership" ? "membership" : "normal",
      membershipJoinDate: m0?.joinDate ?? "",
      membershipEndDate: m0?.endDate ?? "",
    }));
  }, [editingUser, editModalOpen, editUserDetail, locationOptionsForCreate]);

  const openEdit = (u: UserApi) => {
    membershipSyncedRef.current = null;
    setEditingUser(u);
    setEditError(null);
    setEditForm({
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      phone: u.phone ?? "",
      homeAddress: u.homeAddress ?? "",
      membershipLocationId: "__none__",
      accountType: u.accountType === "membership" ? "membership" : "normal",
      membershipJoinDate: u.memberships?.[0]?.joinDate ?? "",
      membershipEndDate: u.memberships?.[0]?.endDate ?? "",
    });
    setEditModalOpen(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editFormReady) return;
    setEditError(null);

    if (editForm.membershipLocationId === "__none__" && user?.role === "super_user") {
      setEditError("Venue staff cannot remove all venue memberships. Ask an administrator.");
      return;
    }

    const fullName = `${editForm.firstName} ${editForm.lastName}`.trim();
    const body: UpdateUserBody = {
      fullName,
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      phone: editForm.phone,
      homeAddress: editForm.homeAddress || undefined,
      membershipLocationId:
        editForm.membershipLocationId === "__none__"
          ? null
          : editForm.membershipLocationId,
      membershipJoinDate: editForm.membershipJoinDate.trim()
        ? editForm.membershipJoinDate.trim()
        : null,
      membershipEndDate: editForm.membershipEndDate.trim()
        ? editForm.membershipEndDate.trim()
        : null,
    };

    if (
      editingUser.accountType !== "system" &&
      (editingUser.accountType === "membership" || editingUser.accountType === "normal") &&
      editForm.accountType !== editingUser.accountType
    ) {
      body.accountType = editForm.accountType;
    }

    try {
      await updateUser.mutateAsync({ id: editingUser.id, body });
      setEditModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? String(
              Array.isArray(err.body?.message)
                ? err.body?.message.join(", ")
                : err.body?.message ?? err.message,
            )
          : err instanceof Error
            ? err.message
            : "Update failed";
      setEditError(msg);
    }
  };

  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    homeAddress: "",
    locationId: "__none__",
    membershipJoinDate: "",
    membershipEndDate: "",
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
      membershipJoinDate: "",
      membershipEndDate: "",
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
        membershipJoinDate: form.membershipJoinDate.trim() || undefined,
        membershipEndDate: form.membershipEndDate.trim() || undefined,
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
        <h1 className="text-3xl font-bold tracking-tight">Memberships</h1>
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
        Only <strong>membership</strong> account type (pre-approved placeholders). Use{" "}
        <strong>Users</strong> for normal and system accounts. Location or area filters narrow to
        placeholders with venue membership at the selected place.
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
                {titleCaseFilterLabel(r.name)}
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
                ? "No membership-type users with venue membership here match your filters."
                : "No membership placeholders match your filters."
            }
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
                label: "Last Name",
                sortable: true,
                render: (u) => u.lastName ?? "—",
              },
              { key: "firstName", label: "First Name", render: (u) => u.firstName ?? "—" },
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
                key: "joinDate",
                label: "Join Date",
                sortable: true,
                render: (u) => u.memberships?.[0]?.joinDate ?? "—",
              },
              {
                key: "endDate",
                label: "End Date",
                sortable: true,
                render: (u) => u.memberships?.[0]?.endDate ?? "—",
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
                  <span className="capitalize text-muted-foreground">{u.accountType ?? "—"}</span>
                ),
              },
              {
                key: "role",
                label: "Role",
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
              ...(canUpdate
                ? [
                    {
                      key: "actions",
                      label: "Actions",
                      headClassName: "text-right w-[72px]",
                      className: "text-right",
                      render: (row: UserApi) => (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${row.email}`}
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ),
                    } as const,
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
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-4 overflow-hidden">
          <DialogHeader className="shrink-0 pr-10">
            <DialogTitle>Add membership</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={submitCreate}
            className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
          >
            <div className="scrollbar-app min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
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
            <div className="space-y-2">
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
              <div className="min-w-0 space-y-2">
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
              <div className="min-w-0 space-y-2">
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
            <div className="space-y-2">
              <Label>Phone</Label>
              <p className="text-xs text-muted-foreground">
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
            <div className="space-y-2">
              <Label>Address (optional)</Label>
              <Input
                value={form.homeAddress}
                onChange={(e) => {
                  setFormError(null);
                  setForm((f) => ({ ...f, homeAddress: e.target.value }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Location (optional)</Label>
              <p className="text-muted-foreground text-xs">
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
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0 space-y-2">
                <Label>Join date (optional)</Label>
                <DatePickerField
                  value={form.membershipJoinDate}
                  allowClear
                  className="w-full"
                  placeholder="Join date"
                  onChange={(v) => {
                    setFormError(null);
                    setForm((f) => ({ ...f, membershipJoinDate: v }));
                  }}
                />
              </div>
              <div className="min-w-0 space-y-2">
                <Label>End date (optional)</Label>
                <DatePickerField
                  value={form.membershipEndDate}
                  allowClear
                  className="w-full"
                  placeholder="End date"
                  onChange={(v) => {
                    setFormError(null);
                    setForm((f) => ({ ...f, membershipEndDate: v }));
                  }}
                />
              </div>
            </div>
            </div>
            <DialogFooter className="shrink-0 border-t border-border/50 pt-4">
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

      <Dialog
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setEditingUser(null);
            setEditError(null);
            updateUser.reset();
            membershipSyncedRef.current = null;
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-4 overflow-hidden">
          <DialogHeader className="shrink-0 pr-10">
            <DialogTitle>Edit user / membership</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form
              onSubmit={submitEdit}
              className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
            >
              <div className="scrollbar-app min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {editUserDetailError && (
                <p className="text-sm text-destructive">Could not load user details. Try again.</p>
              )}
              {editError && <p className="text-sm text-destructive">{editError}</p>}
              {!editFormReady && !editUserDetailError && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading membership…
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Email: <span className="font-medium text-foreground">{editingUser.email}</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0 space-y-2">
                  <Label>First name</Label>
                  <Input
                    value={editForm.firstName}
                    onChange={(e) => {
                      setEditError(null);
                      setEditForm((f) => ({ ...f, firstName: e.target.value }));
                    }}
                    required
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label>Last name</Label>
                  <Input
                    value={editForm.lastName}
                    onChange={(e) => {
                      setEditError(null);
                      setEditForm((f) => ({ ...f, lastName: e.target.value }));
                    }}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <UsPhoneField
                  variant="compact"
                  value={editForm.phone}
                  onChange={(value) => {
                    setEditError(null);
                    setEditForm((f) => ({ ...f, phone: value }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Address (optional)</Label>
                <Input
                  value={editForm.homeAddress}
                  onChange={(e) => {
                    setEditError(null);
                    setEditForm((f) => ({ ...f, homeAddress: e.target.value }));
                  }}
                />
              </div>
              {(editingUser.accountType === "membership" ||
                editingUser.accountType === "normal") && (
                <div className="space-y-2">
                  <Label>Account type</Label>
                  <p className="text-xs text-muted-foreground">
                    Set to <strong>Normal</strong> after they register as an app user, or keep{" "}
                    <strong>Pre-approved</strong> for placeholders only.
                  </p>
                  <Select
                    value={editForm.accountType}
                    onValueChange={(v) => {
                      setEditError(null);
                      setEditForm((f) => ({
                        ...f,
                        accountType: v as "membership" | "normal",
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="membership">Pre-approved (membership)</SelectItem>
                      <SelectItem value="normal">Normal (app user)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Venue membership</Label>
                <p className="text-xs text-muted-foreground">
                  Choose <strong>None</strong> to remove all venue memberships for this user.
                  {user?.role === "super_user" && (
                    <span className="block mt-1">
                      Venue staff cannot clear all memberships; pick another location or ask an admin.
                    </span>
                  )}
                </p>
                <Select
                  value={editForm.membershipLocationId}
                  onValueChange={(v) => {
                    setEditError(null);
                    setEditForm((f) => ({ ...f, membershipLocationId: v }));
                  }}
                  disabled={!editFormReady}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Loading…" />
                  </SelectTrigger>
                  <SelectContent>
                    {user?.role !== "super_user" && (
                      <SelectItem value="__none__">None (remove all)</SelectItem>
                    )}
                    {locationOptionsForCreate.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0 space-y-2">
                  <Label>Join date (optional)</Label>
                  <DatePickerField
                    value={editForm.membershipJoinDate}
                    allowClear
                    className="w-full"
                    placeholder="Join date"
                    disabled={!editFormReady}
                    onChange={(v) => {
                      setEditError(null);
                      setEditForm((f) => ({ ...f, membershipJoinDate: v }));
                    }}
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label>End date (optional)</Label>
                  <DatePickerField
                    value={editForm.membershipEndDate}
                    allowClear
                    className="w-full"
                    placeholder="End date"
                    disabled={!editFormReady}
                    onChange={(v) => {
                      setEditError(null);
                      setEditForm((f) => ({ ...f, membershipEndDate: v }));
                    }}
                  />
                </div>
              </div>
              </div>
              <DialogFooter className="shrink-0 border-t border-border/50 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!editFormReady || updateUser.isPending || !!editUserDetailError}
                >
                  {updateUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {updateUser.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
