"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { AdminFilter, AdminTable, AdminPagination } from "../components";
import {
  useLocations,
  useAreas,
  useCreateArea,
  useUpdateArea,
  useDeleteArea,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";
import { useUsers, useRolesList, useUpdateUser } from "@/lib/queries";
import { ApiError } from "@/lib/api";

const MEMBERSHIP_SCOPING = ["active", "grace", "pending_payment"] as const;
const AREAS_PAGE_SIZE = 10;

export default function AdminAreasPage() {
  const { user: adminUser } = useAuth();
  const isSuperUser = adminUser?.role === "super_user";

  const myVenueLocationIds = useMemo(() => {
    if (!isSuperUser || !adminUser?.memberships?.length) return [];
    return Array.from(
      new Set(
        adminUser.memberships
          .filter((m) =>
            MEMBERSHIP_SCOPING.includes(
              m.status as (typeof MEMBERSHIP_SCOPING)[number],
            ),
          )
          .map((m) => m.locationId),
      ),
    );
  }, [adminUser?.memberships, isSuperUser]);

  const [locationId, setLocationId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { data: locations = [] } = useLocations();

  const locationChildren = useMemo(() => {
    const children = locations.filter((l) => (l.kind ?? "child") === "child");
    if (!isSuperUser) return children;
    return children.filter((l) => myVenueLocationIds.includes(l.id));
  }, [locations, isSuperUser, myVenueLocationIds]);

  const areasLocationArg = isSuperUser
    ? myVenueLocationIds.length > 0
      ? myVenueLocationIds.length === 1
        ? myVenueLocationIds[0]
        : myVenueLocationIds
      : undefined
    : locationId !== "all"
      ? locationId
      : undefined;

  const areasQueryEnabled = !isSuperUser || myVenueLocationIds.length > 0;

  const { data: areas = [], isLoading } = useAreas(areasLocationArg, {
    enabled: areasQueryEnabled,
  });

  const myVenueKey = myVenueLocationIds.slice().sort().join(",");
  useEffect(() => {
    if (!isSuperUser) return;
    const ids = myVenueLocationIds;
    if (ids.length === 1) setLocationId(ids[0]);
    else setLocationId("all");
  }, [isSuperUser, myVenueKey]);

  const createArea = useCreateArea();
  const updateArea = useUpdateArea();
  const deleteArea = useDeleteArea();

  const { data: roles = [] } = useRolesList();
  const superUserRoleId = roles.find((r) => r.name === "super_user")?.id;
  const { data: superUsers = [] } = useUsers({
    roleId: superUserRoleId,
    enabled: Boolean(superUserRoleId && adminUser?.role === "super_admin"),
  });
  const updateUser = useUpdateUser();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    locationId: "",
    name: "",
    status: "active" as "active" | "inactive",
    visibility: "public" as "public" | "private",
  });
  const [staffUserId, setStaffUserId] = useState<string>("");
  const [staffAssignError, setStaffAssignError] = useState<string | null>(null);
  const [memberUserId, setMemberUserId] = useState<string>("");
  const [memberAssignError, setMemberAssignError] = useState<string | null>(null);

  const assignTargetLocationId = form.locationId;
  const canAssignMembers =
    !!assignTargetLocationId &&
    (adminUser?.role === "super_admin" || adminUser?.role === "super_user");

  const { data: assignableMembersRaw = [] } = useUsers({
    forAreaAssignment: true,
    enabled: open && canAssignMembers,
  });

  const assignableMembers = useMemo(
    () =>
      assignableMembersRaw.filter((u) => u.role?.name !== "super_admin"),
    [assignableMembersRaw],
  );

  const filtered = useMemo(
    () =>
      areas.filter(
        (l) =>
          !search.trim() ||
          l.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [areas, search],
  );

  const areasTableRows = useMemo(() => {
    if (isSuperUser && locationId !== "all") {
      return filtered.filter((a) => a.locationId === locationId);
    }
    return filtered;
  }, [isSuperUser, locationId, filtered]);

  const [areasPage, setAreasPage] = useState(1);
  useEffect(() => {
    setAreasPage(1);
  }, [search, locationId, isSuperUser, myVenueKey]);

  const paginatedAreas = useMemo(
    () =>
      areasTableRows.slice(
        (areasPage - 1) * AREAS_PAGE_SIZE,
        areasPage * AREAS_PAGE_SIZE,
      ),
    [areasTableRows, areasPage],
  );

  const venueLabel =
    isSuperUser && myVenueLocationIds.length === 1
      ? locations.find((l) => l.id === myVenueLocationIds[0])?.name ?? "your venue"
      : null;

  const openCreate = () => {
    setEditingId(null);
    const defaultLoc =
      isSuperUser && myVenueLocationIds.length === 1
        ? myVenueLocationIds[0]
        : locationId !== "all"
          ? locationId
          : locationChildren[0]?.id ?? "";
    setForm({
      locationId: defaultLoc,
      name: "",
      status: "active",
      visibility: "public",
    });
    setStaffUserId("");
    setStaffAssignError(null);
    setMemberUserId("");
    setMemberAssignError(null);
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const row = areas.find((x) => x.id === id);
    if (!row) return;
    setEditingId(id);
    setForm({
      locationId: row.locationId,
      name: row.name,
      status: (row.status as "active" | "inactive") ?? "active",
      visibility: (row.visibility as "public" | "private") ?? "public",
    });
    setStaffUserId("");
    setStaffAssignError(null);
    setMemberUserId("");
    setMemberAssignError(null);
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      locationId: form.locationId,
      name: form.name.trim(),
      status: form.status,
      visibility: form.visibility,
    };
    if (editingId) {
      await updateArea.mutateAsync({ id: editingId, body }).catch(() => {});
    } else {
      await createArea.mutateAsync(body).catch(() => {});
    }
    setOpen(false);
  };

  const editingArea = editingId ? areas.find((a) => a.id === editingId) : null;

  const handleAssignStaff = async () => {
    const locId = editingArea?.locationId;
    if (!staffUserId || !locId) return;
    setStaffAssignError(null);
    const err = await updateUser
      .mutateAsync({
        id: staffUserId,
        body: { membershipLocationId: locId },
      })
      .then(() => null)
      .catch((e) => e);
    if (err instanceof ApiError) {
      const msg = err.body?.message;
      setStaffAssignError(
        Array.isArray(msg) ? msg.join(", ") : (msg ?? err.message),
      );
    } else if (err) {
      setStaffAssignError("Could not assign membership.");
    } else {
      setStaffUserId("");
    }
  };

  const handleAssignMember = async () => {
    if (!memberUserId || !assignTargetLocationId) return;
    setMemberAssignError(null);
    const err = await updateUser
      .mutateAsync({
        id: memberUserId,
        body: { membershipLocationId: assignTargetLocationId },
      })
      .then(() => null)
      .catch((e) => e);
    if (err instanceof ApiError) {
      const msg = err.body?.message;
      setMemberAssignError(
        Array.isArray(msg) ? msg.join(", ") : (msg ?? err.message),
      );
    } else if (err) {
      setMemberAssignError("Could not assign membership.");
    } else {
      setMemberUserId("");
    }
  };

  if (isSuperUser && myVenueLocationIds.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Areas</h1>
        <p className="text-muted-foreground max-w-xl">
          Your account is not linked to a venue yet. Ask a super administrator to assign you to a
          location on the{" "}
          <Link href="/admin/locations" className="text-primary underline font-medium">
            Locations
          </Link>{" "}
          page before you can manage areas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Areas</h1>
          {venueLabel && (
            <p className="text-sm text-muted-foreground mt-1">
              Showing areas for <strong>{venueLabel}</strong> only.
            </p>
          )}
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add Area
        </Button>
      </div>

      <AdminFilter
        title="Filters"
        description={
          isSuperUser
            ? "Search within your venue(s). Location list is limited to venues you operate."
            : "Filter by location and search area name"
        }
        searchPlaceholder="Search areas..."
        searchValue={search}
        onSearchChange={setSearch}
      >
        {!isSuperUser && (
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locationChildren.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {isSuperUser && myVenueLocationIds.length > 1 && (
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All my venues" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All my venues</SelectItem>
              {locationChildren.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </AdminFilter>

      <Card>
        <CardContent className="pt-6">
          <AdminTable
            data={paginatedAreas}
            keyExtractor={(l) => l.id}
            emptyMessage="No areas found."
            isLoading={isLoading}
            loadingNode={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
            columns={[
              { key: "name", label: "Name", render: (l) => <span className="font-medium">{l.name}</span> },
              {
                key: "location",
                label: "Location",
                render: (a) =>
                  locations.find((l) => l.id === a.locationId)?.name ?? "—",
              },
              { key: "visibility", label: "Visibility", render: (l) => l.visibility ?? "public" },
              { key: "status", label: "Status", render: (l) => l.status ?? "active" },
              {
                key: "actions",
                label: "Actions",
                className: "text-right",
                headClassName: "text-right",
                render: (l) => (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(l.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteArea.mutate(l.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ),
              },
            ]}
          />
          {!isLoading && areasTableRows.length > 0 && (
            <AdminPagination
              page={areasPage}
              pageSize={AREAS_PAGE_SIZE}
              total={areasTableRows.length}
              onPageChange={setAreasPage}
              className="mt-4 border-t pt-4"
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Area" : "Create Area"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="rounded-lg border border-sky-200/80 bg-sky-50/90 p-3 text-sm text-slate-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-slate-300">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                Area vs people
              </p>
              <p className="mt-1.5 leading-relaxed">
                This form configures the area record (location, name, visibility, status).
                <strong> Membership</strong> is stored per <strong>location</strong>. Use{" "}
                <strong>Add member to this location</strong> below so people who registered
                without a venue (or who are not yet on this location) get access to{" "}
                <em>all areas</em> under the selected location.
              </p>
              <p className="mt-2 leading-relaxed">
                Full user CRUD and other roles:{" "}
                <Link href="/admin/users" className="font-medium text-primary underline">
                  Users
                </Link>
                .
              </p>
              {adminUser?.role === "super_admin" && (
                <p className="mt-2 leading-relaxed">
                  <strong>super_user</strong> operators:{" "}
                  <Link href="/admin/locations" className="font-medium text-primary underline">
                    Locations
                  </Link>{" "}
                  or the staff section when editing.
                </p>
              )}
            </div>
            <div>
              <Label>Location</Label>
              <Select
                value={form.locationId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, locationId: v }))
                }
                disabled={isSuperUser && myVenueLocationIds.length === 1}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locationChildren.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">public</SelectItem>
                  <SelectItem value="private">private</SelectItem>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="inactive">inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {canAssignMembers && (
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30 p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">Add member to this location</p>
                <p className="text-sm text-muted-foreground">
                  Pick any user you can manage. This saves membership at the <strong>location</strong>{" "}
                  for this area — including people who registered online without a membership yet.
                  You do not need an existing membership row to add them here.
                </p>
                <div>
                  <Label>User</Label>
                  <Select
                    value={memberUserId || "__none__"}
                    onValueChange={(v) =>
                      setMemberUserId(v === "__none__" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {assignableMembers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.email} ({u.firstName ?? ""} {u.lastName ?? ""})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {memberAssignError && (
                  <p className="text-sm text-destructive">{memberAssignError}</p>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={handleAssignMember}
                  disabled={!memberUserId || updateUser.isPending}
                >
                  {updateUser.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Assign membership"
                  )}
                </Button>
              </div>
            )}

            {editingId && adminUser?.role === "super_admin" && editingArea && (
              <div className="rounded-xl border border-muted bg-muted/30 p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">Venue staff (super_user)</p>
                <p className="text-sm text-muted-foreground">
                  Assigns a <strong>super_user</strong> operator to this area&apos;s location.
                </p>
                <div>
                  <Label>Assign super_user to this location</Label>
                  <Select
                    value={staffUserId || "__none__"}
                    onValueChange={(v) =>
                      setStaffUserId(v === "__none__" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user (super_user)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {superUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.email} ({u.firstName ?? ""} {u.lastName ?? ""})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {staffAssignError && (
                  <p className="text-sm text-destructive">{staffAssignError}</p>
                )}
                <button
                  type="button"
                  className="text-sm text-primary underline"
                  onClick={handleAssignStaff}
                  disabled={!staffUserId || updateUser.isPending}
                >
                  Save staff membership
                </button>
                <p className="text-xs text-muted-foreground">
                  Or use{" "}
                  <Link href="/admin/locations" className="underline font-medium">
                    Locations
                  </Link>
                  .
                </p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingId ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
