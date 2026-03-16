"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-store";
import {
  useUsers,
  useRolesList,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Search, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import type { UserApi } from "@/lib/api/endpoints/users";

function can(permissions: string[] | undefined, permission: string, role: string) {
  return role === "admin" || (permissions?.includes(permission) ?? false);
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [roleId, setRoleId] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserApi | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const canCreate = can(user?.permissions, "users:create", user?.role ?? "");
  const canUpdate = can(user?.permissions, "users:update", user?.role ?? "");
  const canDelete = can(user?.permissions, "users:delete", user?.role ?? "");

  const { data: users = [], isLoading } = useUsers({
    roleId: roleId && roleId !== "all" ? roleId : undefined,
    search: search || undefined,
  });
  const { data: roles = [] } = useRolesList();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const formDefaults = useMemo(
    () => ({
      email: editingUser?.email ?? "",
      fullName: editingUser?.fullName ?? "",
      phone: editingUser?.phone ?? "",
      roleId: editingUser?.roleId ?? (roles[0]?.id ?? ""),
      status: (editingUser?.status ?? "active") as "active" | "inactive",
      password: "",
    }),
    [editingUser, roles]
  );

  const [form, setForm] = useState(formDefaults);

  const resetForm = () => {
    setEditingUser(null);
    setForm({
      email: "",
      fullName: "",
      phone: "",
      roleId: roles[0]?.id ?? "",
      status: "active",
      password: "",
    });
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (user: UserApi) => {
    setEditingUser(user);
    setForm({
      email: user.email,
      fullName: user.fullName,
      phone: user.phone ?? "",
      roleId: user.roleId,
      status: user.status as "active" | "inactive",
      password: "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const err = await updateUser
        .mutateAsync({
          id: editingUser.id,
          body: {
            email: form.email,
            fullName: form.fullName,
            phone: form.phone || undefined,
            roleId: form.roleId,
            status: form.status,
            ...(form.password ? { password: form.password } : {}),
          },
        })
        .then(() => null)
        .catch((e) => e);
      if (err) return;
    } else {
      if (!form.password) return;
      const err = await createUser
        .mutateAsync({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          phone: form.phone || undefined,
          roleId: form.roleId,
        })
        .then(() => null)
        .catch((e) => e);
      if (err) return;
    }
    setModalOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteUser.mutateAsync(id).catch(() => {});
    setDeleteConfirmId(null);
  };

  const submitError =
    createUser.error instanceof ApiError
      ? createUser.error
      : updateUser.error instanceof ApiError
        ? updateUser.error
        : null;

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

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Name</th>
                    <th className="text-left py-3 px-2 font-medium">Email</th>
                    <th className="text-left py-3 px-2 font-medium">Phone</th>
                    <th className="text-left py-3 px-2 font-medium">Role</th>
                    <th className="text-left py-3 px-2 font-medium">Status</th>
                    {(canUpdate || canDelete) && (
                      <th className="text-right py-3 px-2 font-medium">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {users.map((rowUser) => (
                    <tr key={rowUser.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2 font-medium">{rowUser.fullName}</td>
                      <td className="py-3 px-2">{rowUser.email}</td>
                      <td className="py-3 px-2">{rowUser.phone ?? "—"}</td>
                      <td className="py-3 px-2 capitalize">
                        {typeof rowUser.role === "object" && rowUser.role?.name
                          ? rowUser.role.name
                          : rowUser.roleId}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={
                            rowUser.status === "active"
                              ? "text-green-600"
                              : "text-amber-600"
                          }
                        >
                          {rowUser.status}
                        </span>
                      </td>
                      {(canUpdate || canDelete) && (
                        <td className="py-3 px-2 text-right">
                          {canUpdate && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(rowUser)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setDeleteConfirmId(rowUser.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">No users found.</p>
              )}
            </div>
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
                placeholder="user@example.com"
                required
                disabled={!!editingUser}
              />
            </div>
            <div>
              <Label>Full name</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+84..."
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
            {editingUser && (
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
            )}
            <div>
              <Label>{editingUser ? "New password (leave blank to keep)" : "Password"}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={editingUser ? "Optional" : "Min 8 characters"}
                required={!editingUser}
                minLength={8}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={createUser.isPending || updateUser.isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createUser.isPending ||
                  updateUser.isPending ||
                  (!editingUser && !form.password)
                }
                aria-busy={createUser.isPending || updateUser.isPending}
              >
                {(createUser.isPending || updateUser.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {createUser.isPending ? "Creating…" : updateUser.isPending ? "Saving…" : editingUser ? "Save" : "Create"}
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
