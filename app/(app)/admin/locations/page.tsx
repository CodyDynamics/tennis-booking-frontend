"use client";

import { useMemo, useState } from "react";
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
import { AdminFilter, AdminTable } from "../components";
import {
  useBranches,
  useLocations,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
} from "@/lib/queries";

export default function AdminLocationsPage() {
  const [branchId, setBranchId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { data: branches = [] } = useBranches();
  const { data: locations = [], isLoading } = useLocations(
    branchId !== "all" ? branchId : undefined,
  );
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    branchId: "",
    name: "",
    address: "",
    timezone: "America/Chicago",
    visibility: "public" as "public" | "private",
    status: "active" as "active" | "inactive",
  });

  const filtered = useMemo(
    () =>
      locations.filter(
        (l) =>
          !search.trim() ||
          l.name.toLowerCase().includes(search.toLowerCase()) ||
          (l.address ?? "").toLowerCase().includes(search.toLowerCase()),
      ),
    [locations, search],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm({
      branchId: branchId !== "all" ? branchId : branches[0]?.id ?? "",
      name: "",
      address: "",
      timezone: "America/Chicago",
      visibility: "public",
      status: "active",
    });
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const row = locations.find((x) => x.id === id);
    if (!row) return;
    setEditingId(id);
    setForm({
      branchId: row.branchId,
      name: row.name,
      address: row.address ?? "",
      timezone: row.timezone ?? "America/Chicago",
      visibility: (row.visibility as "public" | "private") ?? "public",
      status: (row.status as "active" | "inactive") ?? "active",
    });
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      branchId: form.branchId,
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      timezone: form.timezone.trim() || undefined,
      visibility: form.visibility,
      status: form.status,
    };
    if (editingId) {
      await updateLocation.mutateAsync({ id: editingId, body }).catch(() => {});
    } else {
      await createLocation.mutateAsync(body).catch(() => {});
    }
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add Location
        </Button>
      </div>

      <AdminFilter
        title="Filters"
        description="Filter by branch and search by name/address"
        searchPlaceholder="Search locations..."
        searchValue={search}
        onSearchChange={setSearch}
      >
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
      </AdminFilter>

      <Card>
        <CardContent className="pt-6">
          <AdminTable
            data={filtered}
            keyExtractor={(l) => l.id}
            emptyMessage="No locations found."
            isLoading={isLoading}
            loadingNode={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
            columns={[
              { key: "name", label: "Name", render: (l) => <span className="font-medium">{l.name}</span> },
              { key: "address", label: "Address", render: (l) => l.address ?? "—" },
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
                      onClick={() => deleteLocation.mutate(l.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Location" : "Create Location"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>Branch</Label>
              <Select
                value={form.branchId}
                onValueChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
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
            <div className="grid grid-cols-2 gap-4">
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
            </div>
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

