"use client";

import { useMemo, useState } from "react";
import { useCourts, useCreateCourt, useDeleteCourt, useSports, useLocations } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { AdminFilter, AdminTable } from "../components";
import type { Court } from "@/types";

export default function AdminCourtManagementPage() {
  const [search, setSearch] = useState("");
  const [locationId, setLocationId] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [sportCode, setSportCode] = useState("tennis");

  const { data: locations = [] } = useLocations();
  const { data: sports = [] } = useSports();
  const { data: courts = [] } = useCourts({
    locationId: locationId !== "all" ? locationId : undefined,
    search: search || undefined,
  });
  const createCourt = useCreateCourt();
  const deleteCourt = useDeleteCourt();

  const filtered = useMemo(
    () =>
      courts.filter(
        (c) =>
          !search.trim() ||
          c.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [courts, search],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Court Management</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Court
        </Button>
      </div>

      <AdminFilter
        title="Filters"
        description="Manage court master data (name + sport) by location child."
        searchPlaceholder="Search by court name..."
        searchValue={search}
        onSearchChange={setSearch}
      >
        <Select value={locationId} onValueChange={setLocationId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All location child" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All location child</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminFilter>

      <AdminTable<Court>
        data={filtered}
        keyExtractor={(c) => c.id}
        emptyMessage="No courts."
        columns={[
          { key: "name", label: "Court Name", render: (c) => <span className="font-medium">{c.name}</span> },
          { key: "sport", label: "Sport", render: (c) => c.sport },
          { key: "locationName", label: "Location Child", render: (c) => c.locationName ?? "—" },
          {
            key: "actions",
            label: "Actions",
            className: "text-right",
            headClassName: "text-right",
            render: (c) => (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => deleteCourt.mutate(c.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ),
          } as {
            key: string;
            label: string;
            className?: string;
            headClassName?: string;
            render: (row: Court) => React.ReactNode;
          },
        ]}
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Court</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Location Child</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location child" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Court Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>Sport</Label>
              <Select value={sportCode} onValueChange={setSportCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sports.map((s) => (
                    <SelectItem key={s.id} value={s.code}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (!locationId || locationId === "all" || !name.trim()) return;
                await createCourt.mutateAsync({
                  locationId,
                  name: name.trim(),
                  sport: sportCode,
                });
                setName("");
                setModalOpen(false);
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
