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
  useAreas,
  useCreateArea,
  useUpdateArea,
  useDeleteArea,
} from "@/lib/queries";

export default function AdminLocationsPage() {
  const [branchId, setBranchId] = useState<string>("all");
  const [locationId, setLocationId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { data: branches = [] } = useBranches();
  const { data: locations = [] } = useLocations(
    branchId !== "all" ? branchId : undefined,
  );
  const locationChildren = useMemo(
    () => locations.filter((l) => (l.kind ?? "child") === "child"),
    [locations],
  );
  const { data: areas = [], isLoading } = useAreas(
    locationId !== "all" ? locationId : undefined,
  );
  const createArea = useCreateArea();
  const updateArea = useUpdateArea();
  const deleteArea = useDeleteArea();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    locationId: "",
    name: "",
    status: "active" as "active" | "inactive",
    visibility: "public" as "public" | "private",
  });

  const filtered = useMemo(
    () =>
      areas.filter(
        (l) =>
          !search.trim() ||
          l.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [areas, search],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm({
      locationId:
        locationId !== "all"
          ? locationId
          : locationChildren[0]?.id ?? "",
      name: "",
      status: "active",
      visibility: "public",
    });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Areas</h1>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add Area
        </Button>
      </div>

      <AdminFilter
        title="Filters"
        description="Filter by branch/location child and search area name"
        searchPlaceholder="Search areas..."
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
        <Select value={locationId} onValueChange={setLocationId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All location child" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All location child</SelectItem>
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
          <AdminTable
            data={filtered}
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
                label: "Location Child",
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
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Area" : "Create Area"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>Location Child</Label>
              <Select
                value={form.locationId}
                onValueChange={(v) => setForm((f) => ({ ...f, locationId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location child" />
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

