"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-store";
import { useCourts, useBranches, useCreateCourt, useUpdateCourt, useDeleteCourt } from "@/lib/queries";
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
import { formatCurrency } from "@/lib/format";
import { Search, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import type { Court } from "@/types";

function can(permissions: string[] | undefined, permission: string, role: string) {
  return role === "admin" || (permissions?.includes(permission) ?? false);
}

export default function AdminCourtsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const canCreate = can(user?.permissions, "courts:create", user?.role ?? "");
  const canUpdate = can(user?.permissions, "courts:update", user?.role ?? "");
  const canDelete = can(user?.permissions, "courts:delete", user?.role ?? "");

  const { data: courts = [], isLoading } = useCourts({
    branchId: branchId && branchId !== "all" ? branchId : undefined,
    status: status && status !== "all" ? status : undefined,
    search: search || undefined,
  });
  const { data: branches = [] } = useBranches();
  const createCourt = useCreateCourt();
  const updateCourt = useUpdateCourt();
  const deleteCourt = useDeleteCourt();

  const formDefaults = useMemo(
    () => ({
      branchId: editingCourt?.branchId ?? (branches[0]?.id ?? ""),
      name: editingCourt?.name ?? "",
      type: (editingCourt?.type ?? "outdoor") as "indoor" | "outdoor",
      pricePerHour: editingCourt?.pricePerHour ?? 0,
      description: editingCourt?.description ?? "",
      status: (editingCourt?.status ?? "active") as "active" | "maintenance",
    }),
    [editingCourt, branches]
  );

  const [form, setForm] = useState(formDefaults);

  const resetForm = () => {
    setEditingCourt(null);
    setForm({
      branchId: branches[0]?.id ?? "",
      name: "",
      type: "outdoor",
      pricePerHour: 0,
      description: "",
      status: "active",
    });
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (court: Court) => {
    setEditingCourt(court);
    setForm({
      branchId: court.branchId,
      name: court.name,
      type: court.type,
      pricePerHour: court.pricePerHour,
      description: court.description ?? "",
      status: court.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = editingCourt
      ? await updateCourt
          .mutateAsync({
            id: editingCourt.id,
            body: {
              branchId: form.branchId,
              name: form.name,
              type: form.type,
              pricePerHour: form.pricePerHour,
              description: form.description || undefined,
              status: form.status,
            },
          })
          .then(() => null)
          .catch((e) => e)
      : await createCourt
          .mutateAsync({
            branchId: form.branchId,
            name: form.name,
            type: form.type,
            pricePerHour: form.pricePerHour,
            description: form.description || undefined,
            status: form.status,
          })
          .then(() => null)
          .catch((e) => e);

    if (err) return;
    setModalOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteCourt.mutateAsync(id).catch(() => {});
    setDeleteConfirmId(null);
  };

  const submitError =
    createCourt.error instanceof ApiError
      ? createCourt.error
      : updateCourt.error instanceof ApiError
        ? updateCourt.error
        : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Courts</h1>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Court
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
                  placeholder="Search by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
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
                    <th className="text-left py-3 px-2 font-medium">Branch</th>
                    <th className="text-left py-3 px-2 font-medium">Type</th>
                    <th className="text-left py-3 px-2 font-medium">Price/hour</th>
                    <th className="text-left py-3 px-2 font-medium">Status</th>
                    {(canUpdate || canDelete) && (
                      <th className="text-right py-3 px-2 font-medium">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {courts.map((court) => (
                    <tr key={court.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2 font-medium">{court.name}</td>
                      <td className="py-3 px-2">
                        {branches.find((b) => b.id === court.branchId)?.name ?? court.branchId}
                      </td>
                      <td className="py-3 px-2 capitalize">{court.type}</td>
                      <td className="py-3 px-2">{formatCurrency(court.pricePerHour)}</td>
                      <td className="py-3 px-2">
                        <span
                          className={
                            court.status === "active"
                              ? "text-green-600"
                              : "text-amber-600"
                          }
                        >
                          {court.status}
                        </span>
                      </td>
                      {(canUpdate || canDelete) && (
                        <td className="py-3 px-2 text-right">
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(court)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setDeleteConfirmId(court.id)}
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
              {courts.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">No courts found.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCourt ? "Edit Court" : "Create Court"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && (
              <p className="text-sm text-destructive">
                {submitError.body?.message ?? submitError.message}
              </p>
            )}
            <div>
              <Label>Branch</Label>
              <Select
                value={form.branchId}
                onValueChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
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
                placeholder="Court 1"
                required
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, type: v as "indoor" | "outdoor" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="indoor">Indoor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Price per hour</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.pricePerHour || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    pricePerHour: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    status: v as "active" | "maintenance",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={createCourt.isPending || updateCourt.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCourt.isPending || updateCourt.isPending} aria-busy={createCourt.isPending || updateCourt.isPending}>
                {(createCourt.isPending || updateCourt.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {createCourt.isPending ? "Creating…" : updateCourt.isPending ? "Saving…" : editingCourt ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete court</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this court? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteCourt.isPending}
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              aria-busy={deleteCourt.isPending}
            >
              {deleteCourt.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteCourt.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
